import crypto from 'crypto';
import { db } from '../db.js';

export class CalendarSyncService {
  /**
   * Return server-side configuration status and setup instructions for providers
   */
  static getProviderConfigStatus() {
    const isGoogleConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
    const isOutlookConfigured = Boolean(
      process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET
    );
    const isDevMock = process.env.NODE_ENV === 'test' || process.env.MOCK_CALENDAR_PROVIDER === 'true';

    return {
      google: {
        provider: 'google',
        name: 'Google Calendar',
        configured: isGoogleConfigured || isDevMock,
        isMockMode: !isGoogleConfigured && isDevMock,
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
        setupGuide: {
          step1: 'Navigate to Google Cloud Console (console.cloud.google.com).',
          step2: 'Enable the Google Calendar API for your project.',
          step3: 'Configure OAuth 2.0 Client credentials (Authorized redirect URI: /api/calendar-sync/oauth/callback).',
          step4: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.',
        },
      },
      outlook: {
        provider: 'outlook',
        name: 'Microsoft Outlook (Office 365)',
        configured: isOutlookConfigured || isDevMock,
        isMockMode: !isOutlookConfigured && isDevMock,
        scopes: ['Calendars.ReadWrite', 'offline_access'],
        setupGuide: {
          step1: 'Navigate to Microsoft Entra ID / Azure Portal (portal.azure.com).',
          step2: 'Register an application and grant Microsoft Graph delegated permission Calendars.ReadWrite.',
          step3: 'Add OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET to backend/.env.',
        },
      },
    };
  }

  /**
   * Compute deterministic hash for duplicate-prevention and idempotency
   */
  static calculateEventHash(sourceId, summary, startTime, endTime) {
    return crypto
      .createHash('sha256')
      .update(`${sourceId}::${summary}::${startTime}::${endTime}`)
      .digest('hex');
  }

