const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export class CalendarEngine {
    /**
     * Determine whether a Saturday is an eligible working day based on the configured rule.
     * - ALL_SATURDAYS: Every Saturday is a working day.
     * - NO_SATURDAYS: No Saturday is a working day.
     * - SECOND_FOURTH_SATURDAY: Only the 2nd and 4th Saturdays of the month are working days.
     *   (1st Saturday: days 1-7; 2nd Saturday: days 8-14; 3rd Saturday: days 15-21; 4th Saturday: days 22-28; 5th: 29-31)
     */
    static isWorkingSaturday(date, rule) {
        if (rule === 'ALL_SATURDAYS')
            return true;
        if (rule === 'NO_SATURDAYS')
            return false;
        // Rule: SECOND_FOURTH_SATURDAY
        const dayOfMonth = date.getDate();
        const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
        const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
        return isSecondSaturday || isFourthSaturday;
    }
    /**
     * Determine if a specific calendar date is a teaching day.
     */
    static isTeachingDay(date, rule, holidays, campusId, batchId) {
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
    static getScheduledHoursForWeekday(weekday, timetableSlots) {
        return timetableSlots
            .filter((slot) => slot.weekday === weekday)
            .reduce((sum, slot) => sum + slot.durationHours, 0);
    }
    /**
     * Calculate total available teaching hours from a start date (inclusive) to target date (inclusive).
     */
    static calculateAvailableHours(startDate, targetFinishDate, rule, timetableSlots, holidays, campusId, batchId, cancelledSessions = []) {
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const end = new Date(targetFinishDate);
        end.setHours(23, 59, 59, 999);
        let totalAvailableHours = 0;
        while (current <= end) {
            const teachingCheck = this.isTeachingDay(current, rule, holidays, campusId, batchId);
            if (teachingCheck.isTeaching) {
                const dateStr = this.formatDateOnly(current);
                const weekday = current.getDay();
                let hoursOnDay = this.getScheduledHoursForWeekday(weekday, timetableSlots);
                // Deduct cancelled session hours on this date
                const cancelledHoursToday = cancelledSessions
                    .filter((cs) => this.formatDateOnly(cs.sessionDate) === dateStr)
                    .reduce((sum, cs) => sum + cs.durationHours, 0);
                hoursOnDay = Math.max(0, hoursOnDay - cancelledHoursToday);
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
    static calculatePlannedTopicDates(startDate, endDate, rule, timetableSlots, topics, holidays, campusId, batchId, cancelledSessions = []) {
        const topicPlannedDates = new Map();
        const explanation = [];
        const unallocatedTopicIds = [];
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
        const totalTimetableHoursPerWeek = [1, 2, 3, 4, 5, 6].reduce((sum, wd) => sum + this.getScheduledHoursForWeekday(wd, timetableSlots), 0);
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
            // Deduct cancelled session hours on this date
            const cancelledHoursToday = cancelledSessions
                .filter((cs) => this.formatDateOnly(cs.sessionDate) === dateStr)
                .reduce((sum, cs) => sum + cs.durationHours, 0);
            availableHoursToday = Math.max(0, availableHoursToday - cancelledHoursToday);
            if (availableHoursToday <= 0) {
                explanation.push({
                    date: dateStr,
                    weekday,
                    weekdayName,
                    isWorkingDay: true,
                    reason: cancelledHoursToday > 0
                        ? `Cancelled session on this date (${cancelledHoursToday}h cancelled)`
                        : 'No scheduled timetable classes for subject on this weekday',
                    scheduledHours: 0,
                    topicsAllocated: [],
                });
                current.setDate(current.getDate() + 1);
                continue;
            }
            const dayAllocations = [];
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
    static formatDateOnly(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
