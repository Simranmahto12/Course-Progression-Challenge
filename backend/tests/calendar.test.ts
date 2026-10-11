import { CalendarEngine, CalendarHoliday } from '../src/services/calendarEngine.js';

describe('CalendarEngine - Saturday Rules & 3-Month Holiday Allocation', () => {
  describe('Saturday Rules Verification', () => {
    // August 2026 Saturdays:
    // Aug 1: Saturday 1 (Day 1) -> Off in 2nd/4th
    // Aug 8: Saturday 2 (Day 8) -> WORKING in 2nd/4th
    // Aug 15: Saturday 3 (Day 15) -> Off in 2nd/4th
    // Aug 22: Saturday 4 (Day 22) -> WORKING in 2nd/4th
    // Aug 29: Saturday 5 (Day 29) -> Off in 2nd/4th

    it('handles ALL_SATURDAYS rule', () => {
      const aug1 = new Date('2026-08-01');
      const aug8 = new Date('2026-08-08');
      expect(CalendarEngine.isWorkingSaturday(aug1, 'ALL_SATURDAYS')).toBe(true);
      expect(CalendarEngine.isWorkingSaturday(aug8, 'ALL_SATURDAYS')).toBe(true);
    });

    it('handles NO_SATURDAYS rule', () => {
      const aug1 = new Date('2026-08-01');
      const aug8 = new Date('2026-08-08');
      expect(CalendarEngine.isWorkingSaturday(aug1, 'NO_SATURDAYS')).toBe(false);
      expect(CalendarEngine.isWorkingSaturday(aug8, 'NO_SATURDAYS')).toBe(false);
    });

    it('handles SECOND_FOURTH_SATURDAY rule deterministically', () => {
      const sat1 = new Date('2026-08-01'); // 1st Sat
      const sat2 = new Date('2026-08-08'); // 2nd Sat
      const sat3 = new Date('2026-08-15'); // 3rd Sat
      const sat4 = new Date('2026-08-22'); // 4th Sat
      const sat5 = new Date('2026-08-29'); // 5th Sat

      expect(CalendarEngine.isWorkingSaturday(sat1, 'SECOND_FOURTH_SATURDAY')).toBe(false);
      expect(CalendarEngine.isWorkingSaturday(sat2, 'SECOND_FOURTH_SATURDAY')).toBe(true);
      expect(CalendarEngine.isWorkingSaturday(sat3, 'SECOND_FOURTH_SATURDAY')).toBe(false);
      expect(CalendarEngine.isWorkingSaturday(sat4, 'SECOND_FOURTH_SATURDAY')).toBe(true);
      expect(CalendarEngine.isWorkingSaturday(sat5, 'SECOND_FOURTH_SATURDAY')).toBe(false);
    });
  });

  describe('3-Month Teaching Days & Holiday Blackouts (Aug - Oct 2026)', () => {
    const holidays: CalendarHoliday[] = [
      { date: '2026-08-15', title: 'Independence Day', type: 'HOLIDAY', isTeachingSuspended: true },
      { date: '2026-10-02', title: 'Gandhi Jayanti', type: 'HOLIDAY', isTeachingSuspended: true },
    ];

    it('correctly suspends teaching on holidays', () => {
      const independenceDay = new Date('2026-08-15');
      const check = CalendarEngine.isTeachingDay(independenceDay, 'ALL_SATURDAYS', holidays);
      expect(check.isTeaching).toBe(false);
      expect(check.reason).toContain('Independence Day');
    });

    it('correctly identifies ordinary working days', () => {
      const ordinaryMonday = new Date('2026-08-17'); // Monday
      const check = CalendarEngine.isTeachingDay(ordinaryMonday, 'SECOND_FOURTH_SATURDAY', holidays);
      expect(check.isTeaching).toBe(true);
    });

    it('correctly shifts topic completion date when holiday interrupts schedule', () => {
      // Test allocation:
      // Mon 2h, Wed 2h timetable
      // Topic 1: 4h.
      // Starts Mon Aug 10.
      // If Wed Aug 12 was a normal day, Topic 1 finishes on Wed Aug 12 (2h Mon + 2h Wed = 4h).
      // If Wed Aug 12 is made a holiday, Topic 1 cannot finish until Mon Aug 17!
      const slots = [
        { weekday: 1, durationHours: 2.0 }, // Mon 2h
        { weekday: 3, durationHours: 2.0 }, // Wed 2h
      ];

      const topics = [
        { id: 'top-1', sequence: 1, name: 'Intro', plannedHours: 4.0, status: 'PENDING' },
      ];

      // Normal schedule (no holiday on Aug 12)
      const resNormal = CalendarEngine.calculatePlannedTopicDates(
        new Date('2026-08-10'),
        new Date('2026-08-31'),
        'SECOND_FOURTH_SATURDAY',
        slots,
        topics,
        []
      );
      expect(resNormal.topicPlannedDates.get('top-1')).toBe('2026-08-12');

      // Interrupted schedule (Aug 12 declared holiday)
      const interruptedHolidays: CalendarHoliday[] = [
        { date: '2026-08-12', title: 'Special Holiday', type: 'HOLIDAY', isTeachingSuspended: true },
      ];

      const resInterrupted = CalendarEngine.calculatePlannedTopicDates(
        new Date('2026-08-10'),
        new Date('2026-08-31'),
        'SECOND_FOURTH_SATURDAY',
        slots,
        topics,
        interruptedHolidays
      );
      // Shifts from Aug 12 to next teaching day: Monday Aug 17!
      expect(resInterrupted.topicPlannedDates.get('top-1')).toBe('2026-08-17');
    });
  });
});