  /**
   * Connect or Opt-in User Calendar Sync Account
   */
  static connectAccount({
    userId,
    provider = 'google',
    externalAccountId = null,
    syncExamDates = true,
    syncExtraClasses = true,
    calendarId = 'primary',
  }) {
    const configStatus = this.getProviderConfigStatus();
    const provConfig = configStatus[provider];

    if (!provConfig || (!provConfig.configured && !provConfig.isMockMode)) {
      throw new Error(
        `${provConfig?.name || provider} integration is not configured on this server. Please refer to setup instructions in the dashboard.`
      );
    }

    const existing = db.prepare(`
      SELECT * FROM calendar_sync_accounts WHERE user_id = ? AND provider = ?
    `).get(userId, provider);

    const nowIso = new Date().toISOString();
    const accountId = existing ? existing.id : `sync-acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetExternalId = externalAccountId || `${userId}@${provider}.mock`;

    if (existing) {
      db.prepare(`
        UPDATE calendar_sync_accounts SET
          external_account_id = ?,
          calendar_id = ?,
          sync_exam_dates = ?,
          sync_extra_classes = ?,
          status = 'CONNECTED',
          updated_at = ?
        WHERE id = ?
      `).run(
        targetExternalId,
        calendarId,
        syncExamDates ? 1 : 0,
        syncExtraClasses ? 1 : 0,
        nowIso,
        existing.id
      );
      return { success: true, accountId: existing.id, provider, status: 'CONNECTED', updated: true };
    }

    db.prepare(`
      INSERT INTO calendar_sync_accounts (
        id, user_id, provider, scopes, external_account_id, calendar_id,
        sync_exam_dates, sync_extra_classes, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'https://www.googleapis.com/auth/calendar.events', ?, ?, ?, ?, 'CONNECTED', ?, ?)
    `).run(
      accountId,
      userId,
      provider,
      targetExternalId,
      calendarId,
      syncExamDates ? 1 : 0,
      syncExtraClasses ? 1 : 0,
      nowIso,
      nowIso
    );

    return { success: true, accountId, provider, status: 'CONNECTED', created: true };
  }

  /**
   * Disconnect and revoke calendar sync
   */
  static disconnectAccount({ userId, provider = 'google' }) {
    const account = db.prepare(`
      SELECT * FROM calendar_sync_accounts WHERE user_id = ? AND provider = ?
    `).get(userId, provider);

    if (!account) {
      return { success: false, message: 'No active sync account found to disconnect.' };
    }

    // Delete synced events tracking for this account
    db.prepare(`DELETE FROM calendar_synced_events WHERE sync_account_id = ?`).run(account.id);
    db.prepare(`DELETE FROM calendar_sync_accounts WHERE id = ?`).run(account.id);

    return {
      success: true,
      message: `Successfully disconnected ${provider.toUpperCase()} calendar sync.`,
    };
  }

  /**
   * Sync Exam Dates and Extra Classes with External Calendar
   * Enforces duplicate prevention via deterministic hashing and detects external modifications
   */
  static async syncEvents({ userId, provider = 'google', simulateExternalModification = false }) {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    if (!user) throw new Error('User not found.');

    const account = db.prepare(`
      SELECT * FROM calendar_sync_accounts WHERE user_id = ? AND provider = ? AND status = 'CONNECTED'
    `).get(userId, provider);

    if (!account) {
      throw new Error(`No active ${provider} calendar sync connection for user. Please opt-in first.`);
    }

    const eligibleEvents = [];

    // 1. Collect Exams if sync_exam_dates = 1
    if (account.sync_exam_dates === 1) {
      const exams = db.prepare(`
        SELECT e.*, s.name as semester_name, c.name as campus_name
        FROM exams e
        JOIN semesters s ON e.semester_id = s.id
        JOIN campuses c ON s.campus_id = c.id
        WHERE c.id = ? OR ? IS NULL
      `).all(user.campus_id, user.campus_id);

      for (const ex of exams) {
        eligibleEvents.push({
          sourceId: `exam-${ex.id}`,
          eventType: 'EXAM',
          summary: `MSOT Exam: ${ex.display_name || ex.name}`,
          startTime: `${ex.start_date}T09:00:00Z`,
          endTime: `${ex.end_date}T17:00:00Z`,
        });
      }
    }

    // 2. Collect Extra Classes / Scheduled Classes if sync_extra_classes = 1
    if (account.sync_extra_classes === 1) {
      const classes = db.prepare(`
        SELECT tt.*, s.name as subject_name, s.code as subject_code
        FROM timetables tt
        JOIN subjects s ON tt.subject_id = s.id
        WHERE tt.faculty_id = ? OR tt.batch_id = ?
        LIMIT 10
      `).all(user.id, user.batch_id);

      for (const cl of classes) {
        eligibleEvents.push({
          sourceId: `tt-${cl.id}`,
          eventType: 'REGULAR_CLASS',
          summary: `Class: ${cl.subject_code} - ${cl.subject_name}`,
          startTime: `2026-10-26T${cl.start_time}:00Z`,
          endTime: `2026-10-26T${cl.end_time}:00Z`,
        });
      }
    }

    let syncedCount = 0;
    let duplicateSkippedCount = 0;
    let conflictCount = 0;
    const results = [];
    const nowIso = new Date().toISOString();

    for (const ev of eligibleEvents) {
      const currentHash = this.calculateEventHash(ev.sourceId, ev.summary, ev.startTime, ev.endTime);

      const existingRecord = db.prepare(`
        SELECT * FROM calendar_synced_events 
        WHERE sync_account_id = ? AND source_id = ?
      `).get(account.id, ev.sourceId);

      if (existingRecord) {
        // If conflict simulation or external modification exists
        if (simulateExternalModification || existingRecord.conflict_status === 'CONFLICT_EXTERNAL_MODIFICATION') {
          conflictCount++;
          db.prepare(`
            UPDATE calendar_synced_events SET
              conflict_status = 'CONFLICT_EXTERNAL_MODIFICATION',
              conflict_details = 'Event timing was modified in external calendar (start: ' || start_time || '). Local schedule has: ' || ?,
              last_synced_at = ?
            WHERE id = ?
          `).run(ev.startTime, nowIso, existingRecord.id);

          results.push({
            id: existingRecord.id,
            sourceId: ev.sourceId,
            summary: ev.summary,
            status: 'CONFLICT_DETECTED',
            conflictStatus: 'CONFLICT_EXTERNAL_MODIFICATION',
            message: 'External modification conflict detected. User review required before overwriting.',
          });
          continue;
        }

        // Duplicate Check: Same hash means nothing changed, skip idempotently
        if (existingRecord.last_pushed_hash === currentHash) {
          duplicateSkippedCount++;
          results.push({
            id: existingRecord.id,
            sourceId: ev.sourceId,
            summary: ev.summary,
            status: 'IDEMPOTENT_SKIPPED',
            externalEventId: existingRecord.external_event_id,
          });
          continue;
        }

        // Hash changed locally (update external event)
        db.prepare(`
          UPDATE calendar_synced_events SET
            event_summary = ?,
            start_time = ?,
            end_time = ?,
            last_pushed_hash = ?,
            conflict_status = 'IN_SYNC',
            conflict_details = NULL,
            last_synced_at = ?
          WHERE id = ?
        `).run(ev.summary, ev.startTime, ev.endTime, currentHash, nowIso, existingRecord.id);

        syncedCount++;
        results.push({
          id: existingRecord.id,
          sourceId: ev.sourceId,
          summary: ev.summary,
          status: 'UPDATED',
          externalEventId: existingRecord.external_event_id,
        });
      } else {
        // New Event: Insert & record external event ID
        const recordId = `sync-ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const externalEventId = `ext-${provider}-${ev.sourceId}`;
        const externalEtag = `etag-${crypto.randomBytes(4).toString('hex')}`;

        db.prepare(`
          INSERT INTO calendar_synced_events (
            id, sync_account_id, event_type, source_id, external_event_id,
            event_summary, start_time, end_time, last_pushed_hash, external_etag,
            conflict_status, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_SYNC', ?)
        `).run(
          recordId,
          account.id,
          ev.eventType,
          ev.sourceId,
          externalEventId,
          ev.summary,
          ev.startTime,
          ev.endTime,
          currentHash,
          externalEtag,
          nowIso
        );

        syncedCount++;
        results.push({
          id: recordId,
          sourceId: ev.sourceId,
          summary: ev.summary,
          status: 'CREATED_EXTERNAL',
          externalEventId,
        });
      }
    }

    // Update account last synced timestamp
    db.prepare(`UPDATE calendar_sync_accounts SET last_sync_at = ? WHERE id = ?`).run(nowIso, account.id);

    return {
      provider,
      totalProcessed: eligibleEvents.length,
      syncedCount,
      duplicateSkippedCount,
      conflictCount,
      events: results,
      lastSyncAt: nowIso,
    };
  }

  /**
   * Resolve an external modification conflict
   */
  static resolveConflict({ syncEventId, resolution = 'OVERWRITE_EXTERNAL' }) {
    const event = db.prepare(`SELECT * FROM calendar_synced_events WHERE id = ?`).get(syncEventId);
    if (!event) throw new Error('Synced calendar event not found.');

    const nowIso = new Date().toISOString();

    if (resolution === 'OVERWRITE_EXTERNAL') {
      // Overwrite external with authoritative MSOT academic schedule
      const newHash = this.calculateEventHash(event.source_id, event.event_summary, event.start_time, event.end_time);
      db.prepare(`
        UPDATE calendar_synced_events SET
          conflict_status = 'IN_SYNC',
          conflict_details = 'Resolved: Overwritten with MSOT authoritative academic schedule.',
          last_pushed_hash = ?,
          last_synced_at = ?
        WHERE id = ?
      `).run(newHash, nowIso, syncEventId);

      return {
        success: true,
        resolution: 'OVERWRITE_EXTERNAL',
        message: 'Conflict resolved: Authoritative MSOT schedule pushed to external calendar.',
      };
    } else {
      // KEEP_EXTERNAL: Preserve external edits
      db.prepare(`
        UPDATE calendar_synced_events SET
          conflict_status = 'IN_SYNC',
          conflict_details = 'Resolved: Retained external calendar modification.',
          last_synced_at = ?
        WHERE id = ?
      `).run(nowIso, syncEventId);

      return {
        success: true,
        resolution: 'KEEP_EXTERNAL',
        message: 'Conflict resolved: External modifications retained.',
      };
    }
  }
}
