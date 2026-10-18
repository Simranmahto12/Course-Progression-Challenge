import prisma from '../lib/prisma.js';
import { CalendarEngine, CancelledSessionInput } from './calendarEngine.js';
import { SaturdayRule } from '../types/index.js';

export class RecalculationService {
  /**
   * Recalculates planned teaching dates for each ordered topic in a subject.
   * Walks the calendar, timetable, working Saturdays, holidays, and accounts for cancelled sessions.
   */
  public static async recalculateSubjectTopicDates(subjectId: string): Promise<{
    allocatedCount: number;
    unallocatedCount: number;
    unallocatedTopicIds: string[];
  }> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        semester: true,
        topics: { orderBy: { sequence: 'asc' } },
        timetableEntries: true,
      },
    });

    if (!subject) {
      return { allocatedCount: 0, unallocatedCount: 0, unallocatedTopicIds: [] };
    }

    const holidays = await prisma.holidayCalendar.findMany();
    const timetableSlots = subject.timetableEntries.map((t) => ({
      weekday: t.weekday,
      durationHours: t.durationHours,
    }));
    const saturdayRule = (subject.semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

    // Fetch cancelled sessions for this subject
    const cancelledSessionsRaw = await prisma.scheduledSession.findMany({
      where: {
        subjectId,
        status: 'CANCELLED',
      },
      select: {
        sessionDate: true,
        durationHours: true,
      },
    });

    const cancelledSessions: CancelledSessionInput[] = cancelledSessionsRaw.map((cs) => ({
      sessionDate: cs.sessionDate,
      durationHours: cs.durationHours,
    }));

    const calculation = CalendarEngine.calculatePlannedTopicDates(
      subject.semester.startDate,
      subject.semester.endDate,
      saturdayRule,
      timetableSlots,
      subject.topics,
      holidays,
      subject.campusId,
      subject.batchId,
      cancelledSessions
    );

    // Update allocated topics with planned dates
    for (const [topicId, dateStr] of calculation.topicPlannedDates.entries()) {
      await prisma.topic.update({
        where: { id: topicId },
        data: { plannedDate: new Date(dateStr) },
      });
    }

    // Unallocated topics have plannedDate reset to null
    for (const topicId of calculation.unallocatedTopicIds) {
      await prisma.topic.update({
        where: { id: topicId },
        data: { plannedDate: null },
      });
    }

    return {
      allocatedCount: calculation.topicPlannedDates.size,
      unallocatedCount: calculation.unallocatedTopicIds.length,
      unallocatedTopicIds: calculation.unallocatedTopicIds,
    };
  }

  /**
   * Recalculates planned dates for all subjects in a campus (or all campuses if null).
   */
  public static async recalculateAllSubjects(campusId?: string | null): Promise<number> {
    const where: any = {};
    if (campusId) where.campusId = campusId;

    const subjects = await prisma.subject.findMany({
      where,
      select: { id: true },
    });

    for (const sub of subjects) {
      await this.recalculateSubjectTopicDates(sub.id);
    }

    return subjects.length;
  }
}
