import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';

const router = Router();

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Helper: Find expected next topic for a subject
 */
function getExpectedTopic(subjectId: string) {
  const topic = db.prepare(`
    SELECT * FROM topics 
    WHERE subject_id = ? AND status != 'COMPLETED' AND status != 'SKIPPED'
    ORDER BY sequence ASC 
    LIMIT 1
  `).get(subjectId) as any;

  if (!topic) return undefined;

  return {
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
  };
}

/**
 * GET /api/logs/today (and /api/sessions/today)
 * Fetch scheduled sessions pre-filled for the logged-in faculty for rapid logging
 */
router.get('/today', authenticate, (req: AuthenticatedRequest, res: Response): void => {
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
    const params: any[] = [todayName];

    // If faculty, filter by their own sessions. If Admin or Campus Manager, show all or campus.
    const userRole = (user?.role || '').toUpperCase();
    if (userRole === 'FACULTY') {
      query += ` AND tt.faculty_id = ?`;
      params.push(user?.id);
    } else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
      query += ` AND c.id = ?`;
      params.push(user.campusId);
    }

    query += ` ORDER BY tt.start_time ASC`;

    const slots = db.prepare(query).all(...params) as any[];

    // For each slot, look up if a log was already submitted for today
    const sessions = slots.map((slot) => {
      const existingLog = db.prepare(`
        SELECT * FROM daily_logs 
        WHERE timetable_id = ? AND session_date = ?
      `).get(slot.id, todayDateStr) as any;

      const durationHours =
        CalculationEngine.timeToHours(slot.end_time) - CalculationEngine.timeToHours(slot.start_time);

      const expectedTopic = getExpectedTopic(slot.subject_id);

      return {
        id: slot.id,
        timetableId: slot.id,
        subjectId: slot.subject_id,
        sessionDate: todayDateStr,
        startTime: slot.start_time,
        endTime: slot.end_time,
        durationHours: Math.round(durationHours * 100) / 100,
        room: slot.room || 'Room 101',
        status: existingLog ? existingLog.status : 'SCHEDULED',
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

    res.json({
      date: todayDateStr,
      dayOfWeek: todayName,
      sessions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/logs (and /api/sessions/log)
 * Effortless sub-60-second session log submission
 */
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user;
    const {
      timetable_id,
      timetableId,
      session_id, // alias if passed as session_id
      session_date = new Date().toISOString().split('T')[0],
      sessionDate,
      faculty_id = user?.id,
      status = 'Completed',
      percentage_complete,
      percentageComplete,
      topics_covered,
      whatWasCovered,
      leftovers,
      whatWasLeftOver,
      notes,
    } = req.body;

    const finalTimetableId = timetable_id || timetableId || session_id;
    const finalSessionDate = session_date || sessionDate || new Date().toISOString().split('T')[0];
    const finalPercentage = Number(percentage_complete ?? percentageComplete ?? (status === 'Completed' ? 100 : 50));
    const finalTopicsCovered = topics_covered || whatWasCovered || '';
    const finalLeftovers = leftovers || whatWasLeftOver || '';

    if (!finalTimetableId) {
      res.status(400).json({ error: 'timetable_id is required.' });
      return;
    }

    const timetable = db.prepare(`SELECT * FROM timetables WHERE id = ?`).get(finalTimetableId) as any;
    if (!timetable) {
      res.status(404).json({ error: 'Timetable slot not found.' });
      return;
    }

    // Check if a log already exists for this timetable slot and date
    const existing = db.prepare(`
      SELECT * FROM daily_logs WHERE timetable_id = ? AND session_date = ?
    `).get(finalTimetableId, finalSessionDate) as any;

    const logId = existing ? existing.id : `log-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE daily_logs SET
          status = ?,
          percentage_complete = ?,
          topics_covered = ?,
          leftovers = ?,
          notes = ?
        WHERE id = ?
      `).run(status, finalPercentage, finalTopicsCovered, finalLeftovers, notes || '', logId);
    } else {
      db.prepare(`
        INSERT INTO daily_logs (id, session_date, timetable_id, faculty_id, status, percentage_complete, topics_covered, leftovers, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        finalSessionDate,
        finalTimetableId,
        faculty_id || user?.id,
        status,
        finalPercentage,
        finalTopicsCovered,
        finalLeftovers,
        notes || '',
        nowIso
      );
    }

    // Auto-update topic progress if topic name or expected topic matches
    const expectedTopic = getExpectedTopic(timetable.subject_id);
    if (expectedTopic) {
      if (status === 'Completed') {
        db.prepare(`
          UPDATE topics SET status = 'COMPLETED', percentage_complete = 100 WHERE id = ?
        `).run(expectedTopic.id);
      } else if (status === 'In Progress') {
        db.prepare(`
          UPDATE topics SET status = 'IN_PROGRESS', percentage_complete = ? WHERE id = ?
        `).run(finalPercentage, expectedTopic.id);
      } else if (status === 'Skipped') {
        db.prepare(`
          UPDATE topics SET status = 'SKIPPED' WHERE id = ?
        `).run(expectedTopic.id);
      }
    }

    // Real-time recalculation of subject progress
    const updatedProgress = CalculationEngine.calculateSubjectProgress(timetable.subject_id);

    res.status(200).json({
      message: 'Session logged successfully in under 60 seconds.',
      log: {
        id: logId,
        session_date: finalSessionDate,
        timetable_id: finalTimetableId,
        status,
        percentage_complete: finalPercentage,
        topics_covered: finalTopicsCovered,
        leftovers: finalLeftovers,
        notes,
      },
      updatedProgress,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log session.' });
  }
});

/**
 * PUT /api/logs/:id (Update existing log)
 */
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, percentage_complete, percentageComplete, topics_covered, whatWasCovered, leftovers, whatWasLeftOver, notes } = req.body;

    const finalPct = Number(percentage_complete ?? percentageComplete ?? 100);
    const finalCovered = topics_covered || whatWasCovered || '';
    const finalLeft = leftovers || whatWasLeftOver || '';

    db.prepare(`
      UPDATE daily_logs SET
        status = COALESCE(?, status),
        percentage_complete = COALESCE(?, percentage_complete),
        topics_covered = COALESCE(?, topics_covered),
        leftovers = COALESCE(?, leftovers),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status, finalPct, finalCovered, finalLeft, notes, id);

    res.json({ message: 'Log updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
