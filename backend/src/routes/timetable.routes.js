import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
/**
 * POST /api/timetables
 * Upload or create weekly timetable entries
 */
router.post('/', authenticate, (req, res) => {
    try {
        const { id = `tt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, room = 'Room 101', } = req.body;
        if (!batch_id || !subject_id || !faculty_id || !day_of_week || !start_time || !end_time) {
            res.status(400).json({
                error: 'batch_id, subject_id, faculty_id, day_of_week, start_time, and end_time are required.',
            });
            return;
        }
        // Insert entry
        db.prepare(`
      INSERT INTO timetables (id, batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, room);
        const created = db.prepare(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             u.name as faculty_name, b.name as batch_name, c.name as campus_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN users u ON tt.faculty_id = u.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE tt.id = ?
    `).get(id);
        res.status(201).json({
            message: 'Timetable slot created successfully.',
            slot: created,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create timetable slot.' });
    }
});
/**
 * GET /api/timetables
 * Retrieve timetable entries, filterable by campusId, batchId, or facultyId
 */
router.get('/', authenticate, (req, res) => {
    try {
        const { campusId, batchId, facultyId } = req.query;
        let query = `
      SELECT tt.*, s.name as subject_name, s.code as subject_code, s.color as subject_color,
             u.name as faculty_name, u.email as faculty_email,
             b.name as batch_name, b.id as batch_id,
             c.name as campus_name, c.id as campus_id
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN users u ON tt.faculty_id = u.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE 1=1
    `;
        const params = [];
        if (campusId) {
            query += ` AND c.id = ?`;
            params.push(campusId);
        }
        if (batchId) {
            query += ` AND b.id = ?`;
            params.push(batchId);
        }
        if (facultyId) {
            query += ` AND tt.faculty_id = ?`;
            params.push(facultyId);
        }
        query += ` ORDER BY 
      CASE tt.day_of_week 
        WHEN 'Monday' THEN 1 
        WHEN 'Tuesday' THEN 2 
        WHEN 'Wednesday' THEN 3 
        WHEN 'Thursday' THEN 4 
        WHEN 'Friday' THEN 5 
        WHEN 'Saturday' THEN 6 
        ELSE 7 
      END, tt.start_time ASC`;
        const entries = db.prepare(query).all(...params);
        // Structure for frontend timetable view
        const formatted = entries.map((e) => ({
            id: e.id,
            dayOfWeek: e.day_of_week,
            startTime: e.start_time,
            endTime: e.end_time,
            room: e.room,
            subjectId: e.subject_id,
            subject: {
                id: e.subject_id,
                code: e.subject_code,
                name: e.subject_name,
                color: e.subject_color,
            },
            faculty: {
                id: e.faculty_id,
                name: e.faculty_name,
                email: e.faculty_email,
            },
            batch: {
                id: e.batch_id,
                name: e.batch_name,
            },
            campus: {
                id: e.campus_id,
                name: e.campus_name,
            },
        }));
        res.json({ entries: formatted });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * DELETE /api/timetables/:id
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        db.prepare(`DELETE FROM timetables WHERE id = ?`).run(id);
        res.json({ success: true, message: 'Timetable entry deleted.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
