import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Campuses
router.get('/campuses', authenticate, (_req: Request, res: Response): void => {
  try {
    const campuses = db.prepare(`SELECT * FROM campuses ORDER BY name ASC`).all() as any[];
    const result = campuses.map((c) => {
      const batchCount = (db.prepare(`SELECT COUNT(*) as cnt FROM batches WHERE campus_id = ?`).get(c.id) as any).cnt;
      const userCount = (db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE campus_id = ?`).get(c.id) as any).cnt;
      return {
        ...c,
        _count: { batches: batchCount, users: userCount },
      };
    });
    res.json({ campuses: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tracks
router.get('/tracks', authenticate, (_req: Request, res: Response): void => {
  try {
    const tracks = db.prepare(`SELECT * FROM tracks ORDER BY name ASC`).all();
    res.json({ tracks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batches
router.get('/batches', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { campusId, trackId } = req.query;
    let query = `
      SELECT b.*, c.name as campus_name, t.name as track_name
      FROM batches b
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (campusId) {
      query += ` AND b.campus_id = ?`;
      params.push(campusId);
    }
    if (trackId) {
      query += ` AND b.track_id = ?`;
      params.push(trackId);
    }

    if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      query += ` AND b.campus_id = ?`;
      params.push(req.user.campusId);
    }

    query += ` ORDER BY b.name ASC`;
    const batches = db.prepare(query).all(...params) as any[];

    res.json({
      batches: batches.map((b) => ({
        id: b.id,
        name: b.name,
        campus: { id: b.campus_id, name: b.campus_name },
        track: { id: b.track_id, name: b.track_name },
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Semesters
router.get('/semesters', authenticate, (_req: Request, res: Response): void => {
  try {
    const semesters = db.prepare(`
      SELECT s.*, c.name as campus_name FROM semesters s
      JOIN campuses c ON s.campus_id = c.id
      ORDER BY s.start_date DESC
    `).all() as any[];

    const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all() as any[];

    res.json({
      semesters: semesters.map((s) => ({
        id: s.id,
        name: `Semester (${s.campus_name})`,
        campusId: s.campus_id,
        startDate: s.start_date,
        endDate: s.end_date,
        saturdayRule: s.working_saturdays_rule,
        holidays: JSON.parse(s.holidays_json || '[]'),
        examWindows: exams.filter((e) => e.semester_id === s.id),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
