import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, verifySubjectAccess } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';
const router = Router();
/**
 * GET /api/subjects
 * Retrieve subjects with calculation metrics and topics
 */
router.get('/', authenticate, (req, res) => {
    try {
        const user = req.user;
        const userRole = (user?.role || '').toUpperCase();
        const { campusId, batchId, facultyId } = req.query;
        let query = `
      SELECT s.*, b.name as batch_name, b.campus_id, c.name as campus_name,
             t.name as track_name, u.name as faculty_name, u.email as faculty_email
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (campusId) {
            query += ` AND c.id = ?`;
            params.push(campusId);
        }
        if (batchId) {
            query += ` AND b.id = ?`;
            params.push(batchId);
        }
        if (facultyId) {
            query += ` AND s.faculty_id = ?`;
            params.push(facultyId);
        }
        // Role-based scoping
        if (userRole === 'FACULTY') {
            query += ` AND s.faculty_id = ?`;
            params.push(user?.id);
        }
        else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
            query += ` AND c.id = ?`;
            params.push(user.campusId);
        }
        else if (userRole === 'STUDENT' && user?.batchId) {
            query += ` AND b.id = ?`;
            params.push(user.batchId);
        }
        query += ` ORDER BY s.name ASC`;
        const rawSubjects = db.prepare(query).all(...params);
        // Fetch exams for readiness
        const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all();
        const subjects = rawSubjects.map((sub) => {
            const topics = db.prepare(`
        SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
      `).all(sub.id);
            const progression = CalculationEngine.calculateSubjectProgress(sub.id);
            const examReadiness = exams.map((exam) => {
                return CalculationEngine.calculateExamReadiness(sub.id, exam);
            }).filter((r) => r !== null && r.inScopeTopicsCount > 0);
            const formattedTopics = topics.map((t) => ({
                id: t.id,
                unit: t.unit_name,
                sequence: t.sequence,
                name: t.topic_name,
                plannedHours: t.planned_hours,
                status: t.status,
                completionPercentage: t.percentage_complete,
                coveredHours: CalculationEngine.calculateTopicCoveredHours({
                    status: t.status,
                    planned_hours: t.planned_hours,
                    percentage_complete: t.percentage_complete,
                }),
                plannedDate: t.planned_date,
                examScopes: t.exam_scope_flag,
            }));
            const totalPlanned = formattedTopics.reduce((acc, curr) => acc + curr.plannedHours, 0);
            return {
                id: sub.id,
                code: sub.code,
                name: sub.name,
                color: sub.color || '#4361ee',
                targetFinishDate: sub.target_finish_date,
                plannedHours: totalPlanned,
                campusId: sub.campus_id,
                campus: { id: sub.campus_id, name: sub.campus_name },
                track: { id: sub.track_id, name: sub.track_name },
                batch: { id: sub.batch_id, name: sub.batch_name },
                faculty: sub.faculty_name
                    ? { id: sub.faculty_id, name: sub.faculty_name, email: sub.faculty_email }
                    : undefined,
                topics: formattedTopics,
                progression,
                examReadiness,
            };
        });
        res.json({ subjects });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/subjects/:id
 */
router.get('/:id', authenticate, verifySubjectAccess, (req, res) => {
    try {
        const { id } = req.params;
        const sub = db.prepare(`
      SELECT s.*, b.name as batch_name, b.campus_id, c.name as campus_name,
             t.name as track_name, u.name as faculty_name, u.email as faculty_email
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE s.id = ?
    `).get(id);
        if (!sub) {
            res.status(404).json({ error: 'Subject not found.' });
            return;
        }
        const topics = db.prepare(`
      SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
    `).all(id);
        const progression = CalculationEngine.calculateSubjectProgress(id);
        const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all();
        const examReadiness = exams.map((exam) => CalculationEngine.calculateExamReadiness(id, exam)).filter((r) => r !== null && r.inScopeTopicsCount > 0);
        const formattedTopics = topics.map((t) => ({
            id: t.id,
            unit: t.unit_name,
            sequence: t.sequence,
            name: t.topic_name,
            plannedHours: t.planned_hours,
            status: t.status,
            completionPercentage: t.percentage_complete,
            coveredHours: CalculationEngine.calculateTopicCoveredHours({
                status: t.status,
                planned_hours: t.planned_hours,
                percentage_complete: t.percentage_complete,
            }),
            plannedDate: t.planned_date,
            examScopes: t.exam_scope_flag,
        }));
        res.json({
            subject: {
                id: sub.id,
                code: sub.code,
                name: sub.name,
                color: sub.color || '#4361ee',
                targetFinishDate: sub.target_finish_date,
                campusId: sub.campus_id,
                campus: { id: sub.campus_id, name: sub.campus_name },
                track: { id: sub.track_id, name: sub.track_name },
                batch: { id: sub.batch_id, name: sub.batch_name },
                faculty: sub.faculty_name
                    ? { id: sub.faculty_id, name: sub.faculty_name, email: sub.faculty_email }
                    : undefined,
                topics: formattedTopics,
                progression,
                examReadiness,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/subjects/:id/explain-calculation
 * Transparent step-by-step mathematical derivation of progress, buffer ratio, and status
 */
router.get('/:id/explain-calculation', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const progress = CalculationEngine.calculateSubjectProgress(id);
        if (!progress) {
            res.status(404).json({ error: 'Subject not found.' });
            return;
        }
        const sub = db.prepare(`
      SELECT s.*, b.campus_id, c.name as campus_name FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE s.id = ?
    `).get(id);
        const semester = db.prepare(`
      SELECT * FROM semesters WHERE campus_id = ? ORDER BY start_date DESC LIMIT 1
    `).get(sub.campus_id);
        const timetableSlots = db.prepare(`
      SELECT day_of_week, start_time, end_time FROM timetables WHERE subject_id = ?
    `).all(id);
        res.json({
            subjectId: id,
            subjectCode: progress.subjectCode,
            subjectName: progress.subjectName,
            metrics: progress,
            auditExplanation: {
                formulaHoursInScope: 'Sum of planned_hours for all non-skipped topics.',
                hoursInScope: progress.hoursInScope,
                formulaCoveredHours: 'Completed topics (100%) + In Progress topics (planned_hours * % / 100).',
                coveredHours: progress.coveredHours,
                remainingHours: progress.remainingHours,
                availableTeachingHours: progress.availableHours,
                saturdayRuleUsed: semester?.working_saturdays_rule || 'SECOND_FOURTH_SATURDAY',
                holidaysCount: semester?.holidays_json ? JSON.parse(semester.holidays_json).length : 0,
                timetableWeeklySlotsCount: timetableSlots.length,
                bufferRatioFormula: 'Available Teaching Hours ÷ Remaining Planned Hours',
                bufferRatio: progress.bufferRatio,
                thresholdInterpretation: progress.bufferRatio >= 1.15
                    ? 'ON TRACK (Buffer ≥ 1.15): Plenty of buffer sessions remain.'
                    : progress.bufferRatio >= 1.00
                        ? 'TIGHT (1.00 ≤ Buffer < 1.15): Minimal margin for unforeseen cancellations.'
                        : 'DANGER (Buffer < 1.00): Critical shortage! Classes must be added or syllabus paced faster.',
                status: progress.status,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/subjects/:id/recalculate-dates
 */
router.post('/:id/recalculate-dates', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const progress = CalculationEngine.calculateSubjectProgress(id);
        res.json({ success: true, progression: progress });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
