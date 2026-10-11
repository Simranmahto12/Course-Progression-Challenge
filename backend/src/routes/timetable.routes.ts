import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { CalendarEngine } from '../services/calendarEngine.js';
import { SaturdayRule } from '../types/index.js';

const router = Router();

// GET /api/timetable
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { campusId, batchId, subjectId, facultyId, weekday } = req.query;
    const where: any = {};

    if (campusId) where.campusId = String(campusId);
    if (batchId) where.batchId = String(batchId);
    if (subjectId) where.subjectId = String(subjectId);
    if (facultyId) where.facultyId = String(facultyId);
    if (weekday) where.weekday = parseInt(String(weekday), 10);

    if (req.user?.role === 'FACULTY') {
      where.facultyId = req.user.id;
    } else if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      where.campusId = req.user.campusId;
    } else if (req.user?.role === 'STUDENT' && req.user.batchId) {
      where.batchId = req.user.batchId;
    }

    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        campus: true,
        batch: true,
        subject: true,
        faculty: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ timetableEntries: entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable (Admin / Campus Manager)
router.post('/', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { campusId, batchId, subjectId, facultyId, weekday, startTime, endTime, durationHours, roomNumber } = req.body;

    if (!campusId || !batchId || !subjectId || !facultyId || !weekday || !startTime || !endTime) {
      res.status(400).json({ error: 'All timetable slot fields are required.' });
      return;
    }

    // Role check: Campus manager can only add slots for their campus
    if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId && req.user.campusId !== campusId) {
      res.status(403).json({ error: 'Cannot manage timetable outside your campus.' });
      return;
    }

    const duration = parseFloat(durationHours) || 1.0;

    const entry = await prisma.timetableEntry.create({
      data: {
        campusId,
        batchId,
        subjectId,
        facultyId,
        weekday: parseInt(weekday, 10),
        startTime,
        endTime,
        durationHours: duration,
        roomNumber: roomNumber || null,
      },
      include: {
        campus: true,
        batch: true,
        subject: true,
        faculty: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ timetableEntry: entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/:id
router.delete('/:id', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.timetableEntry.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/generate-sessions
// Generates concrete ScheduledSession records for a given semester or date range
router.post('/generate-sessions', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { semesterId, startDate, endDate, campusId } = req.body;

    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
      include: { batches: true },
    });

    if (!semester) {
      res.status(404).json({ error: 'Semester not found.' });
      return;
    }

    const start = startDate ? new Date(startDate) : semester.startDate;
    const end = endDate ? new Date(endDate) : semester.endDate;
    const rule = (semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

    const holidays = await prisma.holidayCalendar.findMany();

    const timetableWhere: any = {};
    if (campusId) timetableWhere.campusId = campusId;

    const timetableSlots = await prisma.timetableEntry.findMany({
      where: timetableWhere,
    });

    let sessionsCreated = 0;
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const finish = new Date(end);
    finish.setHours(23, 59, 59, 999);

    while (current <= finish) {
      const weekday = current.getDay();
      const slotsToday = timetableSlots.filter((s) => s.weekday === weekday);

      for (const slot of slotsToday) {
        const teachingCheck = CalendarEngine.isTeachingDay(
          current,
          rule,
          holidays,
          slot.campusId,
          slot.batchId
        );

        if (teachingCheck.isTeaching) {
          const sessionDateStr = CalendarEngine.formatDateOnly(current);
          const sessionDateObj = new Date(`${sessionDateStr}T00:00:00.000Z`);

          // Prevent duplicate session creation
          const existing = await prisma.scheduledSession.findFirst({
            where: {
              subjectId: slot.subjectId,
              sessionDate: sessionDateObj,
              startTime: slot.startTime,
            },
          });

          if (!existing) {
            await prisma.scheduledSession.create({
              data: {
                timetableEntryId: slot.id,
                subjectId: slot.subjectId,
                facultyId: slot.facultyId,
                batchId: slot.batchId,
                campusId: slot.campusId,
                sessionDate: sessionDateObj,
                startTime: slot.startTime,
                endTime: slot.endTime,
                durationHours: slot.durationHours,
                status: 'SCHEDULED',
                hasLog: false,
              },
            });
            sessionsCreated++;
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      sessionsCreated,
      startDate: start,
      endDate: end,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
