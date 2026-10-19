import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/alerts
 */
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();

    let query = `
      SELECT a.*, s.name as subject_name, s.code as subject_code,
             u.name as recipient_name, u.email as recipient_email, u.role as recipient_role
      FROM alerts a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN users u ON a.recipient_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userRole === 'FACULTY') {
      query += ` AND a.recipient_user_id = ?`;
      params.push(user?.id);
    }

    query += ` ORDER BY a.created_at DESC LIMIT 50`;

    const rawAlerts = db.prepare(query).all(...params) as any[];

    const alerts = rawAlerts.map((a) => ({
      id: a.id,
      subjectId: a.subject_id,
      subject: { id: a.subject_id, code: a.subject_code || '', name: a.subject_name || '' },
      recipientUserId: a.recipient_user_id,
      recipientUser: {
        id: a.recipient_user_id,
        name: a.recipient_name || 'User',
        email: a.recipient_email || '',
        role: a.recipient_role || 'FACULTY',
      },
      type: a.type,
      title: a.title,
      message: a.message,
      status: a.status,
      hoursUnlogged: 24,
      scheduledDate: a.scheduled_date || a.created_at,
      createdAt: a.created_at,
    }));

    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 */
router.post('/:id/acknowledge', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    db.prepare(`UPDATE alerts SET status = 'ACKNOWLEDGED' WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Alert acknowledged.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
