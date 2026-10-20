import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { AiLogParser } from '../services/aiLogParser.js';
import { CalculationEngine } from '../services/calculationEngine.js';

const router = Router();

/**
 * POST /api/logs/parse-message
 * Parses text or voice note transcript into a PROPOSED draft session entry.
 * STRICT SAFETY RULE: Never writes to daily_logs directly.
 */
router.post('/parse-message', authenticate, async (req, res) => {
  try {
    const { text, message, transcript, provider = 'voice_web', senderPhoneOrId } = req.body;
    const messageText = text || message || transcript;

    if (!messageText || !messageText.trim()) {
      return res.status(400).json({ error: 'Message text or transcript is required.' });
    }

    const facultyUser = req.user;
    const result = await AiLogParser.parseMessageToDraft({
      text: messageText,
      senderPhoneOrId: senderPhoneOrId || facultyUser?.phone || facultyUser?.email,
      provider,
      explicitFacultyId: facultyUser?.role === 'faculty' ? facultyUser.id : null,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to parse session message.' });
  }
});

/**
 * GET /api/logs/drafts
 * Retrieve pending proposed drafts for review and explicit confirmation
 */
router.get('/drafts', authenticate, (req, res) => {
  try {
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();

    let query = `
      SELECT d.*, u.name as faculty_name, u.email as faculty_email, u.phone as faculty_phone
      FROM ai_draft_logs d
      LEFT JOIN users u ON d.faculty_id = u.id
      WHERE d.status = 'PROPOSED'
    `;
    const params = [];

    if (userRole === 'FACULTY') {
      query += ` AND d.faculty_id = ?`;
      params.push(user.id);
    } else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
      query += ` AND (u.campus_id = ? OR u.campus_id IS NULL)`;
      params.push(user.campusId);
    }

    query += ` ORDER BY d.created_at DESC`;
    const drafts = db.prepare(query).all(...params);

    const parsedDrafts = drafts.map((d) => {
      let parsed = {};
      try {
        parsed = JSON.parse(d.parsed_payload_json || '{}');
      } catch {
        parsed = {};
      }
      return {
        id: d.id,
        provider: d.provider,
        senderPhoneOrId: d.sender_phone_or_id,
        facultyId: d.faculty_id,
        facultyName: d.faculty_name,
        facultyEmail: d.faculty_email,
        rawMessageText: d.raw_message_text,
        parsedEntry: parsed,
        confidenceScore: d.confidence_score,
        needsClarification: Boolean(d.needs_clarification),
        clarificationPrompt: d.clarification_prompt,
        status: d.status,
        createdAt: d.created_at,
      };
    });

    res.json({
      total: parsedDrafts.length,
      drafts: parsedDrafts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/logs/drafts/:id
 */
router.get('/drafts/:id', authenticate, (req, res) => {
  try {
    const draft = db.prepare(`SELECT * FROM ai_draft_logs WHERE id = ?`).get(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Proposed draft not found.' });
    }
    res.json({
      ...draft,
      parsed_payload: JSON.parse(draft.parsed_payload_json || '{}'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/logs/drafts/:id/confirm
 * EXPLICIT CONFIRMATION: Saves proposed draft to daily_logs after faculty review and correction
 */
router.post('/drafts/:id/confirm', authenticate, (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const draft = db.prepare(`SELECT * FROM ai_draft_logs WHERE id = ?`).get(id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found.' });
    }

    if (draft.status !== 'PROPOSED') {
      return res.status(400).json({ error: `Cannot confirm draft with status "${draft.status}".` });
    }

    // Role check: Faculty can only confirm their own draft unless Admin or Campus Manager
    const userRole = (user?.role || '').toUpperCase();
    if (userRole === 'FACULTY' && draft.faculty_id && draft.faculty_id !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to confirm drafts for another faculty member.' });
    }

    let parsed = {};
    try {
      parsed = JSON.parse(draft.parsed_payload_json || '{}');
    } catch {
      parsed = {};
    }

    // Allow user overrides from request body (correction before saving)
    const timetableId = req.body.timetableId || req.body.timetable_id || parsed.timetableId;
    const sessionDate = req.body.sessionDate || req.body.session_date || parsed.sessionDate || new Date().toISOString().slice(0, 10);
    const status = req.body.status || parsed.status || 'Completed';
    const percentageComplete = Number(req.body.percentageComplete ?? req.body.percentage_complete ?? parsed.percentageComplete ?? 100);
    const topicsCovered = req.body.topicsCovered || req.body.topics_covered || parsed.topicsCovered || '';
    const leftovers = req.body.leftovers || parsed.leftovers || '';
    const notes = req.body.notes || parsed.notes || `[Confirmed from AI draft: ${draft.id}]`;
    const facultyId = draft.faculty_id || user.id;

    if (!timetableId) {
      return res.status(400).json({ error: 'Timetable ID is required to officially record the class.' });
    }

    const timetable = db.prepare(`SELECT * FROM timetables WHERE id = ?`).get(timetableId);
    if (!timetable) {
      // Find timetable slot for this subject and faculty
      const fallbackSlot = db.prepare(`SELECT * FROM timetables WHERE subject_id = ? LIMIT 1`).get(parsed.subjectId);
      if (!fallbackSlot) {
        return res.status(400).json({ error: 'No valid timetable slot found for this subject.' });
      }
    }

    const effectiveTimetableId = timetable ? timetable.id : `tt-auto-${parsed.subjectId}`;
    const subjectId = timetable ? timetable.subject_id : parsed.subjectId;

    // Check if a daily log already exists for this timetable and date
    const existingLog = db.prepare(`
      SELECT * FROM daily_logs WHERE timetable_id = ? AND session_date = ?
    `).get(effectiveTimetableId, sessionDate);

    const logId = existingLog ? existingLog.id : `log-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (existingLog) {
      db.prepare(`
        UPDATE daily_logs SET
          status = ?,
          percentage_complete = ?,
          topics_covered = ?,
          leftovers = ?,
          notes = ?
        WHERE id = ?
      `).run(status, percentageComplete, topicsCovered, leftovers, notes, logId);
    } else {
      db.prepare(`
        INSERT INTO daily_logs (id, session_date, timetable_id, faculty_id, status, percentage_complete, topics_covered, leftovers, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(logId, sessionDate, effectiveTimetableId, facultyId, status, percentageComplete, topicsCovered, leftovers, notes, nowIso);
    }

    // Update topic progress in syllabus if topic matched
    if (subjectId) {
      const topic = db.prepare(`
        SELECT * FROM topics 
        WHERE subject_id = ? AND status != 'COMPLETED' AND status != 'SKIPPED'
        ORDER BY sequence ASC LIMIT 1
      `).get(subjectId);

      if (topic) {
        if (status === 'Completed') {
          db.prepare(`UPDATE topics SET status = 'COMPLETED', percentage_complete = 100 WHERE id = ?`).run(topic.id);
        } else if (status === 'In Progress') {
          db.prepare(`UPDATE topics SET status = 'IN_PROGRESS', percentage_complete = ? WHERE id = ?`).run(percentageComplete, topic.id);
        } else if (status === 'Skipped') {
          db.prepare(`UPDATE topics SET status = 'SKIPPED' WHERE id = ?`).run(topic.id);
        }
      }
    }

    // Mark draft as CONFIRMED
    db.prepare(`
      UPDATE ai_draft_logs SET
        status = 'CONFIRMED'
      WHERE id = ?
    `).run(id);

    // Recalculate progress
    const updatedProgress = subjectId ? CalculationEngine.calculateSubjectProgress(subjectId) : null;

    res.json({
      success: true,
      message: 'Draft successfully confirmed and recorded to official class logs.',
      logId,
      draftId: id,
      updatedProgress,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/logs/drafts/:id/discard
 */
router.post('/drafts/:id/discard', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const draft = db.prepare(`SELECT * FROM ai_draft_logs WHERE id = ?`).get(id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found.' });
    }

    db.prepare(`UPDATE ai_draft_logs SET status = 'DISCARDED' WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Draft discarded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Meta WhatsApp Webhook Challenge Verification (GET)
 */
router.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'mirai_webhook_secret';

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Webhook verification token mismatch.' });
});

/**
 * Meta WhatsApp Webhook Message Handler (POST)
 */
router.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Signature verification if secret configured
    if (appSecret) {
      const rawBody = JSON.stringify(req.body);
      const verify = AiLogParser.verifyWhatsAppSignature(rawBody, signature, appSecret);
      if (!verify.valid) {
        return res.status(401).json({ error: 'Invalid WhatsApp webhook HMAC signature.' });
      }
    }

    // Extract message & phone
    const body = req.body;
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.status(200).json({ status: 'ignored_no_message' });
    }

    const fromPhone = message.from;
    const text = message.text?.body || message.caption || '';

    if (!text) {
      return res.status(200).json({ status: 'ignored_empty_text' });
    }

    const draft = await AiLogParser.parseMessageToDraft({
      text,
      senderPhoneOrId: fromPhone,
      provider: 'whatsapp',
    });

    return res.status(200).json({ status: 'processed_draft_created', draft });
  } catch (err) {
    console.error('[WhatsApp Webhook Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Telegram Webhook Handler (POST)
 */
router.post('/webhooks/telegram', async (req, res) => {
  try {
    const secretTokenHeader = req.headers['x-telegram-bot-api-secret-token'];
    const configuredSecret = process.env.TELEGRAM_BOT_SECRET;

    if (configuredSecret) {
      const valid = AiLogParser.verifyTelegramSecret(secretTokenHeader, configuredSecret);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid Telegram bot secret token.' });
      }
    }

    const update = req.body;
    const message = update.message || update.edited_message;
    if (!message) {
      return res.status(200).json({ status: 'ignored_no_message' });
    }

    const text = message.text || message.caption || '';
    const fromId = String(message.from?.id || '');

    if (!text) {
      return res.status(200).json({ status: 'ignored_empty_text' });
    }

    const draft = await AiLogParser.parseMessageToDraft({
      text,
      senderPhoneOrId: fromId,
      provider: 'telegram',
    });

    return res.status(200).json({ status: 'processed_draft_created', draft });
  } catch (err) {
    console.error('[Telegram Webhook Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
