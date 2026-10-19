import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';
const router = Router();
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/**
 * GET /api/sessions/today
 */
router.get('/today', authenticate, (req, res) => {
    try {
        const user = req.user;
        const now = new Date();
        const todayName = dayNames[now.getDay()];
        const todayDateStr = now.toISOString().split('T')[0];
        let query = `
      SELECT tt.*, s.name as subject_name, s.code as subject_code, s.color as subject_color,
             s.target_finish_date,
             u.id as faculty_id, u.name as faculty_name, u.email as faculty_email,
             b.id as batch_id, b.name as batch_name,
             c.id as campus_id, c.name as campus_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN users u ON tt.faculty_id = u.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE tt.day_of_week = ?
    `;
        const params = [todayName];
        const userRole = (user?.role || '').toUpperCase();
        if (userRole === 'FACULTY') {
            query += ` AND tt.faculty_id = ?`;
            params.push(user?.id);
        }
        else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
            query += ` AND c.id = ?`;
            params.push(user.campusId);
        }
        query += ` ORDER BY tt.start_time ASC`;
        const slots = db.prepare(query).all(...params);
        const sessions = slots.map((slot) => {
            const existingLog = db.prepare(`
        SELECT * FROM daily_logs WHERE timetable_id = ? AND session_date = ?
      `).get(slot.id, todayDateStr);
            const durationHours = CalculationEngine.timeToHours(slot.end_time) - CalculationEngine.timeToHours(slot.start_time);
            const topic = db.prepare(`
        SELECT * FROM topics 
        WHERE subject_id = ? AND status != 'COMPLETED' AND status != 'SKIPPED'
        ORDER BY sequence ASC LIMIT 1
      `).get(slot.subject_id);
            const expectedTopic = topic
                ? {
                    id: topic.id,
                    unit: topic.unit_name,
                    sequence: topic.sequence,
                    name: topic.topic_name,
                    plannedHours: topic.planned_hours,
                    status: topic.status,
                    completionPercentage: topic.percentage_complete,
                    coveredHours: CalculationEngine.calculateTopicCoveredHours({
                        status: topic.status,
                        planned_hours: topic.planned_hours,
                        percentage_complete: topic.percentage_complete,
                    }),
                    plannedDate: topic.planned_date,
                    examScopes: topic.exam_scope_flag,
                }
                : undefined;
            return {
                id: slot.id,
                scheduledSessionId: slot.id,
                timetableId: slot.id,
                subjectId: slot.subject_id,
                sessionDate: todayDateStr,
                startTime: slot.start_time,
                endTime: slot.end_time,
                durationHours: Math.round(durationHours * 100) / 100,
                room: slot.room || 'Room 101',
                status: existingLog ? existingLog.status.toUpperCase() : 'SCHEDULED',
                hasLog: !!existingLog,
                expectedTopic,
                subject: {
                    id: slot.subject_id,
                    code: slot.subject_code,
                    name: slot.subject_name,
                    color: slot.subject_color,
                    targetFinishDate: slot.target_finish_date,
                },
                faculty: {
                    id: slot.faculty_id,
                    name: slot.faculty_name,
                    email: slot.faculty_email,
                },
                batch: {
                    id: slot.batch_id,
                    name: slot.batch_name,
                },
                campus: {
                    id: slot.campus_id,
                    name: slot.campus_name,
                },
                sessionLog: existingLog
                    ? {
                        id: existingLog.id,
                        status: existingLog.status,
                        actualHours: durationHours,
                        percentageComplete: existingLog.percentage_complete,
                        topicsCovered: existingLog.topics_covered,
                        whatWasCovered: existingLog.topics_covered,
                        whatWasLeftOver: existingLog.leftovers,
                        notes: existingLog.notes,
                        loggedAt: existingLog.created_at,
                    }
                    : undefined,
            };
        });
        res.json({ sessions, date: todayDateStr });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/sessions/log
 */
router.post('/log', authenticate, (req, res) => {
    try {
        const user = req.user;
        const { scheduledSessionId, timetable_id, timetableId, status = 'Completed', percentage_complete, percentageComplete, topicsCovered, whatWasCovered, whatWasLeftOver, notes, } = req.body;
        const finalTimetableId = timetable_id || timetableId || scheduledSessionId;
        const todayDateStr = new Date().toISOString().split('T')[0];
        const finalPct = Number(percentage_complete ?? percentageComplete ?? (status.toLowerCase().includes('complete') ? 100 : 50));
        const finalCovered = typeof topicsCovered === 'string' ? topicsCovered : (whatWasCovered || JSON.stringify(topicsCovered || ''));
        const finalLeft = whatWasLeftOver || '';
        if (!finalTimetableId) {
            res.status(400).json({ error: 'Timetable ID is required.' });
            return;
        }
        const timetable = db.prepare(`SELECT * FROM timetables WHERE id = ?`).get(finalTimetableId);
        if (!timetable) {
            res.status(404).json({ error: 'Timetable slot not found.' });
            return;
        }
        const logId = `log-${Date.now()}`;
        db.prepare(`
      INSERT INTO daily_logs (id, session_date, timetable_id, faculty_id, status, percentage_complete, topics_covered, leftovers, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(logId, todayDateStr, finalTimetableId, user?.id || timetable.faculty_id, status, finalPct, finalCovered, finalLeft, notes || '', new Date().toISOString());
        // Update first pending topic
        const topic = db.prepare(`
      SELECT * FROM topics 
      WHERE subject_id = ? AND status != 'COMPLETED' AND status != 'SKIPPED'
      ORDER BY sequence ASC LIMIT 1
    `).get(timetable.subject_id);
        if (topic) {
            const normalizedStatus = status.toLowerCase();
            if (normalizedStatus.includes('complete')) {
                db.prepare(`UPDATE topics SET status = 'COMPLETED', percentage_complete = 100 WHERE id = ?`).run(topic.id);
            }
            else if (normalizedStatus.includes('progress')) {
                db.prepare(`UPDATE topics SET status = 'IN_PROGRESS', percentage_complete = ? WHERE id = ?`).run(finalPct, topic.id);
            }
            else if (normalizedStatus.includes('skip')) {
                db.prepare(`UPDATE topics SET status = 'SKIPPED' WHERE id = ?`).run(topic.id);
            }
        }
        res.status(201).json({
            success: true,
            message: 'Session log saved successfully.',
            sessionLog: {
                id: logId,
                status,
                actualHours: 1,
                loggedAt: new Date().toISOString(),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * PUT /api/sessions/log/:id
 */
router.put('/log/:id', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { status, percentage_complete, percentageComplete, whatWasCovered, whatWasLeftOver, notes } = req.body;
        const finalPct = Number(percentage_complete ?? percentageComplete ?? 100);
        db.prepare(`
      UPDATE daily_logs SET
        status = COALESCE(?, status),
        percentage_complete = COALESCE(?, percentage_complete),
        topics_covered = COALESCE(?, topics_covered),
        leftovers = COALESCE(?, leftovers),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status, finalPct, whatWasCovered, whatWasLeftOver, notes, id);
        res.json({ success: true, message: 'Session log updated.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/sessions/audit-history/:sessionLogId
 */
router.get('/audit-history/:sessionLogId', authenticate, (req, res) => {
    const { sessionLogId } = req.params;
    const log = db.prepare(`SELECT * FROM daily_logs WHERE id = ?`).get(sessionLogId);
    res.json({
        auditHistory: [
            {
                id: `audit-${sessionLogId}`,
                sessionLogId,
                changedByUser: { id: req.user?.id || 'user', name: req.user?.name || 'Faculty', role: req.user?.role || 'FACULTY' },
                action: 'UPDATE',
                newState: JSON.stringify(log || {}),
                reason: 'Session update logged',
                createdAt: log?.created_at || new Date().toISOString(),
            },
        ],
    });
});
export default router;
