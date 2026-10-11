import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Campuses
router.get('/campuses', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const campuses = await prisma.campus.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { batches: true, subjects: true, users: true },
        },
      },
    });
    res.json({ campuses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campuses', authenticate, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, city } = req.body;
    if (!name || !code || !city) {
      res.status(400).json({ error: 'Name, code, and city are required.' });
      return;
    }
    const campus = await prisma.campus.create({
      data: { name, code, city },
    });
    res.status(201).json({ campus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tracks
router.get('/tracks', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const tracks = await prisma.track.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ tracks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batches
router.get('/batches', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { campusId, trackId } = req.query;
    const where: any = {};
    if (campusId) where.campusId = String(campusId);
    if (trackId) where.trackId = String(trackId);

    // If campus manager, restrict to their campus
    if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      where.campusId = req.user.campusId;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        campus: true,
        track: true,
        semester: true,
        _count: { select: { subjects: true, students: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ batches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Semesters
router.get('/semesters', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const semesters = await prisma.semester.findMany({
      include: {
        academicYear: true,
        examWindows: true,
      },
      orderBy: { semesterNumber: 'asc' },
    });
    res.json({ semesters });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/semesters/:id', authenticate, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDate, endDate, targetFinishDate, saturdayRule } = req.body;

    const updated = await prisma.semester.update({
      where: { id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(targetFinishDate && { targetFinishDate: new Date(targetFinishDate) }),
        ...(saturdayRule && { saturdayRule }),
      },
    });
    res.json({ semester: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Holidays & Calendar Events
router.get('/holidays', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { campusId } = req.query;
    const where: any = {};
    if (campusId) {
      where.OR = [{ campusId: null }, { campusId: String(campusId) }];
    }

    const holidays = await prisma.holidayCalendar.findMany({
      where,
      include: { campus: true },
      orderBy: { date: 'asc' },
    });
    res.json({ holidays });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/holidays', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, title, type, campusId, isTeachingSuspended } = req.body;
    if (!date || !title) {
      res.status(400).json({ error: 'Date and title are required.' });
      return;
    }

    const holiday = await prisma.holidayCalendar.create({
      data: {
        date: new Date(date),
        title,
        type: type || 'HOLIDAY',
        campusId: campusId || null,
        isTeachingSuspended: isTeachingSuspended !== false,
      },
    });
    res.status(201).json({ holiday });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/holidays/:id', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.holidayCalendar.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Exam Windows
router.get('/exam-windows', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId } = req.query;
    const where: any = {};
    if (semesterId) where.semesterId = String(semesterId);

    const examWindows = await prisma.examWindow.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
    res.json({ examWindows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
