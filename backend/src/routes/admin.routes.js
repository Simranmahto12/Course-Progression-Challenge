import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';
import { CalendarEngine } from '../services/calendarEngine.js';
const router = Router();
/**
 * POST /api/admin/semesters
 * Create or update semester configuration and calendar rules per campus
 */
router.post('/semesters', authenticate, requireRoles(['ADMIN']), (req, res) => {
    try {
        const { id = `sem-${Date.now()}`, campus_id, start_date, end_date, working_saturdays_rule = 'SECOND_FOURTH_SATURDAY', holidays_json = '[]', name = 'Semester 2026', } = req.body;
        if (!campus_id || !start_date || !end_date) {
            res.status(400).json({ error: 'campus_id, start_date, and end_date are required.' });
            return;
        }
        const holidaysStr = typeof holidays_json === 'string' ? holidays_json : JSON.stringify(holidays_json);
        // Upsert into semesters table
        db.prepare(`
      INSERT INTO semesters (id, campus_id, start_date, end_date, working_saturdays_rule, holidays_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        campus_id = excluded.campus_id,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        working_saturdays_rule = excluded.working_saturdays_rule,
        holidays_json = excluded.holidays_json
    `).run(id, campus_id, start_date, end_date, working_saturdays_rule, holidaysStr);

    // Automatically recalculate topic dates for campus subjects and audit movements
    const campusSubjects = db.prepare(`
      SELECT s.id FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      WHERE b.campus_id = ?
    `).all(campus_id);

    let auditedMoves = 0;
    for (const sub of campusSubjects) {
      const res = CalendarEngine.recalculateAndAuditSubjectDates(
        sub.id,
        `Semester academic calendar or holiday update (${name || id})`,
        req.user?.name || req.user?.email || 'Admin'
      );
      if (res?.auditEntries) {
        auditedMoves += res.auditEntries.length;
      }
    }

    res.status(201).json({
      message: 'Semester configuration saved successfully.',
      auditedDateMovementsCount: auditedMoves,
      semester: {
        id,
        campus_id,
        name,
        start_date,
        end_date,
        working_saturdays_rule,
        holidays_json: JSON.parse(holidaysStr),
      },
    });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to save semester.' });
    }
});
/**
 * GET /api/admin/semesters
 * Fetch list of configured semesters
 */
router.get('/semesters', authenticate, (_req, res) => {
    try {
        const semesters = db.prepare(`
      SELECT s.*, c.name as campus_name
      FROM semesters s
      JOIN campuses c ON s.campus_id = c.id
      ORDER BY s.start_date DESC
    `).all();
        res.json({
            semesters: semesters.map((s) => ({
                ...s,
                holidays_json: JSON.parse(s.holidays_json || '[]'),
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/dashboards/global (also /api/admin/dashboards/global)
 * Return program-wide roll-up view across campuses (HI-Tech, Ratnam, RGIB, JUJ) and tracks.
 * Crucial Rule: Rolled-up status reflects the WORST subject (MIN buffer_ratio), never an average!
 */
router.get(['/dashboards/global', '/global'], authenticate, (_req, res) => {
    try {
        const campuses = db.prepare(`SELECT * FROM campuses ORDER BY name ASC`).all();
        const tracks = db.prepare(`SELECT * FROM tracks ORDER BY name ASC`).all();
        const allSubjects = db.prepare(`SELECT id FROM subjects`).all();
        // Calculate progression for all subjects
        const subjectMetrics = [];
        for (const sub of allSubjects) {
            const result = CalculationEngine.calculateSubjectProgress(sub.id);
            if (result)
                subjectMetrics.push(result);
        }
        // Roll-up per Campus
        const campusRollups = campuses.map((campus) => {
            const campusSubs = subjectMetrics.filter((s) => s.campusName === campus.name);
            return CalculationEngine.calculateRollup(campus.id, campus.name, 'CAMPUS', campusSubs);
        });
        // Roll-up per Track
        const trackRollups = tracks.map((track) => {
            const trackSubs = subjectMetrics.filter((s) => s.trackName === track.name);
            return CalculationEngine.calculateRollup(track.id, track.name, 'TRACK', trackSubs);
        });
        // Global Program Rollup (MIN buffer ratio across everything)
        const programRollup = CalculationEngine.calculateRollup('msot-program', 'Mirai School of Technology', 'CAMPUS', subjectMetrics);
        res.json({
            programRollup,
            campusRollups,
            trackRollups,
            subjectMetrics,
            totalSubjects: subjectMetrics.length,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/dashboards/exam-readiness (also /api/admin/dashboards/exam-readiness)
 * Return in-scope coverage and hours needed before upcoming exams across subjects.
 */
router.get(['/dashboards/exam-readiness', '/exam-readiness'], authenticate, (_req, res) => {
    try {
        const exams = db.prepare(`
      SELECT * FROM exams ORDER BY start_date ASC
    `).all();
        const subjects = db.prepare(`
      SELECT s.id, s.name, s.code, b.name as batch_name, c.name as campus_name
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      ORDER BY s.name ASC
    `).all();
        const readinessData = [];
        for (const exam of exams) {
            const subjectReadiness = [];
            for (const sub of subjects) {
                const readiness = CalculationEngine.calculateExamReadiness(sub.id, exam);
                if (readiness && readiness.inScopeTopicsCount > 0) {
                    subjectReadiness.push({
                        subjectId: sub.id,
                        subjectCode: sub.code,
                        subjectName: sub.name,
                        batchName: sub.batch_name,
                        campusName: sub.campus_name,
                        ...readiness,
                    });
                }
            }
            readinessData.push({
                exam: {
                    id: exam.id,
                    name: exam.name,
                    displayName: exam.display_name,
                    startDate: exam.start_date,
                    endDate: exam.end_date,
                },
                subjects: subjectReadiness,
            });
        }
        res.json({
            exams: readinessData,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
