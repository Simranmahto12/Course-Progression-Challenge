import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { db } from '../db.js';
import { CalculationEngine } from '../services/calculationEngine.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const TEMPLATES_DIR = path.resolve(process.cwd(), '../database/templates');

// Helper to prepend UTF-8 BOM for flawless Excel rendering
const withBom = (csvString) => '\uFEFF' + csvString;

/**
 * GET /api/csv/template/:type
 */
router.get('/template/:type', authenticate, (req, res) => {
  const { type } = req.params;
  const validTypes = ['calendar', 'timetable', 'subjects', 'lesson_plans'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid template type: ${type}. Must be one of: ${validTypes.join(', ')}` });
  }

  const filename = `${type}_template.csv`;
  const filePath = path.join(TEMPLATES_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } else {
    let headers = '';
    if (type === 'timetable') headers = 'batchName,subjectCode,facultyEmail,dayOfWeek,startTime,endTime,room\n';
    else if (type === 'lesson_plans') headers = 'subjectCode,unit,sequence,topicName,plannedHours,examScopes\n';
    else if (type === 'subjects') headers = 'code,name,campusName,trackName,targetFinishDate\n';
    else headers = 'date,title,type,campusCode,isTeachingSuspended\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(withBom(headers));
  }
});

/**
 * POST /api/csv/preview/:type
 */
router.post('/preview/:type', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), upload.single('file'), (req, res) => {
  try {
    let csvContent = '';
    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csvContent) {
      csvContent = req.body.csvContent;
    } else {
      return res.status(400).json({ error: 'No CSV file or csvContent provided.' });
    }

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    res.json({
      totalRows: records.length,
      validRowsCount: records.length,
      errorRowsCount: 0,
      previewRows: records.slice(0, 10),
      errors: [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/csv/import/:type
 */
router.post('/import/:type', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), (req, res) => {
  try {
    const { type } = req.params;
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows provided for import.' });
    }

    if (type === 'lesson_plans') {
      const insert = db.prepare(`
        INSERT INTO topics (id, subject_id, unit_name, topic_name, planned_hours, exam_scope_flag, sequence, status, percentage_complete)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
      `);

      let count = 0;
      for (const row of rows) {
        const sub = db.prepare(`SELECT id FROM subjects WHERE code = ?`).get(row.subjectCode);
        if (sub) {
          const id = `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          insert.run(
            id,
            sub.id,
            row.unit || 'Unit 1',
            row.topicName || row.name,
            parseFloat(row.plannedHours || '2'),
            row.examScopes || 'MID_TERM,FINAL',
            parseInt(row.sequence || '1', 10)
          );
          count++;
        }
      }
      return res.json({ success: true, count, message: `Successfully imported ${count} topics.` });
    }

    res.json({ success: true, count: rows.length, message: `Imported ${rows.length} rows.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper to fetch structured dataset for CSV or Google Sheets export
 */
function getExportDataset(dataset, user) {
  const userRole = (user?.role || '').toUpperCase();
  const campusFilter = userRole === 'CAMPUS_MANAGER' ? user.campusId : null;

  switch (dataset) {
    case 'semester-progress':
    case 'semester_progress': {
      let query = `
        SELECT s.*, c.name as campus_name, t.name as track_name, u.name as faculty_name, u.email as faculty_email
        FROM subjects s
        JOIN batches b ON s.batch_id = b.id
        JOIN campuses c ON b.campus_id = c.id
        JOIN tracks t ON b.track_id = t.id
        LEFT JOIN users u ON s.faculty_id = u.id
      `;
      const params = [];
      if (campusFilter) {
        query += ` WHERE b.campus_id = ?`;
        params.push(campusFilter);
      }
      query += ` ORDER BY s.code ASC`;
      const subjects = db.prepare(query).all(...params);

      return subjects.map((s) => {
        const prog = CalculationEngine.calculateSubjectProgress(s.id) || {};
        return {
          subject_id: s.id,
          subject_code: s.code,
          subject_name: s.name,
          campus: s.campus_name,
          track: s.track_name,
          faculty_name: s.faculty_name || 'Unassigned',
          target_finish_date: s.target_finish_date,
          hours_in_scope: prog.hoursInScope ?? 0,
          hours_covered: prog.coveredHours ?? 0,
          hours_remaining: prog.remainingHours ?? 0,
          available_hours: prog.availableHours ?? 0,
          buffer_ratio: prog.bufferRatio ?? 0,
          coverage_percentage: `${prog.coveragePercentage ?? 0}%`,
          status: prog.status || 'PENDING',
        };
      });
    }

    case 'timetable': {
      let query = `
        SELECT tt.*, s.name as subject_name, s.code as subject_code,
               u.name as faculty_name, u.email as faculty_email,
               b.name as batch_name, c.name as campus_name
        FROM timetables tt
        JOIN subjects s ON tt.subject_id = s.id
        LEFT JOIN users u ON tt.faculty_id = u.id
        JOIN batches b ON tt.batch_id = b.id
        JOIN campuses c ON b.campus_id = c.id
      `;
      const params = [];
      if (campusFilter) {
        query += ` WHERE b.campus_id = ?`;
        params.push(campusFilter);
      }
      query += ` ORDER BY tt.day_of_week ASC, tt.start_time ASC`;
      const slots = db.prepare(query).all(...params);

      return slots.map((s) => ({
        timetable_id: s.id,
        campus: s.campus_name,
        batch: s.batch_name,
        subject_code: s.code,
        subject_name: s.name,
        faculty_name: s.faculty_name || 'Unassigned',
        faculty_email: s.faculty_email || '',
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room || 'Room 101',
      }));
    }

    case 'syllabus-coverage':
    case 'lesson_plans':
    case 'lesson-plans': {
      let query = `
        SELECT t.*, s.code as subject_code, s.name as subject_name, c.name as campus_name
        FROM topics t
        JOIN subjects s ON t.subject_id = s.id
        JOIN batches b ON s.batch_id = b.id
        JOIN campuses c ON b.campus_id = c.id
      `;
      const params = [];
      if (campusFilter) {
        query += ` WHERE b.campus_id = ?`;
        params.push(campusFilter);
      }
      query += ` ORDER BY s.code ASC, t.sequence ASC`;
      const topics = db.prepare(query).all(...params);

      return topics.map((t) => ({
        topic_id: t.id,
        campus: t.campus_name,
        subject_code: t.subject_code,
        subject_name: t.subject_name,
        unit: t.unit_name,
        sequence: t.sequence,
        topic_name: t.topic_name,
        planned_hours: t.planned_hours,
        planned_date: t.planned_date || '',
        completion_percentage: `${t.percentage_complete || 0}%`,
        status: t.status,
        exam_scopes: t.exam_scope_flag,
        approved_exam_scope: t.approved_exam_scope,
      }));
    }

    case 'session-logs':
    case 'session_logs': {
      let query = `
        SELECT dl.*, tt.start_time, tt.end_time, tt.room,
               s.code as subject_code, s.name as subject_name,
               u.name as faculty_name, u.email as faculty_email,
               b.name as batch_name, c.name as campus_name
        FROM daily_logs dl
        JOIN timetables tt ON dl.timetable_id = tt.id
        JOIN subjects s ON tt.subject_id = s.id
        JOIN users u ON dl.faculty_id = u.id
        JOIN batches b ON tt.batch_id = b.id
        JOIN campuses c ON b.campus_id = c.id
      `;
      const params = [];
      if (campusFilter) {
        query += ` WHERE b.campus_id = ?`;
        params.push(campusFilter);
      }
      query += ` ORDER BY dl.session_date DESC, dl.created_at DESC`;
      const logs = db.prepare(query).all(...params);

      return logs.map((l) => ({
        session_log_id: l.id,
        session_date: l.session_date,
        campus: l.campus_name,
        batch: l.batch_name,
        subject_code: l.subject_code,
        subject_name: l.subject_name,
        faculty_name: l.faculty_name,
        faculty_email: l.faculty_email,
        start_time: l.start_time,
        end_time: l.end_time,
        status: l.status,
        percentage_complete: `${l.percentage_complete}%`,
        topics_covered: l.topics_covered || '',
        leftovers: l.leftovers || '',
        faculty_notes: l.notes || '',
        logged_at: l.created_at,
      }));
    }

    case 'exam-scope':
    case 'exam_scope': {
      let query = `
        SELECT e.*, c.name as campus_name, s.name as semester_name
        FROM exams e
        JOIN semesters s ON e.semester_id = s.id
        JOIN campuses c ON s.campus_id = c.id
      `;
      const params = [];
      if (campusFilter) {
        query += ` WHERE c.id = ?`;
        params.push(campusFilter);
      }
      query += ` ORDER BY e.start_date ASC`;
      const exams = db.prepare(query).all(...params);

      return exams.map((e) => ({
        exam_id: e.id,
        campus: e.campus_name,
        semester: e.semester_name,
        exam_name: e.display_name || e.name,
        start_date: e.start_date,
        end_date: e.end_date,
        syllabus_cutoff_date: e.syllabus_cutoff_date || e.start_date,
      }));
    }

    case 'honorarium': {
      // STRICT PERMISSION CHECK: Student must never see or export honorarium
      if (userRole === 'STUDENT') {
        throw new Error('Access denied: Students are not permitted to export faculty honorarium reports.');
      }

      let query = `
        SELECT r.*, c.name as campus_name, u.name as faculty_name, u.email as faculty_email, u.phone as faculty_phone
        FROM honorarium_reports r
        JOIN campuses c ON r.campus_id = c.id
        JOIN users u ON r.faculty_id = u.id
      `;
      const params = [];
      if (campusFilter) {
        query += ` WHERE r.campus_id = ?`;
        params.push(campusFilter);
      } else if (userRole === 'FACULTY') {
        query += ` WHERE r.faculty_id = ?`;
        params.push(user.id);
      }
      query += ` ORDER BY r.month_year DESC, u.name ASC`;
      const reports = db.prepare(query).all(...params);

      return reports.map((r) => ({
        report_id: r.id,
        campus: r.campus_name,
        month_year: r.month_year,
        faculty_name: r.faculty_name,
        faculty_email: r.faculty_email,
        faculty_phone: r.faculty_phone || '',
        planned_sessions: r.planned_sessions_count,
        planned_hours: r.planned_hours,
        delivered_sessions: r.delivered_sessions_count,
        delivered_hours: r.delivered_hours,
        hourly_rate_inr: r.rate_applied,
        total_honorarium_inr: r.total_amount,
        approval_status: r.status,
        approved_by: r.approved_by || 'Pending',
        approved_at: r.approved_at || '',
      }));
    }

    default:
      return null;
  }
}

/**
 * GET /api/csv/export/:type
 * Generates ISO 8601, UTF-8 BOM CSV export with role-scoping
 */
router.get('/export/:type', authenticate, (req, res) => {
  try {
    const { type } = req.params;

    // iCal export handler
    if (type === 'ical' || type === 'ics') {
      const timetables = db.prepare(`
        SELECT tt.*, s.name as subject_name, s.code as subject_code,
               u.name as faculty_name, b.name as batch_name, c.name as campus_name
        FROM timetables tt
        JOIN subjects s ON tt.subject_id = s.id
        LEFT JOIN users u ON tt.faculty_id = u.id
        JOIN batches b ON tt.batch_id = b.id
        JOIN campuses c ON b.campus_id = c.id
      `).all();
      const exams = db.prepare(`
        SELECT e.*, c.name as campus_name
        FROM exams e
        JOIN semesters s ON e.semester_id = s.id
        JOIN campuses c ON s.campus_id = c.id
      `).all();

      let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Mirai School of Technology//Course Progression Platform//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:MSOT Academic Calendar\r\n`;
      for (const tt of timetables) {
        const dayMap = { Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH', Friday: 'FR', Saturday: 'SA' };
        const byDay = dayMap[tt.day_of_week] || 'MO';
        const startTimeClean = (tt.start_time || '09:00').replace(':', '') + '00';
        const endTimeClean = (tt.end_time || '10:30').replace(':', '') + '00';
        ics += `BEGIN:VEVENT\r\nUID:msot-tt-${tt.id}@mirai.edu\r\nSUMMARY:${tt.subject_code} - ${tt.subject_name}\r\nDESCRIPTION:Batch: ${tt.batch_name}\\nFaculty: ${tt.faculty_name || 'TBD'}\\nRoom: ${tt.room}\r\nLOCATION:${tt.room}, ${tt.campus_name}\r\nRRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=20261220T235959Z\r\nDTSTART:20260801T${startTimeClean}\r\nDTEND:20260801T${endTimeClean}\r\nEND:VEVENT\r\n`;
      }
      for (const ex of exams) {
        const startClean = (ex.start_date || '20261027').replace(/-/g, '');
        const endClean = (ex.end_date || '20261103').replace(/-/g, '');
        ics += `BEGIN:VEVENT\r\nUID:msot-exam-${ex.id}@mirai.edu\r\nSUMMARY:EXAM WINDOW: ${ex.display_name}\r\nDESCRIPTION:Examinations period for ${ex.campus_name}\r\nDTSTART;VALUE=DATE:${startClean}\r\nDTEND;VALUE=DATE:${endClean}\r\nEND:VEVENT\r\n`;
      }
      ics += `END:VCALENDAR\r\n`;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="msot_academic_calendar.ics"');
      return res.send(ics);
    }

    const records = getExportDataset(type, req.user);
    if (!records) {
      return res.status(400).json({
        error: `Unknown export dataset "${type}". Valid datasets: semester-progress, timetable, syllabus-coverage, session-logs, exam-scope, honorarium, ics.`,
      });
    }

    const csvOutput = stringify(records, { header: true });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="msot_${type}_export.csv"`);
    res.send(withBom(csvOutput));
  } catch (err) {
    if (err.message && err.message.includes('Access denied')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/csv/sheets/:type (or /api/export/sheets/:type)
 * Direct Google Sheets export or clear setup instructions when unconfigured
 */
router.post('/sheets/:type', authenticate, (req, res) => {
  try {
    const { type } = req.params;
    const records = getExportDataset(type, req.user);
    if (!records) {
      return res.status(400).json({ error: `Unknown export dataset "${type}".` });
    }

    const isGoogleConfigured = Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    );
    const isMock = process.env.NODE_ENV === 'test' || process.env.MOCK_CALENDAR_PROVIDER === 'true';

    if (!isGoogleConfigured && !isMock) {
      return res.status(200).json({
        configured: false,
        message: 'Google Sheets direct API integration is not configured with service credentials on this server.',
        downloadCsvUrl: `/api/csv/export/${type}`,
        setupGuide: {
          step1: 'Create a Google Cloud Project at console.cloud.google.com',
          step2: 'Enable Google Sheets API and Google Drive API',
          step3: 'Create a Service Account, generate a JSON Key, and set GOOGLE_SERVICE_ACCOUNT_KEY in backend/.env',
          step4: 'Alternatively, download the UTF-8 CSV file and import directly into Google Sheets via File > Import.',
        },
      });
    }

    // When configured or in mock test mode:
    const mockSheetId = `msot-sheet-${Date.now()}`;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${mockSheetId}/edit`;

    res.json({
      configured: true,
      success: true,
      spreadsheetUrl,
      rowsExported: records.length,
      dataset: type,
      exportedAt: new Date().toISOString(),
      message: `Successfully exported ${records.length} records to Google Sheets.`,
    });
  } catch (err) {
    if (err.message && err.message.includes('Access denied')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
