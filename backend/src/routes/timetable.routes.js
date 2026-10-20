import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Helper to check collisions for faculty, room, and batch
 */
function findTimetableCollisions({ id = '', batch_id, faculty_id, room, day_of_week, start_time, end_time }) {
  const collisions = [];

  // 1. Faculty collision check
  const facultyConflict = db.prepare(`
    SELECT tt.*, u.name as faculty_name, s.name as subject_name, b.name as batch_name
    FROM timetables tt
    JOIN subjects s ON tt.subject_id = s.id
    JOIN batches b ON tt.batch_id = b.id
    LEFT JOIN users u ON tt.faculty_id = u.id
    WHERE tt.faculty_id = ?
      AND tt.day_of_week = ?
      AND tt.id != ?
      AND NOT (tt.end_time <= ? OR tt.start_time >= ?)
    LIMIT 1
  `).get(faculty_id, day_of_week, id, start_time, end_time);

  if (facultyConflict) {
    collisions.push({
      type: 'FACULTY_COLLISION',
      message: `Faculty member "${facultyConflict.faculty_name || 'Assigned Faculty'}" already has a session scheduled for "${facultyConflict.subject_name}" (${facultyConflict.start_time} - ${facultyConflict.end_time}) on ${day_of_week}.`,
      conflictingSlot: facultyConflict,
    });
  }

  // 2. Room collision check
  if (room) {
    const roomConflict = db.prepare(`
      SELECT tt.*, s.name as subject_name, b.name as batch_name, u.name as faculty_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN batches b ON tt.batch_id = b.id
      LEFT JOIN users u ON tt.faculty_id = u.id
      WHERE tt.room = ?
        AND tt.day_of_week = ?
        AND tt.id != ?
        AND NOT (tt.end_time <= ? OR tt.start_time >= ?)
      LIMIT 1
    `).get(room, day_of_week, id, start_time, end_time);

    if (roomConflict) {
      collisions.push({
        type: 'ROOM_COLLISION',
        message: `Room "${room}" is already reserved for "${roomConflict.subject_name}" (${roomConflict.batch_name}) from ${roomConflict.start_time} to ${roomConflict.end_time} on ${day_of_week}.`,
        conflictingSlot: roomConflict,
      });
    }
  }

  // 3. Batch collision check
  const batchConflict = db.prepare(`
    SELECT tt.*, s.name as subject_name, u.name as faculty_name, tt.room
    FROM timetables tt
    JOIN subjects s ON tt.subject_id = s.id
    LEFT JOIN users u ON tt.faculty_id = u.id
    WHERE tt.batch_id = ?
      AND tt.day_of_week = ?
      AND tt.id != ?
      AND NOT (tt.end_time <= ? OR tt.start_time >= ?)
    LIMIT 1
  `).get(batch_id, day_of_week, id, start_time, end_time);

  if (batchConflict) {
    collisions.push({
      type: 'BATCH_COLLISION',
      message: `Batch is already scheduled for "${batchConflict.subject_name}" with ${batchConflict.faculty_name} in ${batchConflict.room} (${batchConflict.start_time} - ${batchConflict.end_time}) on ${day_of_week}.`,
      conflictingSlot: batchConflict,
    });
  }

  return collisions;
}

/**
 * POST /api/timetables
 * Create weekly timetable entry with strict collision prevention
 */
router.post('/', authenticate, (req, res) => {
  try {
    const {
      id = `tt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      batch_id,
      subject_id,
      faculty_id,
      day_of_week,
      start_time,
      end_time,
      room = 'Room 101',
    } = req.body;

    if (!batch_id || !subject_id || !faculty_id || !day_of_week || !start_time || !end_time) {
      res.status(400).json({
        error: 'batch_id, subject_id, faculty_id, day_of_week, start_time, and end_time are required.',
      });
      return;
    }

    // Check time format validity
    if (start_time >= end_time) {
      res.status(400).json({
        error: 'Session start_time must be strictly earlier than end_time.',
      });
      return;
    }

    // Overlap and Collision Prevention
    const collisions = findTimetableCollisions({
      id,
      batch_id,
      faculty_id,
      room,
      day_of_week,
      start_time,
      end_time,
    });

    if (collisions.length > 0) {
      res.status(409).json({
        error: 'Timetable collision detected. Please resolve the schedule conflict.',
        collisions,
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
      LEFT JOIN users u ON tt.faculty_id = u.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE tt.id = ?
    `).get(id);

    res.status(201).json({
      message: 'Timetable slot created successfully.',
      slot: created,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create timetable slot.' });
  }
});

/**
 * PUT /api/timetables/:id
 * Update weekly timetable entry with collision prevention
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM timetables WHERE id = ?`).get(id);
    if (!existing) {
      res.status(404).json({ error: 'Timetable entry not found.' });
      return;
    }

    const {
      batch_id = existing.batch_id,
      subject_id = existing.subject_id,
      faculty_id = existing.faculty_id,
      day_of_week = existing.day_of_week,
      start_time = existing.start_time,
      end_time = existing.end_time,
      room = existing.room,
    } = req.body;

    if (start_time >= end_time) {
      res.status(400).json({
        error: 'Session start_time must be strictly earlier than end_time.',
      });
      return;
    }

    const collisions = findTimetableCollisions({
      id,
      batch_id,
      faculty_id,
      room,
      day_of_week,
      start_time,
      end_time,
    });

    if (collisions.length > 0) {
      res.status(409).json({
        error: 'Timetable collision detected. Please resolve the schedule conflict.',
        collisions,
      });
      return;
    }

    db.prepare(`
      UPDATE timetables
      SET batch_id = ?, subject_id = ?, faculty_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ?
      WHERE id = ?
    `).run(batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, room, id);

    const updated = db.prepare(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             u.name as faculty_name, b.name as batch_name, c.name as campus_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      LEFT JOIN users u ON tt.faculty_id = u.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE tt.id = ?
    `).get(id);

    res.json({
      message: 'Timetable slot updated successfully.',
      slot: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update timetable slot.' });
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
             s.credits as subject_credits, s.course_type,
             u.name as faculty_name, u.email as faculty_email,
             b.name as batch_name, b.id as batch_id,
             c.name as campus_name, c.id as campus_id
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      LEFT JOIN users u ON tt.faculty_id = u.id
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

    // Compute planned weekly contact hours per entry & subject
    const formatted = entries.map((e) => {
      const [sh, sm] = e.start_time.split(':').map(Number);
      const [eh, em] = e.end_time.split(':').map(Number);
      const durationHours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;

      return {
        id: e.id,
        dayOfWeek: e.day_of_week,
        startTime: e.start_time,
        endTime: e.end_time,
        durationHours,
        room: e.room,
        subjectId: e.subject_id,
        subject: {
          id: e.subject_id,
          code: e.subject_code,
          name: e.subject_name,
          color: e.subject_color,
          credits: e.subject_credits,
          courseType: e.course_type,
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
      };
    });

    // Summary of total planned weekly contact hours
    const totalWeeklyHours = formatted.reduce((acc, curr) => acc + curr.durationHours, 0);

    res.json({
      entries: formatted,
      totalWeeklyHours: Math.round(totalWeeklyHours * 100) / 100,
    });
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

