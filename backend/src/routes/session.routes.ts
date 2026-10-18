import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { CalendarEngine } from '../services/calendarEngine.js';
import { RecalculationService } from '../services/recalculationService.js';

const router = Router();

// GET /api/sessions/today
// Returns today's scheduled sessions for current user (or for all if admin)
router.get('/today', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const todayStr = CalendarEngine.formatDateOnly(today);
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);

    const where: any = {
      sessionDate: {
        gte: startOfToday,
        lte: endOfToday,
      },
    };

    if (req.user?.role === 'FACULTY') {
      where.facultyId = req.user.id;
    } else if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      where.campusId = req.user.campusId;
    } else if (req.user?.role === 'STUDENT' && req.user.batchId) {
      where.batchId = req.user.batchId;
    }

    const sessions = await prisma.scheduledSession.findMany({
      where,
      include: {
        subject: {
          include: {
            topics: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
              orderBy: { sequence: 'asc' },
              take: 3,
            },
          },
        },
        faculty: { select: { id: true, name: true, email: true } },
        batch: true,
        campus: true,
        sessionLog: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Decorate each session with its expected next topic
    const formatted = sessions.map((s) => {
      const nextTopic = s.subject.topics[0] || null;
      return {
        ...s,
        expectedTopic: nextTopic,
      };
    });

    res.json({ sessions: formatted, date: todayStr });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/unlogged
router.get('/unlogged', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const where: any = {
      sessionDate: { lte: now },
      hasLog: false,
      status: { not: 'CANCELLED' },
    };

    if (req.user?.role === 'FACULTY') {
      where.facultyId = req.user.id;
    } else if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      where.campusId = req.user.campusId;
    }

    const unlogged = await prisma.scheduledSession.findMany({
      where,
      include: {
        subject: true,
        faculty: { select: { id: true, name: true, email: true } },
        batch: true,
        campus: true,
      },
      orderBy: { sessionDate: 'desc' },
    });

    res.json({ unloggedSessions: unlogged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/log (Log session)
router.post('/log', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      scheduledSessionId,
      status, // COMPLETED, IN_PROGRESS, SKIPPED, MERGED, CANCELLED
      actualHours,
      topicsCovered, // [{ topicId, completionPercentage, hoursLogged }]
      whatWasCovered,
      whatWasLeftOver,
      carryForwardAction,
      classworkStatus,
      notes,
    } = req.body;

    if (!scheduledSessionId || !status) {
      res.status(400).json({ error: 'scheduledSessionId and status are required.' });
      return;
    }

    const scheduledSession = await prisma.scheduledSession.findUnique({
      where: { id: scheduledSessionId },
      include: { subject: true },
    });

    if (!scheduledSession) {
      res.status(404).json({ error: 'Scheduled session not found.' });
      return;
    }

    // Role check: Students cannot log sessions
    if (req.user?.role === 'STUDENT') {
      res.status(403).json({ error: 'Forbidden: Students cannot log sessions.' });
      return;
    }

    // Role check: Faculty can only log their own sessions
    if (req.user?.role === 'FACULTY' && scheduledSession.facultyId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden: You cannot log sessions for another faculty member.' });
      return;
    }

    // Prevent duplicate logs for the same scheduled session
    if (scheduledSession.hasLog) {
      res.status(409).json({ error: 'A session log already exists for this scheduled class. Use the update flow instead.' });
      return;
    }

    const hours = actualHours !== undefined ? parseFloat(actualHours) : scheduledSession.durationHours;

    // Execute in transaction: create log, update scheduled session, update topic statuses, audit
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create SessionLog
      const log = await tx.sessionLog.create({
        data: {
          scheduledSessionId,
          subjectId: scheduledSession.subjectId,
          facultyId: scheduledSession.facultyId,
          date: scheduledSession.sessionDate,
          status,
          actualHours: hours,
          topicsCovered: JSON.stringify(topicsCovered || []),
          whatWasCovered: whatWasCovered || null,
          whatWasLeftOver: whatWasLeftOver || null,
          carryForwardAction: carryForwardAction || null,
          classworkStatus: classworkStatus || 'NONE',
          notes: notes || null,
        },
      });

      // 2. Update ScheduledSession
      await tx.scheduledSession.update({
        where: { id: scheduledSessionId },
        data: {
          hasLog: true,
          status,
        },
      });

      // 3. Update topic completion statuses based on topicsCovered
      if (Array.isArray(topicsCovered) && status !== 'CANCELLED') {
        for (const item of topicsCovered) {
          if (!item.topicId) continue;
          const topic = await tx.topic.findUnique({ where: { id: item.topicId } });
          if (!topic) continue;

          let newStatus = topic.status;
          let newPct = item.completionPercentage !== undefined ? parseFloat(item.completionPercentage) : topic.completionPercentage;

          if (status === 'COMPLETED' || newPct >= 100) {
            newStatus = 'COMPLETED';
            newPct = 100;
          } else if (newPct > 0) {
            newStatus = 'IN_PROGRESS';
          }

          const coveredHours = Math.round(topic.plannedHours * (newPct / 100) * 100) / 100;

          await tx.topic.update({
            where: { id: item.topicId },
            data: {
              status: newStatus,
              completionPercentage: newPct,
              coveredHours,
              actualDate: newStatus === 'COMPLETED' ? scheduledSession.sessionDate : topic.actualDate,
            },
          });
        }
      }

      // 4. Create Audit Log
      await tx.sessionAuditLog.create({
        data: {
          sessionLogId: log.id,
          changedByUserId: req.user!.id,
          action: 'CREATE',
          newState: JSON.stringify(log),
          reason: 'Initial session log recorded',
        },
      });

      // 5. If there was an open alert for this session, resolve it
      await tx.alert.updateMany({
        where: { scheduledSessionId },
        data: { status: 'RESOLVED', updatedAt: new Date() },
      });

      return log;
    });

    // Automatically recalculate remaining syllabus topic planned dates for the subject
    try {
      await RecalculationService.recalculateSubjectTopicDates(scheduledSession.subjectId);
    } catch (recalcErr) {
      console.error('Auto date recalculation warning:', recalcErr);
    }

    res.status(201).json({
      success: true,
      sessionLog: result,
      message: 'Session successfully logged in full detail.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sessions/log/:id (Edit session log with audit history)
router.put('/log/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, actualHours, topicsCovered, whatWasCovered, whatWasLeftOver, carryForwardAction, classworkStatus, notes, reason } = req.body;

    const existingLog = await prisma.sessionLog.findUnique({
      where: { id },
      include: { scheduledSession: true },
    });

    if (!existingLog) {
      res.status(404).json({ error: 'Session log not found.' });
      return;
    }

    // Role check
    if (req.user?.role === 'FACULTY' && existingLog.facultyId !== req.user.id) {
      res.status(403).json({ error: 'Cannot modify another faculty member log.' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prev = { ...existingLog };

      const log = await tx.sessionLog.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(actualHours !== undefined && { actualHours: parseFloat(actualHours) }),
          ...(topicsCovered && { topicsCovered: JSON.stringify(topicsCovered) }),
          ...(whatWasCovered !== undefined && { whatWasCovered }),
          ...(whatWasLeftOver !== undefined && { whatWasLeftOver }),
          ...(carryForwardAction !== undefined && { carryForwardAction }),
          ...(classworkStatus !== undefined && { classworkStatus }),
          ...(notes !== undefined && { notes }),
        },
      });

      // Update topic statuses if updated
      if (Array.isArray(topicsCovered)) {
        for (const item of topicsCovered) {
          if (!item.topicId) continue;
          const topic = await tx.topic.findUnique({ where: { id: item.topicId } });
          if (!topic) continue;

          let newPct = parseFloat(item.completionPercentage || '0');
          let newStatus = newPct >= 100 ? 'COMPLETED' : newPct > 0 ? 'IN_PROGRESS' : 'PENDING';
          const coveredHours = Math.round(topic.plannedHours * (newPct / 100) * 100) / 100;

          await tx.topic.update({
            where: { id: item.topicId },
            data: {
              status: newStatus,
              completionPercentage: newPct,
              coveredHours,
            },
          });
        }
      }

      await tx.sessionAuditLog.create({
        data: {
          sessionLogId: id,
          changedByUserId: req.user!.id,
          action: 'UPDATE',
          previousState: JSON.stringify(prev),
          newState: JSON.stringify(log),
          reason: reason || 'Faculty session update',
        },
      });

      return log;
    });

    res.json({ success: true, sessionLog: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/audit-history/:sessionLogId
router.get('/audit-history/:sessionLogId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionLogId } = req.params;
    const history = await prisma.sessionAuditLog.findMany({
      where: { sessionLogId },
      include: {
        changedByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ auditHistory: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
