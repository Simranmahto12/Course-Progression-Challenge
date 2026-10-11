import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRoles, verifySubjectAccess, AuthenticatedRequest } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';
import { CalendarEngine } from '../services/calendarEngine.js';
import { SaturdayRule } from '../types/index.js';

const router = Router();

// GET /api/subjects (filtered by campus, track, batch, or faculty)
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { campusId, trackId, batchId, facultyId } = req.query;
    const where: any = {};

    if (campusId) where.campusId = String(campusId);
    if (trackId) where.trackId = String(trackId);
    if (batchId) where.batchId = String(batchId);
    if (facultyId) where.facultyId = String(facultyId);

    // Role-based restrictions:
    if (req.user?.role === 'FACULTY') {
      where.facultyId = req.user.id;
    } else if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      where.campusId = req.user.campusId;
    } else if (req.user?.role === 'STUDENT' && req.user.batchId) {
      where.batchId = req.user.batchId;
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        campus: true,
        track: true,
        batch: true,
        faculty: { select: { id: true, name: true, email: true } },
        semester: true,
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
      orderBy: { code: 'asc' },
    });

    // Get system settings for buffer thresholds
    const settings = await prisma.systemSettings.findFirst();
    const thresholds = {
      onTrackThreshold: settings?.onTrackThreshold || 1.15,
      tightThreshold: settings?.tightThreshold || 1.00,
    };

    // Fetch holidays
    const holidays = await prisma.holidayCalendar.findMany();

    // Map through subjects and compute real-time progression metrics
    const results = subjects.map((sub) => {
      const timetableSlots = sub.timetableEntries.map((t) => ({
        weekday: t.weekday,
        durationHours: t.durationHours,
      }));

      const saturdayRule = (sub.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

      const progress = CalculationEngine.calculateSubjectProgress(
        {
          id: sub.id,
          code: sub.code,
          name: sub.name,
          campusName: sub.campus.name,
          trackName: sub.track.name,
          facultyName: sub.faculty?.name,
          targetFinishDate: sub.targetFinishDate,
        },
        sub.topics,
        timetableSlots,
        holidays,
        saturdayRule,
        sub.campusId,
        sub.batchId,
        new Date(),
        thresholds
      );

      return {
        ...sub,
        progression: progress,
      };
    });

    res.json({ subjects: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subjects/:id
router.get('/:id', authenticate, verifySubjectAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        campus: true,
        track: true,
        batch: true,
        faculty: { select: { id: true, name: true, email: true } },
        semester: {
          include: { examWindows: true },
        },
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
        scheduledSessions: {
          orderBy: { sessionDate: 'desc' },
          take: 10,
          include: { sessionLog: true },
        },
      },
    });

    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const settings = await prisma.systemSettings.findFirst();
    const thresholds = {
      onTrackThreshold: settings?.onTrackThreshold || 1.15,
      tightThreshold: settings?.tightThreshold || 1.00,
    };

    const holidays = await prisma.holidayCalendar.findMany();

    const timetableSlots = subject.timetableEntries.map((t) => ({
      weekday: t.weekday,
      durationHours: t.durationHours,
    }));

    const saturdayRule = (subject.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

    const progress = CalculationEngine.calculateSubjectProgress(
      {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        campusName: subject.campus.name,
        trackName: subject.track.name,
        facultyName: subject.faculty?.name,
        targetFinishDate: subject.targetFinishDate,
      },
      subject.topics,
      timetableSlots,
      holidays,
      saturdayRule,
      subject.campusId,
      subject.batchId,
      new Date(),
      thresholds
    );

    // Calculate exam readiness for each exam window in the semester
    const examReadiness = subject.semester.examWindows.map((exam) =>
      CalculationEngine.calculateExamReadiness(
        exam,
        subject.topics,
        timetableSlots,
        holidays,
        saturdayRule,
        subject.campusId,
        subject.batchId,
        new Date(),
        thresholds
      )
    );

    res.json({
      subject,
      progression: progress,
      examReadiness,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects (Admin / Campus Manager only)
router.post('/', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, name, campusId, trackId, semesterId, batchId, facultyId, plannedHours, targetFinishDate, color } = req.body;

    if (!code || !name || !campusId || !trackId || !semesterId || !batchId || !targetFinishDate) {
      res.status(400).json({ error: 'Required fields missing.' });
      return;
    }

    const subject = await prisma.subject.create({
      data: {
        code,
        name,
        campusId,
        trackId,
        semesterId,
        batchId,
        facultyId: facultyId || null,
        plannedHours: parseFloat(plannedHours) || 0,
        targetFinishDate: new Date(targetFinishDate),
        color: color || '#2563eb',
      },
    });

    res.status(201).json({ subject });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/:id
router.put('/:id', authenticate, verifySubjectAccess, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, facultyId, plannedHours, targetFinishDate, color } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(facultyId !== undefined && { facultyId: facultyId || null }),
        ...(plannedHours !== undefined && { plannedHours: parseFloat(plannedHours) }),
        ...(targetFinishDate && { targetFinishDate: new Date(targetFinishDate) }),
        ...(color && { color }),
      },
    });

    res.json({ subject });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id (Admin only)
router.delete('/:id', authenticate, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Topic / Lesson Plan routes ---

// POST /api/subjects/:id/topics
router.post('/:id/topics', authenticate, verifySubjectAccess, requireRoles(['ADMIN', 'CAMPUS_MANAGER', 'FACULTY']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { unit, sequence, name, description, plannedHours, examScopes, prerequisites } = req.body;

    const hours = parseFloat(plannedHours);
    if (isNaN(hours) || hours <= 0) {
      res.status(400).json({ error: 'Planned hours must be a positive number.' });
      return;
    }

    const topic = await prisma.topic.create({
      data: {
        subjectId: id,
        unit: unit || 'Unit 1',
        sequence: parseInt(sequence, 10) || 1,
        name,
        description: description || null,
        plannedHours: hours,
        examScopes: examScopes || 'MID_TERM,END_TERM',
        prerequisites: prerequisites || null,
      },
    });

    res.status(201).json({ topic });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/:id/topics/:topicId
router.put('/:id/topics/:topicId', authenticate, verifySubjectAccess, requireRoles(['ADMIN', 'CAMPUS_MANAGER', 'FACULTY']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { topicId } = req.params;
    const { unit, sequence, name, description, plannedHours, examScopes, prerequisites, status, completionPercentage } = req.body;

    const data: any = {};
    if (unit) data.unit = unit;
    if (sequence !== undefined) data.sequence = parseInt(sequence, 10);
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (plannedHours !== undefined) {
      const h = parseFloat(plannedHours);
      if (isNaN(h) || h <= 0) {
        res.status(400).json({ error: 'Planned hours must be positive.' });
        return;
      }
      data.plannedHours = h;
    }
    if (examScopes !== undefined) data.examScopes = examScopes;
    if (prerequisites !== undefined) data.prerequisites = prerequisites;
    if (status) data.status = status;
    if (completionPercentage !== undefined) {
      data.completionPercentage = parseFloat(completionPercentage);
    }

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data,
    });

    res.json({ topic: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id/topics/:topicId
router.delete('/:id/topics/:topicId', authenticate, verifySubjectAccess, requireRoles(['ADMIN', 'CAMPUS_MANAGER', 'FACULTY']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { topicId } = req.params;
    await prisma.topic.delete({ where: { id: topicId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects/:id/recalculate-dates
router.post('/:id/recalculate-dates', authenticate, verifySubjectAccess, requireRoles(['ADMIN', 'CAMPUS_MANAGER', 'FACULTY']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        semester: true,
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
    });

    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const holidays = await prisma.holidayCalendar.findMany();
    const timetableSlots = subject.timetableEntries.map((t) => ({
      weekday: t.weekday,
      durationHours: t.durationHours,
    }));
    const saturdayRule = (subject.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

    const calculation = CalendarEngine.calculatePlannedTopicDates(
      subject.semester.startDate,
      subject.semester.endDate,
      saturdayRule,
      timetableSlots,
      subject.topics,
      holidays,
      subject.campusId,
      subject.batchId
    );

    // Save planned dates back to topic records
    for (const [topicId, dateStr] of calculation.topicPlannedDates.entries()) {
      await prisma.topic.update({
        where: { id: topicId },
        data: { plannedDate: new Date(dateStr) },
      });
    }

    res.json({
      success: true,
      allocatedCount: calculation.topicPlannedDates.size,
      unallocatedCount: calculation.unallocatedTopicIds.length,
      unallocatedTopicIds: calculation.unallocatedTopicIds,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subjects/:id/explain-calculation
router.get('/:id/explain-calculation', authenticate, verifySubjectAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        semester: true,
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
    });

    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const holidays = await prisma.holidayCalendar.findMany();
    const timetableSlots = subject.timetableEntries.map((t) => ({
      weekday: t.weekday,
      durationHours: t.durationHours,
    }));
    const saturdayRule = (subject.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

    const calculation = CalendarEngine.calculatePlannedTopicDates(
      subject.semester.startDate,
      subject.semester.endDate,
      saturdayRule,
      timetableSlots,
      subject.topics,
      holidays,
      subject.campusId,
      subject.batchId
    );

    res.json({
      subjectId: subject.id,
      subjectName: subject.name,
      semesterDates: {
        start: subject.semester.startDate,
        end: subject.semester.endDate,
        targetFinish: subject.targetFinishDate,
      },
      saturdayRule,
      totalTimetableHoursPerWeek: calculation.totalTimetableHoursPerWeek,
      unallocatedTopicsCount: calculation.unallocatedTopicIds.length,
      steps: calculation.explanation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
