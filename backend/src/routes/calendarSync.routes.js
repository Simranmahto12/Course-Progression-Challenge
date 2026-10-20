import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { CalendarSyncService } from '../services/calendarSyncService.js';

const router = Router();

/**
 * GET /api/calendar-sync/config-status
 * Check backend integration credentials and setup instructions
 */
router.get('/config-status', (_req, res) => {
  try {
    const configStatus = CalendarSyncService.getProviderConfigStatus();
    res.json(configStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/calendar-sync/status
 * Get current user's sync accounts and synced events
 */
router.get('/status', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = db.prepare(`
      SELECT * FROM calendar_sync_accounts WHERE user_id = ?
    `).all(userId);

    const accountIds = accounts.map((a) => a.id);
    let events = [];
    if (accountIds.length > 0) {
      events = db.prepare(`
        SELECT * FROM calendar_synced_events 
        WHERE sync_account_id IN (${accountIds.map(() => '?').join(',')})
        ORDER BY last_synced_at DESC
      `).all(...accountIds);
    }

    const conflicts = events.filter((e) => e.conflict_status === 'CONFLICT_EXTERNAL_MODIFICATION');

    res.json({
      connectedAccounts: accounts,
      totalSyncedEvents: events.length,
      conflictsCount: conflicts.length,
      hasConflicts: conflicts.length > 0,
      conflicts,
      events,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/calendar-sync/connect
 * Opt-in to sync Google or Outlook calendar
 */
router.post('/connect', authenticate, (req, res) => {
  try {
    const { provider = 'google', syncExamDates = true, syncExtraClasses = true, calendarId } = req.body;
    const result = CalendarSyncService.connectAccount({
      userId: req.user.id,
      provider,
      syncExamDates,
      syncExtraClasses,
      calendarId,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/calendar-sync/sync
 * Run sync now
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { provider = 'google', simulateExternalModification = false } = req.body;
    const result = await CalendarSyncService.syncEvents({
      userId: req.user.id,
      provider,
      simulateExternalModification,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/calendar-sync/resolve-conflict
 */
router.post('/resolve-conflict', authenticate, (req, res) => {
  try {
    const { syncEventId, resolution = 'OVERWRITE_EXTERNAL' } = req.body;
    if (!syncEventId) {
      return res.status(400).json({ error: 'syncEventId is required.' });
    }
    const result = CalendarSyncService.resolveConflict({ syncEventId, resolution });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/calendar-sync/disconnect
 * One-click disconnect
 */
router.post('/disconnect', authenticate, (req, res) => {
  try {
    const { provider = 'google' } = req.body;
    const result = CalendarSyncService.disconnectAccount({
      userId: req.user.id,
      provider,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

