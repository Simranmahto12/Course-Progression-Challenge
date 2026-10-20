import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { HonorariumEngine } from '../services/honorariumEngine.js';

const router = Router();

/**
 * GET /api/honorarium/policy
 * Retrieve active policy for campus
 */
router.get('/policy', authenticate, (req, res) => {
  try {
    const { campusId = 'camp-hitech' } = req.query;
    const policy = HonorariumEngine.getPolicy(campusId);
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/honorarium/policy
 * Administrator configures honorarium rate policy (Never invented)
 */
router.post('/policy', authenticate, requireRoles(['ADMIN']), (req, res) => {
  try {
    const { campusId, ratePerLectureHour, labMultiplier, maxHoursPerMonth, conveyanceAllowance, currency } = req.body;
    const result = HonorariumEngine.setPolicy({
      campusId,
      ratePerLectureHour,
      labMultiplier,
      maxHoursPerMonth,
      conveyanceAllowance,
      currency,
      configuredBy: req.user.name || req.user.id,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/honorarium/reports
 * RBAC Scoped: Admin & Campus Manager see campus reports; visiting faculty see only their own; students forbidden (403)
 */
router.get('/reports', authenticate, (req, res) => {
  try {
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();

    if (userRole === 'STUDENT') {
      return res.status(403).json({ error: 'Access denied: Students are not permitted to view faculty compensation reports.' });
    }

    const { campusId = 'camp-hitech', monthYear } = req.query;
    let query = `
      SELECT r.*, c.name as campus_name, u.name as faculty_name, u.email as faculty_email,
             u.phone as faculty_phone, u.designation as faculty_designation
      FROM honorarium_reports r
      JOIN campuses c ON r.campus_id = c.id
      JOIN users u ON r.faculty_id = u.id
      WHERE (r.campus_id = ? OR ? IS NULL)
    `;
    const params = [campusId, campusId];

    if (userRole === 'FACULTY') {
      query += ` AND r.faculty_id = ?`;
      params.push(user.id);
    } else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
      query += ` AND r.campus_id = ?`;
      params.push(user.campusId);
    }

    if (monthYear) {
      query += ` AND r.month_year = ?`;
      params.push(monthYear);
    }

    query += ` ORDER BY r.month_year DESC, u.name ASC`;
    const rows = db.prepare(query).all(...params);

    const parsed = rows.map((r) => ({
      id: r.id,
      campusId: r.campus_id,
      campusName: r.campus_name,
      monthYear: r.month_year,
      facultyId: r.faculty_id,
      facultyName: r.faculty_name,
      facultyEmail: r.faculty_email,
      facultyPhone: r.faculty_phone,
      designation: r.faculty_designation || 'Visiting Faculty',
      plannedSessionsCount: r.planned_sessions_count,
      plannedHours: r.planned_hours,
      deliveredSessionsCount: r.delivered_sessions_count,
      deliveredHours: r.delivered_hours,
      rateApplied: r.rate_applied,
      totalAmount: r.total_amount,
      sourceLogIds: JSON.parse(r.source_log_ids_json || '[]'),
      status: r.status,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      notes: r.notes,
      createdAt: r.created_at,
    }));

    res.json({ total: parsed.length, reports: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/honorarium/reports/:id
 * Retrieve single report with linked source logs for full auditability
 */
router.get('/reports/:id', authenticate, (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole === 'STUDENT') {
      return res.status(403).json({ error: 'Access denied: Students cannot view honorarium reports.' });
    }

    const r = db.prepare(`
      SELECT r.*, c.name as campus_name, u.name as faculty_name, u.email as faculty_email,
             u.phone as faculty_phone, u.designation as faculty_designation
      FROM honorarium_reports r
      JOIN campuses c ON r.campus_id = c.id
      JOIN users u ON r.faculty_id = u.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!r) return res.status(404).json({ error: 'Report not found.' });

    const sourceLogIds = JSON.parse(r.source_log_ids_json || '[]');
    let sourceLogs = [];
    if (sourceLogIds.length > 0) {
      sourceLogs = db.prepare(`
        SELECT dl.*, tt.start_time, tt.end_time, s.name as subject_name, s.code as subject_code
        FROM daily_logs dl
        JOIN timetables tt ON dl.timetable_id = tt.id
        JOIN subjects s ON tt.subject_id = s.id
        WHERE dl.id IN (${sourceLogIds.map(() => '?').join(',')})
        ORDER BY dl.session_date ASC
      `).all(...sourceLogIds);
    }

    res.json({
      report: {
        ...r,
        sourceLogIds,
        sourceLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/honorarium/generate
 */
router.post('/generate', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), (req, res) => {
  try {
    const { campusId = 'camp-hitech', monthYear = '2026-10', facultyId } = req.body;
    const result = HonorariumEngine.generateMonthlyReport({
      campusId,
      monthYear,
      facultyId,
      createdBy: req.user.id,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/honorarium/reports/:id/submit
 */
router.post('/reports/:id/submit', authenticate, (req, res) => {
  try {
    const result = HonorariumEngine.submitReport(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/honorarium/reports/:id/approve
 */
router.post('/reports/:id/approve', authenticate, requireRoles(['ADMIN']), (req, res) => {
  try {
    const { notes } = req.body;
    const result = HonorariumEngine.approveReport(req.params.id, req.user, notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

