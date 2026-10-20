import { CalculationEngine } from '../src/services/calculationEngine.js';
import { seedDatabase } from '../src/seed.js';

describe('CalculationEngine Unit Tests', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('calculates topic covered hours accurately (100% for completed, proportional for in progress)', () => {
    // Completed
    expect(CalculationEngine.calculateTopicCoveredHours({
      status: 'COMPLETED',
      planned_hours: 2.0,
      percentage_complete: 100,
    })).toBe(2.0);

    // In Progress 50%
    expect(CalculationEngine.calculateTopicCoveredHours({
      status: 'IN_PROGRESS',
      planned_hours: 2.0,
      percentage_complete: 50,
    })).toBe(1.0);

    // Skipped
    expect(CalculationEngine.calculateTopicCoveredHours({
      status: 'SKIPPED',
      planned_hours: 2.0,
    })).toBe(0);

    // Pending
    expect(CalculationEngine.calculateTopicCoveredHours({
      status: 'PENDING',
      planned_hours: 2.0,
    })).toBe(0);
  });

  it('correctly identifies working days considering 2nd & 4th Saturday rules', () => {
    // 2026-10-10 is the 2nd Saturday of October 2026 (off)
    const secondSat = new Date('2026-10-10T10:00:00.000Z');
    expect(CalculationEngine.isWorkingDay(secondSat, 'SECOND_FOURTH_SATURDAY', [])).toBe(false);

    // 2026-10-17 is the 3rd Saturday of October 2026 (working)
    const thirdSat = new Date('2026-10-17T10:00:00.000Z');
    expect(CalculationEngine.isWorkingDay(thirdSat, 'SECOND_FOURTH_SATURDAY', [])).toBe(true);

    // Sunday is always off
    const sunday = new Date('2026-10-18T10:00:00.000Z');
    expect(CalculationEngine.isWorkingDay(sunday, 'SECOND_FOURTH_SATURDAY', [])).toBe(false);

    // Holiday is off
    const holidayDate = new Date('2026-10-02T10:00:00.000Z');
    expect(CalculationEngine.isWorkingDay(holidayDate, 'SECOND_FOURTH_SATURDAY', ['2026-10-02'])).toBe(false);
  });

  it('computes subject progress with buffer ratio and status classification', () => {
    const result = CalculationEngine.calculateSubjectProgress('sub-dsa');
    expect(result).toBeDefined();
    expect(result?.subjectCode).toBe('CS301');
    expect(result?.hoursInScope).toBeGreaterThan(0);
    expect(result?.coveredHours).toBeGreaterThan(0);
    expect(result?.bufferRatio).toBeGreaterThan(0);
    expect(['ON TRACK', 'TIGHT', 'DANGER', 'COMPLETE']).toContain(result?.status);
  });

  it('enforces Worst-Subject Roll-Up (never average)', () => {
    const dsa = CalculationEngine.calculateSubjectProgress('sub-dsa');
    const web = CalculationEngine.calculateSubjectProgress('sub-mirai-web');
    const prod = CalculationEngine.calculateSubjectProgress('sub-mirai-prod');

    const rollup = CalculationEngine.calculateRollup('test-campus', 'HI-Tech', 'CAMPUS', [dsa, web, prod]);

    // Rollup worstStatus must equal worst subject's status
    const severities = { DANGER: 4, TIGHT: 3, 'ON TRACK': 2, COMPLETE: 1 };
    const maxSubSeverity = Math.max(
      severities[dsa.status] || 0,
      severities[web.status] || 0,
      severities[prod.status] || 0
    );

    expect(severities[rollup.worstStatus]).toBe(maxSubSeverity);
    expect(rollup.bottleneckSubject).toBeDefined();
  });
});
