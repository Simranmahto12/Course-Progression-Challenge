import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { CalculationEngine, SubjectCalculationResult } from '../services/calculationEngine.js';

const router = Router();

/**
 * GET /api/dashboard/admin
 * Program-level dashboard with worst-subject rollups and campus cards
 */
router.get('/admin', authenticate, (_req: Request, res: Response): void => {
  try {
    const campuses = db.prepare(`SELECT * FROM campuses ORDER BY name ASC`).all() as any[];
    const tracks = db.prepare(`SELECT * FROM tracks ORDER BY name ASC`).all() as any[];
    const subjects = db.prepare(`SELECT id FROM subjects`).all() as any[];

    const subjectMetrics: SubjectCalculationResult[] = [];
    for (const sub of subjects) {
      const resSub = CalculationEngine.calculateSubjectProgress(sub.id);
      if (resSub) subjectMetrics.push(resSub);
    }

    const campusRollups = campuses.map((c) => {
      const subs = subjectMetrics.filter((s) => s.campusName === c.name);
      return CalculationEngine.calculateRollup(c.id, c.name, 'CAMPUS', subs);
    });

    const trackRollups = tracks.map((t) => {
      const subs = subjectMetrics.filter((s) => s.trackName === t.name);
      return CalculationEngine.calculateRollup(t.id, t.name, 'TRACK', subs);
    });

    const programRollup = CalculationEngine.calculateRollup(
      'msot-program',
      'Mirai School of Technology',
      'CAMPUS',
      subjectMetrics
    );

    res.json({
      programRollup,
      campusRollups,
      trackRollups,
      subjectMetrics,
      totalSubjects: subjectMetrics.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/campus-manager
 * Campus-specific dashboard
 */
router.get('/campus-manager', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user;
    let campusId = user?.campusId;

    if (!campusId) {
      const firstCampus = db.prepare(`SELECT id FROM campuses LIMIT 1`).get() as any;
      campusId = firstCampus?.id;
    }

    const campus = db.prepare(`SELECT * FROM campuses WHERE id = ?`).get(campusId) as any;
    if (!campus) {
      res.status(404).json({ error: 'Campus not found.' });
      return;
    }

    const subjectsInCampus = db.prepare(`
      SELECT s.id FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      WHERE b.campus_id = ?
    `).all(campusId) as any[];

    const subjectMetrics: SubjectCalculationResult[] = [];
    for (const sub of subjectsInCampus) {
      const resSub = CalculationEngine.calculateSubjectProgress(sub.id);
      if (resSub) subjectMetrics.push(resSub);
    }

    const campusRollup = CalculationEngine.calculateRollup(campus.id, campus.name, 'CAMPUS', subjectMetrics);

    // Track rollups for this campus
    const tracks = db.prepare(`SELECT * FROM tracks ORDER BY name ASC`).all() as any[];
    const trackRollups = tracks.map((t) => {
      const subs = subjectMetrics.filter((s) => s.trackName === t.name);
      return CalculationEngine.calculateRollup(t.id, t.name, 'TRACK', subs);
    });

    // Unlogged alerts (missing logs past 48h)
    const alerts = db.prepare(`
      SELECT a.*, s.name as subject_name, s.code as subject_code
      FROM alerts a
      LEFT JOIN subjects s ON a.subject_id = s.id
      ORDER BY a.created_at DESC LIMIT 10
    `).all() as any[];

    res.json({
      campus,
      campusRollup,
      trackRollups,
      subjectMetrics,
      unloggedAlerts: alerts.map((a) => ({
        id: a.id,
        subjectId: a.subject_id,
        subject: { id: a.subject_id, code: a.subject_code || '', name: a.subject_name || '' },
        recipientUserId: a.recipient_user_id,
        recipientUser: { id: a.recipient_user_id, name: 'Faculty', email: '', role: 'FACULTY' },
        type: a.type,
        title: a.title,
        message: a.message,
        status: a.status,
        hoursUnlogged: 48,
        scheduledDate: a.scheduled_date || a.created_at,
        createdAt: a.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/faculty
 * Faculty-specific dashboard
 */
router.get('/faculty', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();

    let query = `
      SELECT s.*, b.name as batch_name, c.name as campus_name, t.name as track_name
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
    `;
    const params: any[] = [];

    if (userRole === 'FACULTY' && user?.id) {
      query += ` WHERE s.faculty_id = ?`;
      params.push(user.id);
    }
    query += ` ORDER BY s.name ASC`;

    const mySubjects = db.prepare(query).all(...params) as any[];

    const subjectMetrics: SubjectCalculationResult[] = [];
    for (const sub of mySubjects) {
      const resSub = CalculationEngine.calculateSubjectProgress(sub.id);
      if (resSub) subjectMetrics.push(resSub);
    }

    const facultyRollup = CalculationEngine.calculateRollup(
      user?.id || 'faculty',
      user?.name || 'Faculty Member',
      'BATCH',
      subjectMetrics
    );

    // Overdue topics across assigned subjects
    const allOverdueTopics = subjectMetrics.flatMap((s) =>
      s.overdueTopics.map((t) => ({ ...t, subjectCode: s.subjectCode, subjectName: s.subjectName }))
    );

    // Upcoming exams
    const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all() as any[];

    res.json({
      facultyRollup,
      subjectMetrics,
      overdueTopics: allOverdueTopics,
      upcomingExams: exams,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/student
 * Student read-only view: topics covered, upcoming topics, exam dates, exam syllabus scope
 */
router.get('/student', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user;
    let batchId = user?.batchId;

    if (!batchId) {
      const firstBatch = db.prepare(`SELECT id FROM batches LIMIT 1`).get() as any;
      batchId = firstBatch?.id;
    }

    const batch = db.prepare(`
      SELECT b.*, c.name as campus_name, t.name as track_name
      FROM batches b
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      WHERE b.id = ?
    `).get(batchId) as any;

    const subjects = db.prepare(`
      SELECT s.*, u.name as faculty_name, u.email as faculty_email
      FROM subjects s
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE s.batch_id = ?
      ORDER BY s.name ASC
    `).all(batchId) as any[];

    const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all() as any[];

    const subjectProgressList = subjects.map((sub) => {
      const topics = db.prepare(`
        SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
      `).all(sub.id) as any[];

      const metrics = CalculationEngine.calculateSubjectProgress(sub.id);

      const examReadiness = exams.map((exam) => CalculationEngine.calculateExamReadiness(sub.id, exam)).filter((r) => r !== null && r.inScopeTopicsCount > 0);

      // Student view cleans out internal notes
      const publicTopics = topics.map((t) => ({
        id: t.id,
        unit: t.unit_name,
        sequence: t.sequence,
        name: t.topic_name,
        plannedHours: t.planned_hours,
        status: t.status,
        completionPercentage: t.percentage_complete,
        plannedDate: t.planned_date,
        examScopes: t.exam_scope_flag,
      }));

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        color: sub.color || '#4361ee',
        facultyName: sub.faculty_name || 'Faculty',
        targetFinishDate: sub.target_finish_date,
        metrics,
        topics: publicTopics,
        examReadiness,
      };
    });

    res.json({
      batch: {
        id: batch?.id,
        name: batch?.name,
        campusName: batch?.campus_name,
        trackName: batch?.track_name,
      },
      subjects: subjectProgressList,
      upcomingExams: exams.map((e) => ({
        id: e.id,
        name: e.name,
        displayName: e.display_name,
        startDate: e.start_date,
        endDate: e.end_date,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
