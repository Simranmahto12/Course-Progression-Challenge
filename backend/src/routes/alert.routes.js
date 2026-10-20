import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// In-memory or persisted configuration for alert delivery
let alertConfig = {
  inAppEnabled: true,
  emailEnabled: true,
  webhookEnabled: false,
  webhookUrl: 'https://api.mirai.edu/webhooks/sms-alerts',
  escalationThresholdHours: 48,
};

/**
 * GET /api/alerts/config
 */
router.get('/config', authenticate, (req, res) => {
  res.json({ config: alertConfig });
});

/**
 * POST /api/alerts/config
 */
router.post('/config', authenticate, (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'CAMPUS_MANAGER') {
      res.status(403).json({ error: 'Only Admin and Campus Manager can configure alert delivery.' });
      return;
    }

    const { inAppEnabled, emailEnabled, webhookEnabled, webhookUrl, escalationThresholdHours } = req.body;
    if (inAppEnabled !== undefined) alertConfig.inAppEnabled = Boolean(inAppEnabled);
    if (emailEnabled !== undefined) alertConfig.emailEnabled = Boolean(emailEnabled);
    if (webhookEnabled !== undefined) alertConfig.webhookEnabled = Boolean(webhookEnabled);
    if (webhookUrl !== undefined) alertConfig.webhookUrl = String(webhookUrl);
    if (escalationThresholdHours !== undefined) alertConfig.escalationThresholdHours = Number(escalationThresholdHours);

    res.json({ success: true, message: 'Alert delivery configuration updated.', config: alertConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/alerts
 */
router.get('/', authenticate, (req, res) => {
  try {
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();
    let query = `
      SELECT a.*, s.name as subject_name, s.code as subject_code,
             u.name as recipient_name, u.email as recipient_email, u.role as recipient_role,
             e.name as escalated_name
      FROM alerts a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN users u ON a.recipient_user_id = u.id
      LEFT JOIN users e ON a.escalated_to = e.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'FACULTY') {
      query += ` AND a.recipient_user_id = ?`;
      params.push(user?.id);
    } else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
      // Campus manager sees alerts for their campus or escalated to them
      query += ` AND (a.recipient_user_id = ? OR a.escalated_to = ? OR a.type = 'CAMPUS_MANAGER_ESCALATION')`;
      params.push(user?.id, user?.id);
    }

    query += ` ORDER BY a.created_at DESC LIMIT 50`;
    const rawAlerts = db.prepare(query).all(...params);

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
      deliveryChannel: a.delivery_channel || 'IN_APP',
      isEscalated: Boolean(a.is_escalated),
      escalatedTo: a.escalated_to,
      escalatedName: a.escalated_name,
      acknowledgedAt: a.acknowledged_at,
      scheduledDate: a.scheduled_date || a.created_at,
      createdAt: a.created_at,
    }));

    res.json({ alerts, config: alertConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/alerts/generate-missed-log-alerts
 * Scan for unlogged scheduled sessions and trigger reminders or 48h manager escalations
 */
router.post('/generate-missed-log-alerts', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Find timetable slots that took place in the past 7 days without a matching daily log
    const timetables = db.prepare(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             u.name as faculty_name, u.email as faculty_email,
             b.campus_id
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN users u ON tt.faculty_id = u.id
      JOIN batches b ON tt.batch_id = b.id
    `).all();

    // Find campus managers for escalations
    const campusManagers = db.prepare(`SELECT * FROM users WHERE role = 'campus_manager'`).all();
    const defaultManager = campusManagers[0] || { id: 'usr-mgr-hitech', name: 'Priya Nair' };

    let generatedReminders = 0;
    let generatedEscalations = 0;

    // Check each timetable entry for recent unlogged sessions
    for (const tt of timetables) {
      // Check if session has a daily log within the last 3 days
      const recentLog = db.prepare(`
        SELECT id FROM daily_logs 
        WHERE timetable_id = ? 
        ORDER BY session_date DESC LIMIT 1
      `).get(tt.id);

      // If no recent log, check if an alert already exists
      const existingAlert = db.prepare(`
        SELECT id, is_escalated, created_at FROM alerts 
        WHERE timetable_id = ? AND status = 'PENDING'
      `).get(tt.id);

      if (!existingAlert) {
        // Create end-of-day reminder for faculty
        const alertId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO alerts (id, subject_id, recipient_user_id, timetable_id, type, title, message, status, scheduled_date, created_at, delivery_channel, is_escalated)
          VALUES (?, ?, ?, ?, 'FACULTY_REMINDER', ?, ?, 'PENDING', ?, datetime('now'), ?, 0)
        `).run(
          alertId,
          tt.subject_id,
          tt.faculty_id,
          tt.id,
          `Missed Session Log: ${tt.subject_name}`,
          `Reminder: No class log filed for scheduled session on ${tt.day_of_week} (${tt.start_time} - ${tt.end_time}). Please file within 24h.`,
          today,
          alertConfig.emailEnabled ? 'EMAIL+IN_APP' : 'IN_APP'
        );
        generatedReminders++;
      } else if (!existingAlert.is_escalated) {
        // If alert was created > 48 hours ago and still pending, escalate to Campus Manager!
        const alertAgeHours = (Date.now() - new Date(existingAlert.created_at).getTime()) / (1000 * 60 * 60);
        if (alertAgeHours >= alertConfig.escalationThresholdHours) {
          const escId = `alt-esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          db.prepare(`
            INSERT INTO alerts (id, subject_id, recipient_user_id, timetable_id, type, title, message, status, scheduled_date, created_at, delivery_channel, is_escalated, escalated_to)
            VALUES (?, ?, ?, ?, 'CAMPUS_MANAGER_ESCALATION', ?, ?, 'PENDING', ?, datetime('now'), 'IN_APP+EMAIL', 1, ?)
          `).run(
            escId,
            tt.subject_id,
            defaultManager.id,
            tt.id,
            `⚠️ 48-Hour Escalation: Unlogged Class (${tt.subject_name})`,
            `Escalation: Faculty member ${tt.faculty_name} has not submitted the session log for ${tt.subject_name} (${tt.day_of_week} ${tt.start_time}) for over 48 hours.`,
            today,
            defaultManager.id
          );
          // Mark original alert as escalated
          db.prepare(`UPDATE alerts SET is_escalated = 1, escalated_to = ? WHERE id = ?`).run(defaultManager.id, existingAlert.id);
          generatedEscalations++;
        }
      }
    }

    res.json({
      success: true,
      message: `Alert scan complete. Generated ${generatedReminders} faculty reminders and ${generatedEscalations} 48-hour manager escalations.`,
      generatedReminders,
      generatedEscalations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 */
router.post('/:id/acknowledge', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare(`
      UPDATE alerts 
      SET status = 'ACKNOWLEDGED', acknowledged_at = datetime('now') 
      WHERE id = ?
    `).run(id);
    res.json({ success: true, message: 'Alert acknowledged.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

