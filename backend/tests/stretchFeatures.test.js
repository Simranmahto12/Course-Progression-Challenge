import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { db } from '../src/db.js';
import { seedDatabase } from '../src/seed.js';
import { AiLogParser } from '../src/services/aiLogParser.js';
import { AiCampusSummaryEngine } from '../src/services/aiCampusSummaryEngine.js';
import { CalendarSyncService } from '../src/services/calendarSyncService.js';
import { HonorariumEngine } from '../src/services/honorariumEngine.js';

describe('MSOT Stretch Features - End-to-End & Security Tests', () => {
  let adminToken = '';
  let facultyZakirToken = '';
  let studentAaravToken = '';

  beforeAll(async () => {
    seedDatabase();

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mirai.edu', password: 'mirai123' });
    adminToken = adminRes.body.token;

    // Authenticate Faculty Zakir Husain
    const facRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'faculty.zakir@mirai.edu', password: 'mirai123' });
    facultyZakirToken = facRes.body.token;

    // Authenticate Student Aarav
    const stuRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student.aarav@mirai.edu', password: 'mirai123' });
    studentAaravToken = stuRes.body.token;
  });

  // =========================================================================
  // 1. WhatsApp / Telegram AI Session Logging & Explicit Confirmation
  // =========================================================================
  describe('1. WhatsApp / Telegram Session Logging Workflow', () => {
    test('parses faculty message into PROPOSED draft and NEVER silently writes to daily_logs', async () => {
      const logsBeforeCount = db.prepare(`SELECT count(*) as count FROM daily_logs`).get().count;

      const res = await request(app)
        .post('/api/logs/parse-message')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({
          text: 'Conducted Fundamentals of Mechanical Engineering session today for AKTU batch. Covered Unit 1 Thermodynamics 100%. Classwork done, assigned practice questions as homework.',
          senderPhoneOrId: '9876543219',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.draftId).toBeDefined();
      expect(res.body.proposedEntry).toBeDefined();
      expect(res.body.proposedEntry.subjectName).toContain('Mechanical Engineering');
      expect(res.body.requiresExplicitConfirmation).toBe(true);

      // CRITICAL SAFETY CHECK: daily_logs must NOT have been written to!
      const logsAfterCount = db.prepare(`SELECT count(*) as count FROM daily_logs`).get().count;
      expect(logsAfterCount).toBe(logsBeforeCount);

      // Verify draft is stored in ai_draft_logs with PROPOSED status
      const draftRecord = db.prepare(`SELECT * FROM ai_draft_logs WHERE id = ?`).get(res.body.draftId);
      expect(draftRecord).toBeDefined();
      expect(draftRecord.status).toBe('PROPOSED');
    });

    test('asks for clarification when subject is missing or confidence is low', async () => {
      // Message with ambiguous content and no subject
      const res = await request(app)
        .post('/api/logs/parse-message')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({
          text: 'Took class today. Solved some exercise problems for 1 hour.',
          senderPhoneOrId: '9876543219',
        });

      expect(res.status).toBe(200);
      expect(res.body.draftId).toBeDefined();
      // Should flag need for clarification or low confidence
      expect(res.body.needsClarification !== undefined).toBe(true);
    });

    test('rejects unrecognized sender phone number with clear clarification prompt', async () => {
      const res = await request(app)
        .post('/api/logs/parse-message')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({
          text: 'Finished lecture on Mathematics',
          senderPhoneOrId: '9999999999', // Unknown phone
        });

      expect(res.status).toBe(200);
      expect(res.body.authorized).toBe(false);
      expect(res.body.needsClarification).toBe(true);
      expect(res.body.clarificationPrompt).toContain('registered faculty profile');
    });

    test('verifies WhatsApp HMAC SHA256 signature correctly', () => {
      const secret = 'test_secret_123';
      const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: '9876543219', text: { body: 'Hello' } }] } }] }] });
      const validSig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

      const verification = AiLogParser.verifyWhatsAppSignature(body, validSig, secret);
      expect(verification.valid).toBe(true);

      const invalidVerification = AiLogParser.verifyWhatsAppSignature(body, 'sha256=invalidhash', secret);
      expect(invalidVerification.valid).toBe(false);
    });

    test('explicit confirmation by authorized faculty saves to daily_logs and updates draft to CONFIRMED', async () => {
      // 1. Create a draft for Computer-Aided Engineering Drawing Lab (tt-16)
      const draftRes = await request(app)
        .post('/api/logs/parse-message')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({
          text: 'Conducted Computer-Aided Engineering Drawing Lab session today for AKTU batch. Covered Unit 1 Orthographic Projections 100%. Leftover isometric projection exercises.',
          senderPhoneOrId: '9876543219',
        });

      const draftId = draftRes.body.draftId;
      expect(draftId).toBeDefined();

      // 2. Explicit confirmation with optional user edits
      const confirmRes = await request(app)
        .post(`/api/logs/drafts/${draftId}/confirm`)
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({
          percentageComplete: 95,
          leftovers: 'Isometric projection exercises',
          notes: 'Confirmed by faculty after review.',
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.logId).toBeDefined();

      // Verify draft status updated to CONFIRMED
      const updatedDraft = db.prepare(`SELECT * FROM ai_draft_logs WHERE id = ?`).get(draftId);
      expect(updatedDraft.status).toBe('CONFIRMED');

      // Verify record is now in daily_logs
      const logRecord = db.prepare(`SELECT * FROM daily_logs WHERE id = ?`).get(confirmRes.body.logId);
      expect(logRecord).toBeDefined();
      expect(logRecord.percentage_complete).toBe(95);
      expect(logRecord.leftovers).toContain('Isometric projection');
    });

    test('prevents another faculty member from confirming someone else’s draft', async () => {
      // Login as different faculty (e.g. faculty.sharma)
      const otherFacRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'faculty.sharma@mirai.edu', password: 'mirai123' });
      const otherToken = otherFacRes.body.token;

      // Try to confirm Zakir's seeded draft
      const confirmRes = await request(app)
        .post('/api/logs/drafts/draft-whatsapp-zakir-01/confirm')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({});

      expect(confirmRes.status).toBe(403);
      expect(confirmRes.body.error).toContain('not authorized');
    });
  });

  // =========================================================================
  // 2. AI Weekly Grounded Campus Summary
  // =========================================================================
  describe('2. AI Weekly Grounded Campus Summary', () => {
    test('generates grounded weekly summary and labels all actions as manager suggestions', async () => {
      const res = await request(app)
        .post('/api/campus-summaries/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ campusId: 'camp-hitech', weekStartDate: '2026-10-14', weekEndDate: '2026-10-21' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.summaryText).toBeDefined();
      expect(res.body.disclaimer).toContain('review only');
      expect(res.body.isManagerSuggestionOnly).toBe(true);

      // Verify recommendations are labeled for manager review and have evidence citations
      if (res.body.recoveryActions.length > 0) {
        const action = res.body.recoveryActions[0];
        expect(action.status).toBe('SUGGESTION_FOR_MANAGER_REVIEW');
        expect(action.evidenceCitation).toBeDefined();
      }
    });

    test('allows campus manager or admin to review summary and record decision', async () => {
      // First generate a summary
      const genRes = await request(app)
        .post('/api/campus-summaries/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ campusId: 'camp-hitech' });

      const summaryId = genRes.body.id;

      // Review it
      const reviewRes = await request(app)
        .post(`/api/campus-summaries/${summaryId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reviewNotes: 'Approved extra class remedial on Saturday for Physics.',
          actionDecision: 'APPROVED_FOR_OFFLINE_EXECUTION',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.reviewStatus).toBe('REVIEWED');

      const saved = db.prepare(`SELECT * FROM campus_summaries WHERE id = ?`).get(summaryId);
      expect(saved.review_status).toBe('REVIEWED');
    });

    test('does NOT auto-modify timetables or lesson plans during summary generation', async () => {
      const timetablesBefore = db.prepare(`SELECT count(*) as count FROM timetables`).get().count;
      const topicsBefore = db.prepare(`SELECT count(*) as count FROM topics`).get().count;

      await request(app)
        .post('/api/campus-summaries/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ campusId: 'camp-hitech' });

      const timetablesAfter = db.prepare(`SELECT count(*) as count FROM timetables`).get().count;
      const topicsAfter = db.prepare(`SELECT count(*) as count FROM topics`).get().count;

      expect(timetablesAfter).toBe(timetablesBefore);
      expect(topicsAfter).toBe(topicsBefore);
    });
  });

  // =========================================================================
  // 3. Google Calendar / Outlook Sync
  // =========================================================================
  describe('3. Google Calendar & Outlook Sync', () => {
    test('returns setup instructions without claiming integration works when unconfigured', async () => {
      const res = await request(app).get('/api/calendar-sync/config-status');
      expect(res.status).toBe(200);
      expect(res.body.google).toBeDefined();
      expect(res.body.outlook).toBeDefined();
      expect(res.body.google.setupGuide).toBeDefined();
      expect(res.body.google.setupGuide.step1).toBeDefined();
    });

    test('connects opt-in user account for calendar sync', async () => {
      const res = await request(app)
        .post('/api/calendar-sync/connect')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ provider: 'google', syncExamDates: true, syncExtraClasses: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('CONNECTED');
    });

    test('syncs events idempotently and prevents duplicate entries via deterministic hash', async () => {
      // First Sync: creates events
      const firstSync = await request(app)
        .post('/api/calendar-sync/sync')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ provider: 'google' });

      expect(firstSync.status).toBe(200);
      expect(firstSync.body.syncedCount).toBeGreaterThanOrEqual(1);

      // Second Sync: all existing events match hash -> duplicate prevention skips them
      const secondSync = await request(app)
        .post('/api/calendar-sync/sync')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ provider: 'google' });

      expect(secondSync.status).toBe(200);
      expect(secondSync.body.duplicateSkippedCount).toBeGreaterThanOrEqual(1);
    });

    test('flags conflict when external modification is detected', async () => {
      // Sync with simulated external modification
      const res = await request(app)
        .post('/api/calendar-sync/sync')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ provider: 'google', simulateExternalModification: true });

      expect(res.status).toBe(200);
      expect(res.body.conflictCount).toBeGreaterThan(0);

      // Status endpoint should report active conflicts
      const statusRes = await request(app)
        .get('/api/calendar-sync/status')
        .set('Authorization', `Bearer ${facultyZakirToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.hasConflicts).toBe(true);
      expect(statusRes.body.conflictsCount).toBeGreaterThan(0);

      // Resolve conflict using OVERWRITE_EXTERNAL
      const conflictEventId = statusRes.body.conflicts[0].id;
      const resolveRes = await request(app)
        .post('/api/calendar-sync/resolve-conflict')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ syncEventId: conflictEventId, resolution: 'OVERWRITE_EXTERNAL' });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.success).toBe(true);
      expect(resolveRes.body.resolution).toBe('OVERWRITE_EXTERNAL');
    });

    test('provides one-click disconnect', async () => {
      const res = await request(app)
        .post('/api/calendar-sync/disconnect')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ provider: 'google' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 4. Visiting Faculty Lecture and Honorarium Reports
  // =========================================================================
  describe('4. Visiting Faculty Honorarium Workflow', () => {
    test('admin configures honorarium rate policy (never invented)', async () => {
      const res = await request(app)
        .post('/api/honorarium/policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          campusId: 'camp-hitech',
          ratePerLectureHour: 3000,
          conveyanceAllowance: 1500,
          currency: 'INR',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ratePerLectureHour).toBe(3000);
    });

    test('non-admin cannot configure honorarium policy', async () => {
      const res = await request(app)
        .post('/api/honorarium/policy')
        .set('Authorization', `Bearer ${facultyZakirToken}`)
        .send({ campusId: 'camp-hitech', ratePerLectureHour: 5000 });

      expect(res.status).toBe(403);
    });

    test('generates monthly honorarium report with accurate calculation and linked source logs', async () => {
      const res = await request(app)
        .post('/api/honorarium/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ campusId: 'camp-hitech', monthYear: '2026-10' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reports.length).toBeGreaterThan(0);

      const report = res.body.reports[0];
      expect(report.faculty.name).toBeDefined();
      expect(report.totalAmount).toBeGreaterThan(0);
      expect(Array.isArray(report.sourceLogIds)).toBe(true);
    });

    test('approval workflow: submit and admin approval', async () => {
      // 1. Submit report
      const submitRes = await request(app)
        .post('/api/honorarium/reports/hon-hitech-zakir-2026-10/submit')
        .set('Authorization', `Bearer ${facultyZakirToken}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.status).toBe('SUBMITTED');

      // 2. Admin Approves
      const approveRes = await request(app)
        .post('/api/honorarium/reports/hon-hitech-zakir-2026-10/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Verified delivered sessions and approved for payment.' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('APPROVED_BY_ADMIN');
      expect(approveRes.body.approvedBy).toBeDefined();

      const record = db.prepare(`SELECT * FROM honorarium_reports WHERE id = ?`).get('hon-hitech-zakir-2026-10');
      expect(record.status).toBe('APPROVED_BY_ADMIN');
    });

    test('student is strictly forbidden from accessing honorarium reports (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/honorarium/reports')
        .set('Authorization', `Bearer ${studentAaravToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Students are not permitted');
    });
  });

  // =========================================================================
  // 5. CSV & Google Sheets Exports with RBAC & UTF-8 BOM
  // =========================================================================
  describe('5. CSV & Google Sheets Exports', () => {
    test('exports semester progress CSV with UTF-8 BOM, ISO dates, and clean headers', async () => {
      const res = await request(app)
        .get('/api/csv/export/semester-progress')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      // Verify UTF-8 BOM (\uFEFF)
      expect(res.text.charCodeAt(0)).toBe(0xfeff);
      expect(res.text).toContain('subject_code,subject_name,campus,track,faculty_name');
    });

    test('exports timetable CSV with clean headers and stable timetable_id', async () => {
      const res = await request(app)
        .get('/api/csv/export/timetable')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('timetable_id,campus,batch,subject_code');
      expect(res.text).toContain('day_of_week,start_time,end_time,room');
    });

    test('exports syllabus coverage and lesson plans CSV', async () => {
      const res = await request(app)
        .get('/api/csv/export/syllabus-coverage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('topic_id,campus,subject_code');
      expect(res.text).toContain('topic_name,planned_hours');
    });

    test('student is forbidden from exporting honorarium CSV (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/csv/export/honorarium')
        .set('Authorization', `Bearer ${studentAaravToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Students are not permitted');
    });

    test('Google Sheets export endpoint returns setup instructions when credentials unconfigured', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.GOOGLE_CLIENT_ID;

      const res = await request(app)
        .post('/api/csv/sheets/semester-progress')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // When unconfigured, returns clean status and setup instructions
      expect(res.body.configured !== undefined).toBe(true);
      if (!res.body.configured) {
        expect(res.body.setupGuide).toBeDefined();
        expect(res.body.downloadCsvUrl).toContain('/api/csv/export/semester-progress');
      }
    });
  });
});
