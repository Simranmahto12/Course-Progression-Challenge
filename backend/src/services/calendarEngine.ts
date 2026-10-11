import { SaturdayRule } from '../types/index.js';

export interface CalendarHoliday {
  date: Date | string;
  title: string;
  type: string;
  campusId?: string | null;
  batchId?: string | null;
  isTeachingSuspended: boolean;
}

export interface TimetableSlot {
  weekday: number; // 1 = Monday ... 6 = Saturday
  durationHours: number;
}

export interface TopicInput {
  id: string;
  sequence: number;
  name: string;
  plannedHours: number;
  status: string;
}

export interface DayStepExplanation {
  date: string;
  weekday: number;
  weekdayName: string;
  isWorkingDay: boolean;
  reason?: string;
  scheduledHours: number;
  topicsAllocated: Array<{
    topicId: string;
    topicName: string;
    hoursAllocated: number;
    completedOnThisDay: boolean;
  }>;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class CalendarEngine {
  /**
   * Determine whether a Saturday is an eligible working day based on the configured rule.
   * - ALL_SATURDAYS: Every Saturday is a working day.
   * - NO_SATURDAYS: No Saturday is a working day.
   * - SECOND_FOURTH_SATURDAY: Only the 2nd and 4th Saturdays of the month are working days.
   *   (1st Saturday: days 1-7; 2nd Saturday: days 8-14; 3rd Saturday: days 15-21; 4th Saturday: days 22-28; 5th: 29-31)
   */
  public static isWorkingSaturday(date: Date, rule: SaturdayRule): boolean {
    if (rule === 'ALL_SATURDAYS') return true;
    if (rule === 'NO_SATURDAYS') return false;

    // Rule: SECOND_FOURTH_SATURDAY
    const dayOfMonth = date.getDate();
    const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
    const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;

    return isSecondSaturday || isFourthSaturday;
  }

  /**
   * Determine if a specific calendar date is a teaching day.
   */
  public static isTeachingDay(
    date: Date,
    rule: SaturdayRule,
    holidays: CalendarHoliday[],
    campusId?: string | null,
    batchId?: string | null
  ): { isTeaching: boolean; reason?: string } {
    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

    // Sundays are never teaching days
    if (dayOfWeek === 0) {
      return { isTeaching: false, reason: 'Sunday off' };
    }

    // Check Saturday rule
    if (dayOfWeek === 6) {
      const workingSat = this.isWorkingSaturday(date, rule);
      if (!workingSat) {
        return { isTeaching: false, reason: 'Non-working Saturday per institutional rule' };
      }
    }

    // Check holiday / closure list
    const dateStr = this.formatDateOnly(date);
    for (const h of holidays) {
      const hDateStr = typeof h.date === 'string' ? h.date.slice(0, 10) : this.formatDateOnly(h.date);
      if (hDateStr === dateStr && h.isTeachingSuspended) {
        // Check campus/batch applicability
        const campusMatch = !h.campusId || !campusId || h.campusId === campusId;
        const batchMatch = !h.batchId || !batchId || h.batchId === batchId;
        if (campusMatch && batchMatch) {
          return { isTeaching: false, reason: `Holiday/Closure: ${h.title} (${h.type})` };
        }
      }
    }

    return { isTeaching: true };
  }

  /**
   * Calculate scheduled timetable hours for a given subject on a given weekday.
   */
  public static getScheduledHoursForWeekday(weekday: number, timetableSlots: TimetableSlot[]): number {
    return timetableSlots
      .filter((slot) => slot.weekday === weekday)
      .reduce((sum, slot) => sum + slot.durationHours, 0);
  }

  /**
   * Calculate total available teaching hours from a start date (inclusive) to target date (inclusive).
   */
  public static calculateAvailableHours(
    startDate: Date,
    targetFinishDate: Date,
    rule: SaturdayRule,
    timetableSlots: TimetableSlot[],
    holidays: CalendarHoliday[],
    campusId?: string | null,
    batchId?: string | null
  ): number {
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(targetFinishDate);
    end.setHours(23, 59, 59, 999);

    let totalAvailableHours = 0;

    while (current <= end) {
      const teachingCheck = this.isTeachingDay(current, rule, holidays, campusId, batchId);
      if (teachingCheck.isTeaching) {
        const weekday = current.getDay();
        const hoursOnDay = this.getScheduledHoursForWeekday(weekday, timetableSlots);
        totalAvailableHours += hoursOnDay;
      }
      current.setDate(current.getDate() + 1);
    }

    return Math.round(totalAvailableHours * 100) / 100;
  }

  /**
   * Deterministically walk the calendar and timetable to assign planned dates to topics in sequence.
   * Returns updated planned dates and an explanation audit trail.
   */
  public static calculatePlannedTopicDates(
    startDate: Date,
    endDate: Date,
    rule: SaturdayRule,
    timetableSlots: TimetableSlot[],
    topics: TopicInput[],
    holidays: CalendarHoliday[],
    campusId?: string | null,
    batchId?: string | null
  ): {
    topicPlannedDates: Map<string, string>;
    unallocatedTopicIds: string[];
    explanation: DayStepExplanation[];
    totalTimetableHoursPerWeek: number;
  } {
    const topicPlannedDates = new Map<string, string>();
    const explanation: DayStepExplanation[] = [];
    const unallocatedTopicIds: string[] = [];

    // Filter out skipped topics from allocation
    const pendingTopics = topics
      .filter((t) => t.status !== 'SKIPPED')
      .sort((a, b) => a.sequence - b.sequence);

    if (pendingTopics.length === 0 || timetableSlots.length === 0) {
      return {
        topicPlannedDates,
        unallocatedTopicIds: pendingTopics.map((t) => t.id),
        explanation,
        totalTimetableHoursPerWeek: 0,
      };
    }

    const totalTimetableHoursPerWeek = [1, 2, 3, 4, 5, 6].reduce(
      (sum, wd) => sum + this.getScheduledHoursForWeekday(wd, timetableSlots),
      0
    );

    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const finishLimit = new Date(endDate);
    finishLimit.setHours(23, 59, 59, 999);

    let currentTopicIndex = 0;
    let currentTopicRemainingHours = pendingTopics[0]?.plannedHours || 0;

    while (current <= finishLimit && currentTopicIndex < pendingTopics.length) {
      const dateStr = this.formatDateOnly(current);
      const weekday = current.getDay();
      const weekdayName = WEEKDAY_NAMES[weekday];

      const teachingCheck = this.isTeachingDay(current, rule, holidays, campusId, batchId);

      if (!teachingCheck.isTeaching) {
        explanation.push({
          date: dateStr,
          weekday,
          weekdayName,
          isWorkingDay: false,
          reason: teachingCheck.reason,
          scheduledHours: 0,
          topicsAllocated: [],
        });
        current.setDate(current.getDate() + 1);
        continue;
      }

      let availableHoursToday = this.getScheduledHoursForWeekday(weekday, timetableSlots);

      if (availableHoursToday <= 0) {
        explanation.push({
          date: dateStr,
          weekday,
          weekdayName,
          isWorkingDay: true,
          reason: 'No scheduled timetable classes for subject on this weekday',
          scheduledHours: 0,
          topicsAllocated: [],
        });
        current.setDate(current.getDate() + 1);
        continue;
      }

      const dayAllocations: DayStepExplanation['topicsAllocated'] = [];
      const scheduledToday = availableHoursToday;

      while (availableHoursToday > 0 && currentTopicIndex < pendingTopics.length) {
        const activeTopic = pendingTopics[currentTopicIndex];
        const hoursToAllocate = Math.min(availableHoursToday, currentTopicRemainingHours);

        currentTopicRemainingHours -= hoursToAllocate;
        availableHoursToday -= hoursToAllocate;

        const isTopicComplete = currentTopicRemainingHours <= 0.0001;

        dayAllocations.push({
          topicId: activeTopic.id,
          topicName: activeTopic.name,
          hoursAllocated: Math.round(hoursToAllocate * 100) / 100,
          completedOnThisDay: isTopicComplete,
        });

        if (isTopicComplete) {
          topicPlannedDates.set(activeTopic.id, dateStr);
          currentTopicIndex++;
          if (currentTopicIndex < pendingTopics.length) {
            currentTopicRemainingHours = pendingTopics[currentTopicIndex].plannedHours;
          }
        }
      }

      explanation.push({
        date: dateStr,
        weekday,
        weekdayName,
        isWorkingDay: true,
        scheduledHours: scheduledToday,
        topicsAllocated: dayAllocations,
      });

      current.setDate(current.getDate() + 1);
    }

    // Check if any topics could not be fitted before semester end
    while (currentTopicIndex < pendingTopics.length) {
      unallocatedTopicIds.push(pendingTopics[currentTopicIndex].id);
      currentTopicIndex++;
    }

    return {
      topicPlannedDates,
      unallocatedTopicIds,
      explanation,
      totalTimetableHoursPerWeek,
    };
  }

  public static formatDateOnly(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
