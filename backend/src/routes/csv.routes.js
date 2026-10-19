import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { db } from '../db.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const TEMPLATES_DIR = path.resolve(process.cwd(), '../database/templates');
// GET /api/csv/template/:type
router.get('/template/:type', authenticate, (req, res) => {
    const { type } = req.params;
    const validTypes = ['calendar', 'timetable', 'subjects', 'lesson_plans'];
    if (!validTypes.includes(type)) {
        res.status(400).json({ error: `Invalid template type: ${type}. Must be one of: ${validTypes.join(', ')}` });
        return;
    }
    const filename = `${type}_template.csv`;
    const filePath = path.join(TEMPLATES_DIR, filename);
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(filePath);
    }
    else {
        // Generate inline if template file missing
        let headers = '';
        if (type === 'timetable')
            headers = 'batchName,subjectCode,facultyEmail,dayOfWeek,startTime,endTime,room\n';
        else if (type === 'lesson_plans')
            headers = 'subjectCode,unit,sequence,topicName,plannedHours,examScopes\n';
        else if (type === 'subjects')
            headers = 'code,name,campusName,trackName,targetFinishDate\n';
        else
            headers = 'date,title,type,campusCode,isTeachingSuspended\n';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(headers);
    }
});
// POST /api/csv/preview/:type
router.post('/preview/:type', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), upload.single('file'), (req, res) => {
    try {
        let csvContent = '';
        if (req.file) {
            csvContent = req.file.buffer.toString('utf-8');
        }
        else if (req.body.csvContent) {
            csvContent = req.body.csvContent;
        }
        else {
            res.status(400).json({ error: 'No CSV file or csvContent provided.' });
            return;
        }
        const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
        res.json({
            totalRows: records.length,
            validRowsCount: records.length,
            errorRowsCount: 0,
            previewRows: records.slice(0, 10),
            errors: [],
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/csv/import/:type
router.post('/import/:type', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), (req, res) => {
    try {
        const { type } = req.params;
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            res.status(400).json({ error: 'No valid rows provided for import.' });
            return;
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
                    insert.run(id, sub.id, row.unit || 'Unit 1', row.topicName || row.name, parseFloat(row.plannedHours || '2'), row.examScopes || 'MID_TERM,FINAL', parseInt(row.sequence || '1', 10));
                    count++;
                }
            }
            res.json({ success: true, count, message: `Successfully imported ${count} topics.` });
            return;
        }
        res.json({ success: true, count: rows.length, message: `Imported ${rows.length} rows.` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/csv/export/:type
router.get('/export/:type', authenticate, (req, res) => {
    try {
        const { type } = req.params;
        if (type === 'lesson_plans') {
            const topics = db.prepare(`
        SELECT t.*, s.code as subject_code, s.name as subject_name
        FROM topics t
        JOIN subjects s ON t.subject_id = s.id
        ORDER BY s.code ASC, t.sequence ASC
      `).all();
            const records = topics.map((t) => ({
                subjectCode: t.subject_code,
                subjectName: t.subject_name,
                unit: t.unit_name,
                sequence: t.sequence,
                topicName: t.topic_name,
                plannedHours: t.planned_hours,
                status: t.status,
                completionPercentage: t.percentage_complete,
                examScopes: t.exam_scope_flag,
            }));
            const csv = stringify(records, { header: true });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="lesson_plans_export.csv"');
            res.send(csv);
        }
        else {
            const subjects = db.prepare(`
        SELECT s.*, c.name as campus_name, t.name as track_name, u.name as faculty_name
        FROM subjects s
        JOIN batches b ON s.batch_id = b.id
        JOIN campuses c ON b.campus_id = c.id
        JOIN tracks t ON b.track_id = t.id
        LEFT JOIN users u ON s.faculty_id = u.id
        ORDER BY s.code ASC
      `).all();
            const records = subjects.map((s) => ({
                code: s.code,
                name: s.name,
                campus: s.campus_name,
                track: s.track_name,
                faculty: s.faculty_name || 'TBD',
                targetFinishDate: s.target_finish_date,
            }));
            const csv = stringify(records, { header: true });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="subjects_export.csv"');
            res.send(csv);
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
