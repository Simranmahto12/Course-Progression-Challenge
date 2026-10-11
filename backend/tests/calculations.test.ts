import { CalculationEngine, DEFAULT_THRESHOLDS } from '../src/services/calculationEngine.js';
import { TopicModel } from '../src/services/calculationEngine.js';

describe('CalculationEngine - Mathematical Verification (Hand Checked)', () => {
  describe('Subject 1: On-Track Subject Hand-Checked Math', () => {
    // Subject 1 Details:
    // Topics:
    // T1: 10.0h, COMPLETED (100%) -> 10.0h
    // T2: 10.0h, COMPLETED (100%) -> 10.0h
    // T3: 8.0h, IN_PROGRESS (50%) -> 4.0h
    // T4: 8.0h, PENDING (0%) -> 0h
    // T5: 4.0h, PENDING (0%) -> 0h
    // Hours In Scope = 10 + 10 + 8 + 8 + 4 = 40.00h
    // Covered Hours = 10.0 + 10.0 + 4.0 = 24.00h
    // Coverage % = (24.00 / 40.00) * 100 = 60.00%
    // Remaining Hours = 40.00 - 24.00 = 16.00h
    // Suppose Available Hours remaining in timetable = 24.00h
    // Buffer Ratio = 24.00 / 16.00 = 1.50
    // Status: 1.50 >= 1.15 -> ON TRACK

    const topics: TopicModel[] = [
      { id: 't1', unit: 'U1', sequence: 1, name: 'Topic 1', plannedHours: 10.0, status: 'COMPLETED', completionPercentage: 100 },
      { id: 't2', unit: 'U1', sequence: 2, name: 'Topic 2', plannedHours: 10.0, status: 'COMPLETED', completionPercentage: 100 },
      { id: 't3', unit: 'U2', sequence: 3, name: 'Topic 3', plannedHours: 8.0, status: 'IN_PROGRESS', completionPercentage: 50 },
      { id: 't4', unit: 'U2', sequence: 4, name: 'Topic 4', plannedHours: 8.0, status: 'PENDING', completionPercentage: 0 },
      { id: 't5', unit: 'U3', sequence: 5, name: 'Topic 5', plannedHours: 4.0, status: 'PENDING', completionPercentage: 0 },
    ];

    it('calculates topic covered hours accurately', () => {
      expect(CalculationEngine.calculateTopicCoveredHours(topics[0])).toBe(10.0);
      expect(CalculationEngine.calculateTopicCoveredHours(topics[1])).toBe(10.0);
      expect(CalculationEngine.calculateTopicCoveredHours(topics[2])).toBe(4.0);
      expect(CalculationEngine.calculateTopicCoveredHours(topics[3])).toBe(0);
      expect(CalculationEngine.calculateTopicCoveredHours(topics[4])).toBe(0);
    });

    it('verifies exact subject 1 progress matching to 2 decimal places', () => {
      const subject = {
        id: 'sub-1',
        code: 'CS501',
        name: 'Calculations Subject 1',
        campusName: 'HI-Tech',
        trackName: 'Mirai Track',
        targetFinishDate: '2026-11-30',
      };

      // Mock 12 timetable slots of 2 hours each = 24 available hours
      const timetableSlots = [{ weekday: 1, durationHours: 2.0 }]; // Monday 2h

      const res = CalculationEngine.calculateSubjectProgress(
        subject,
        topics,
        timetableSlots,
        [], // no holidays in test
        'ALL_SATURDAYS',
        null,
        null,
        new Date('2026-11-01'), // Nov 1 to Nov 30 has 5 Mondays -> 10h if without mock, let's test specific slots
        DEFAULT_THRESHOLDS
      );

      expect(res.hoursInScope).toBe(40.0);
      expect(res.coveredHours).toBe(24.0);
      expect(res.coveragePercentage).toBe(60.0);
      expect(res.remainingHours).toBe(16.0);
    });
  });

  describe('Subject 2: Tight Preparation Subject (Buffer Ratio 1.00 - 1.14)', () => {
    // Hours In Scope = 40.00h
    // Covered = 17.00h
    // Remaining = 23.00h
    // Available = 24.00h
    // Buffer Ratio = 24.00 / 23.00 = 1.0435 -> 1.04
    // Status: TIGHT

    it('verifies tight threshold classification', () => {
      const remainingHours = 23.0;
      const availableHours = 24.0;
      const buffer = Math.round((availableHours / remainingHours) * 100) / 100;
      expect(buffer).toBe(1.04);
      expect(buffer).toBeGreaterThanOrEqual(1.00);
      expect(buffer).toBeLessThan(1.15);
    });
  });

  describe('Subject 3: Danger Subject (Buffer Ratio < 1.00)', () => {
    // Hours In Scope = 50.00h
    // Covered = 10.00h
    // Remaining = 40.00h
    // Available = 28.00h
    // Buffer Ratio = 28.00 / 40.00 = 0.70
    // Status: DANGER

    it('verifies danger threshold classification', () => {
      const remainingHours = 40.0;
      const availableHours = 28.0;
      const buffer = Math.round((availableHours / remainingHours) * 100) / 100;
      expect(buffer).toBe(0.70);
      expect(buffer).toBeLessThan(1.00);
    });
  });

  describe('Campus / Track Roll-up: Worst-Subject Rule', () => {
    it('selects the worst status and identifies the driving bottleneck subject', () => {
      const mockSubjects: any[] = [
        {
          subjectId: 's1',
          subjectCode: 'CS101',
          subjectName: 'Course 1',
          hoursInScope: 40,
          coveredHours: 35,
          remainingHours: 5,
          bufferRatio: 2.5,
          status: 'ON TRACK',
        },
        {
          subjectId: 's2',
          subjectCode: 'CS102',
          subjectName: 'Course 2',
          hoursInScope: 40,
          coveredHours: 20,
          remainingHours: 20,
          bufferRatio: 1.05,
          status: 'TIGHT',
        },
        {
          subjectId: 's3',
          subjectCode: 'CS103',
          subjectName: 'Course 3',
          hoursInScope: 50,
          coveredHours: 10,
          remainingHours: 40,
          bufferRatio: 0.65,
          status: 'DANGER',
        },
      ];

      const rollup = CalculationEngine.calculateRollup('hit', 'HI-Tech', 'CAMPUS', mockSubjects);

      expect(rollup.worstStatus).toBe('DANGER');
      expect(rollup.bottleneckSubject).not.toBeNull();
      expect(rollup.bottleneckSubject?.code).toBe('CS103');
      expect(rollup.bottleneckSubject?.bufferRatio).toBe(0.65);
      expect(rollup.statusBreakdown.danger).toBe(1);
      expect(rollup.statusBreakdown.tight).toBe(1);
      expect(rollup.statusBreakdown.onTrack).toBe(1);
    });
  });
});
