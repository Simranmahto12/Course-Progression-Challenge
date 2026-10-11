import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';
import { SaturdayRule } from '../types/index.js';

const router = Router();

// GET /api/dashboard/faculty
router.get('/faculty', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const facultyId = req.user?.role === 'FACULTY' ? req.user.id : (req.query.facultyId as string) || req.user?.id;

    const subjects = await prisma.subject.findMany({
      where: { facultyId },
      include: {
        campus: true,
        track: true,
        batch: true,
        semester: { include: { examWindows: true } },
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
    });

    const holidays = await prisma.holidayCalendar.findMany();
    const settings = await prisma.systemSettings.findFirst();
    const thresholds = {
      onTrackThreshold: settings?.onTrackThreshold || 1.15,
      tightThreshold: settings?.tightThreshold || 1.00,
    };

    const calculatedSubjects = subjects.map((sub) => {
      const timetableSlots = sub.timetableEntries.map((t) => ({
        weekday: t.weekday,
        durationHours: t.durationHours,
      }));
      const rule = (sub.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

      const progress = CalculationEngine.calculateSubjectProgress(
        {
          id: sub.id,
          code: sub.code,
          name: sub.name,
          campusName: sub.campus.name,
          trackName: sub.track.name,
          facultyName: req.user?.name,
          targetFinishDate: sub.targetFinishDate,
        },
        sub.topics,
        timetableSlots,
        holidays,
        rule,
        sub.campusId,
        sub.batchId,
        new Date(),
        thresholds
      );

      const examReadiness = sub.semester.examWindows.map((exam) =>
        CalculationEngine.calculateExamReadiness(
          exam,
          sub.topics,
          timetableSlots,
          holidays,
          rule,
          sub.campusId,
          sub.batchId,
          new Date(),
          thresholds
        )
      );

      return {
        ...sub,
        progression: progress,
        examReadiness,
      };
    });

    // Unlogged sessions for this faculty
    const unloggedSessions = await prisma.scheduledSession.findMany({
      where: {
        facultyId,
        sessionDate: { lte: new Date() },
        hasLog: false,
        status: { not: 'CANCELLED' },
      },
      include: {
        subject: true,
        batch: true,
      },
      orderBy: { sessionDate: 'asc' },
    });

    // Aggregate overdue topics across assigned subjects
    const overdueTopics = calculatedSubjects.flatMap((s) =>
      s.progression.overdueTopics.map((ot) => ({
        ...ot,
        subjectCode: s.code,
        subjectName: s.name,
        subjectId: s.id,
      }))
    );

    // Recommended recovery actions
    const recoveryActions = calculatedSubjects
      .filter((s) => s.progression.status === 'DANGER' || s.progression.status === 'TIGHT')
      .map((s) => {
        const needed = s.progression.remainingHours;
        const available = s.progression.availableHours;
        const deficit = Math.max(0, Math.round((needed - available) * 10) / 10);
        return {
          subjectId: s.id,
          subjectCode: s.code,
          subjectName: s.name,
          status: s.progression.status,
          bufferRatio: s.progression.bufferRatio,
          suggestion:
            deficit > 0
              ? `Schedule ${deficit}h extra remedial/practical classes before target date (${s.progression.targetFinishDate}) to achieve on-track buffer.`
              : `Review pace vs plan (${s.progression.paceVsPlan}h) and accelerate remaining topic coverage.`,
        };
      });

    res.json({
      subjects: calculatedSubjects,
      unloggedSessions,
      overdueTopics,
      recoveryActions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/campus-manager
router.get('/campus-manager', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let campusId = req.query.campusId as string;
    if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      campusId = req.user.campusId;
    }

    const campusWhere = campusId ? { id: campusId } : {};
    const campus = await prisma.campus.findFirst({
      where: campusWhere,
      include: {
        batches: {
          include: { track: true, semester: { include: { examWindows: true } } },
        },
      },
    });

    const subjectWhere: any = {};
    if (campusId) subjectWhere.campusId = campusId;

    const subjects = await prisma.subject.findMany({
      where: subjectWhere,
      include: {
        campus: true,
        track: true,
        batch: true,
        faculty: { select: { id: true, name: true, email: true } },
        semester: { include: { examWindows: true } },
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
    });

    const holidays = await prisma.holidayCalendar.findMany();
    const settings = await prisma.systemSettings.findFirst();
    const thresholds = {
      onTrackThreshold: settings?.onTrackThreshold || 1.15,
      tightThreshold: settings?.tightThreshold || 1.00,
    };

    const calculatedSubjects = subjects.map((sub) => {
      const timetableSlots = sub.timetableEntries.map((t) => ({
        weekday: t.weekday,
        durationHours: t.durationHours,
      }));
      const rule = (sub.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

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
        rule,
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

    const progressResults = calculatedSubjects.map((s) => s.progression);
    const campusRollup = CalculationEngine.calculateRollup(
      campus?.id || 'all',
      campus?.name || 'All Campuses',
      'CAMPUS',
      progressResults
    );

    // Track roll-ups
    const trackRollups = ['Mirai Track', 'University Track'].map((trackName) => {
      const trackSubjects = progressResults.filter((s) => s.trackName === trackName);
      return CalculationEngine.calculateRollup(trackName, trackName, 'TRACK', trackSubjects);
    });

    // Missing log alerts & escalations
    const alertWhere: any = {};
    if (campusId) {
      alertWhere.subject = { campusId };
    }
    const alerts = await prisma.alert.findMany({
      where: alertWhere,
      include: {
        subject: true,
        recipientUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      campus,
      rollup: campusRollup,
      trackRollups,
      subjects: calculatedSubjects,
      alerts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/admin
router.get('/admin', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campuses = await prisma.campus.findMany();
    const subjects = await prisma.subject.findMany({
      include: {
        campus: true,
        track: true,
        batch: true,
        faculty: { select: { id: true, name: true, email: true } },
        semester: true,
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
    });

    const holidays = await prisma.holidayCalendar.findMany();
    const settings = await prisma.systemSettings.findFirst();
    const thresholds = {
      onTrackThreshold: settings?.onTrackThreshold || 1.15,
      tightThreshold: settings?.tightThreshold || 1.00,
    };

    const calculated = subjects.map((sub) => {
      const timetableSlots = sub.timetableEntries.map((t) => ({
        weekday: t.weekday,
        durationHours: t.durationHours,
      }));
      const rule = (sub.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

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
        rule,
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

    const allProgressResults = calculated.map((c) => c.progression);

    // Roll-up across each demo campus
    const campusRollups = campuses.map((c) => {
      const campSubs = allProgressResults.filter((s) => s.campusName === c.name);
      return CalculationEngine.calculateRollup(c.id, c.name, 'CAMPUS', campSubs);
    });

    // Global institution rollup
    const institutionRollup = CalculationEngine.calculateRollup(
      'msot-global',
      'Mirai School of Technology (All Campuses)',
      'CAMPUS',
      allProgressResults
    );

    const stats = {
      totalCampuses: campuses.length,
      totalSubjects: subjects.length,
      totalUsers: await prisma.user.count(),
      totalSessionsLogged: await prisma.sessionLog.count(),
      totalOpenAlerts: await prisma.alert.count({ where: { status: { in: ['PENDING', 'SENT'] } } }),
    };

    res.json({
      institutionRollup,
      campusRollups,
      subjects: calculated,
      stats,
      thresholds,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/student
// Read-only batch progression, upcoming topics, and exam readiness (strictly hides staff-only alerts)
router.get('/student', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let batchId = req.user?.batchId || (req.query.batchId as string) || undefined;

    if (!batchId) {
      // Pick first batch as fallback
      const firstBatch = await prisma.batch.findFirst();
      if (!firstBatch) {
        res.status(404).json({ error: 'No batches found.' });
        return;
      }
      batchId = firstBatch.id;
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        campus: true,
        track: true,
        semester: {
          include: { examWindows: { orderBy: { startDate: 'asc' } } },
        },
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    const subjects = await prisma.subject.findMany({
      where: { batchId: batch.id },
      include: {
        faculty: { select: { name: true } },
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
        semester: true,
        campus: true,
        track: true,
      },
      orderBy: { code: 'asc' },
    });

    const holidays = await prisma.holidayCalendar.findMany();
    const settings = await prisma.systemSettings.findFirst();
    const thresholds = {
      onTrackThreshold: settings?.onTrackThreshold || 1.15,
      tightThreshold: settings?.tightThreshold || 1.00,
    };

    const studentSubjectViews = subjects.map((sub) => {
      const timetableSlots = sub.timetableEntries.map((t) => ({
        weekday: t.weekday,
        durationHours: t.durationHours,
      }));
      const rule = (sub.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

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
        rule,
        sub.campusId,
        sub.batchId,
        new Date(),
        thresholds
      );

      // Separate topics into covered, in-progress, and next upcoming
      const coveredTopics = sub.topics
        .filter((t) => t.status === 'COMPLETED' || t.completionPercentage >= 100)
        .map((t) => ({
          id: t.id,
          name: t.name,
          unit: t.unit,
          plannedHours: t.plannedHours,
          actualDate: t.actualDate,
        }));

      const nextPlannedTopics = sub.topics
        .filter((t) => t.status !== 'COMPLETED' && t.completionPercentage < 100 && t.status !== 'SKIPPED')
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          name: t.name,
          unit: t.unit,
          plannedHours: t.plannedHours,
          plannedDate: t.plannedDate,
          completionPercentage: t.completionPercentage,
        }));

      // Exam syllabus scopes for this subject
      const examScopes = batch.semester.examWindows.map((exam) =>
        CalculationEngine.calculateExamReadiness(
          exam,
          sub.topics,
          timetableSlots,
          holidays,
          rule,
          sub.campusId,
          sub.batchId,
          new Date(),
          thresholds
        )
      );

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        facultyName: sub.faculty?.name || 'TBD',
        color: sub.color,
        hoursInScope: progress.hoursInScope,
        coveredHours: progress.coveredHours,
        remainingHours: progress.remainingHours,
        coveragePercentage: progress.coveragePercentage,
        status: progress.status,
        coveredTopics,
        nextPlannedTopics,
        examScopes,
      };
    });

    res.json({
      batch: {
        id: batch.id,
        name: batch.name,
        campusName: batch.campus.name,
        trackName: batch.track.name,
        semesterName: batch.semester.name,
      },
      upcomingExams: batch.semester.examWindows,
      subjects: studentSubjectViews,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
