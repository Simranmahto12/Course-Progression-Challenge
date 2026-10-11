import {
  ProgressStatus,
  SubjectCalculationResult,
  ExamReadinessResult,
  RollupResult,
  SaturdayRule,
} from '../types/index.js';
import { CalendarEngine, CalendarHoliday, TimetableSlot } from './calendarEngine.js';

export interface TopicModel {
  id: string;
  unit: string;
  sequence: number;
  name: string;
  plannedHours: number;
  status: string; // PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  completionPercentage: number;
  plannedDate?: Date | string | null;
  examScopes?: string;
}

export interface ThresholdConfig {
  onTrackThreshold: number; // default 1.15
  tightThreshold: number;   // default 1.00
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  onTrackThreshold: 1.15,
  tightThreshold: 1.00,
};

export class CalculationEngine {
  /**
   * Calculate covered hours for a topic:
   * - Completed: 100% of plannedHours
   * - In Progress: plannedHours * (completionPercentage / 100)
   * - Skipped: 0
   * - Pending: 0
   */
  public static calculateTopicCoveredHours(topic: TopicModel): number {
    if (topic.status === 'SKIPPED') return 0;
    if (topic.status === 'COMPLETED') return topic.plannedHours;
    if (topic.status === 'IN_PROGRESS') {
      const pct = Math.max(0, Math.min(100, topic.completionPercentage || 0));
      return Math.round(topic.plannedHours * (pct / 100) * 10000) / 10000;
    }
    return 0;
  }

  /**
   * Core deterministic calculation for a subject.
   */
  public static calculateSubjectProgress(
    subject: {
      id: string;
      code: string;
      name: string;
      campusName: string;
      trackName: string;
      facultyName?: string;
      targetFinishDate: Date | string;
    },
    topics: TopicModel[],
    timetableSlots: TimetableSlot[],
    holidays: CalendarHoliday[],
    saturdayRule: SaturdayRule,
    campusId?: string | null,
    batchId?: string | null,
    referenceDate: Date = new Date(),
    thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
  ): SubjectCalculationResult {
    const todayStr = CalendarEngine.formatDateOnly(referenceDate);

    // 1. Hours in scope: sum of planned hours for non-skipped topics
    let hoursInScope = 0;
    let coveredHours = 0;
    let plannedHoursToDate = 0;
    const overdueTopics: SubjectCalculationResult['overdueTopics'] = [];

    for (const topic of topics) {
      if (topic.status === 'SKIPPED') continue;

      hoursInScope += topic.plannedHours;
      const topicCovered = this.calculateTopicCoveredHours(topic);
      coveredHours += topicCovered;

      // Check planned date vs today for pace and overdue status
      if (topic.plannedDate) {
        const plannedStr = CalendarEngine.formatDateOnly(topic.plannedDate);
        
        // If planned date is on or before today, it should have been covered by now
        if (plannedStr <= todayStr) {
          plannedHoursToDate += topic.plannedHours;

          // Overdue topic definition: planned date has passed and topic is not fully covered
          const isFullyCovered = topic.status === 'COMPLETED' || topic.completionPercentage >= 100;
          if (!isFullyCovered && plannedStr < todayStr) {
            overdueTopics.push({
              id: topic.id,
              sequence: topic.sequence,
              name: topic.name,
              plannedDate: plannedStr,
              plannedHours: Math.round(topic.plannedHours * 100) / 100,
              completionPercentage: Math.round(topic.completionPercentage * 100) / 100,
            });
          }
        }
      }
    }

    // 2. Remaining hours = hours in scope - covered hours
    const remainingHours = Math.max(0, hoursInScope - coveredHours);

    // 3. Coverage percentage = (coveredHours / hoursInScope) * 100
    const coveragePercentage =
      hoursInScope > 0 ? (coveredHours / hoursInScope) * 100 : 0;

    // 4. Available teaching hours remaining from referenceDate to targetFinishDate
    const targetDate = new Date(subject.targetFinishDate);
    const availableHours = CalendarEngine.calculateAvailableHours(
      referenceDate,
      targetDate,
      saturdayRule,
      timetableSlots,
      holidays,
      campusId,
      batchId
    );

    // 5. Buffer ratio = availableHours / remainingHours
    let bufferRatio = 0;
    let status: ProgressStatus = 'ON TRACK';

    if (remainingHours <= 0.0001) {
      bufferRatio = 999.99; // Represents complete
      status = 'COMPLETE';
    } else {
      bufferRatio = Math.round((availableHours / remainingHours) * 10000) / 10000;
      if (bufferRatio >= thresholds.onTrackThreshold) {
        status = 'ON TRACK';
      } else if (bufferRatio >= thresholds.tightThreshold) {
        status = 'TIGHT';
      } else {
        status = 'DANGER';
      }
    }

    // 6. Pace vs plan = coveredHours - plannedHoursToDate
    const paceVsPlan = Math.round((coveredHours - plannedHoursToDate) * 100) / 100;

    return {
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      campusName: subject.campusName,
      trackName: subject.trackName,
      facultyName: subject.facultyName,
      targetFinishDate: CalendarEngine.formatDateOnly(subject.targetFinishDate),
      hoursInScope: Math.round(hoursInScope * 100) / 100,
      coveredHours: Math.round(coveredHours * 100) / 100,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      availableHours: Math.round(availableHours * 100) / 100,
      bufferRatio: Math.round(bufferRatio * 100) / 100,
      status,
      paceVsPlan,
      overdueTopicsCount: overdueTopics.length,
      overdueTopics,
    };
  }

  /**
   * Calculate exam readiness for a subject across configured exam windows.
   */
  public static calculateExamReadiness(
    exam: {
      name: string;
      displayName: string;
      startDate: Date | string;
      endDate: Date | string;
    },
    topics: TopicModel[],
    timetableSlots: TimetableSlot[],
    holidays: CalendarHoliday[],
    saturdayRule: SaturdayRule,
    campusId?: string | null,
    batchId?: string | null,
    referenceDate: Date = new Date(),
    thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
  ): ExamReadinessResult {
    // Filter topics in scope for this exam
    const inScopeTopics = topics.filter((t) => {
      if (t.status === 'SKIPPED') return false;
      if (!t.examScopes) return false;
      const scopes = t.examScopes.split(',').map((s) => s.trim().toUpperCase());
      return scopes.includes(exam.name.toUpperCase());
    });

    let inScopePlannedHours = 0;
    let coveredHours = 0;
    const uncoveredTopics: ExamReadinessResult['uncoveredTopics'] = [];

    for (const t of inScopeTopics) {
      inScopePlannedHours += t.plannedHours;
      const covered = this.calculateTopicCoveredHours(t);
      coveredHours += covered;

      if (t.status !== 'COMPLETED' && t.completionPercentage < 100) {
        uncoveredTopics.push({
          id: t.id,
          name: t.name,
          plannedHours: Math.round(t.plannedHours * 100) / 100,
          plannedDate: t.plannedDate ? CalendarEngine.formatDateOnly(t.plannedDate) : undefined,
          completionPercentage: Math.round(t.completionPercentage * 100) / 100,
        });
      }
    }

    const remainingHours = Math.max(0, inScopePlannedHours - coveredHours);
    const coveragePercentage =
      inScopePlannedHours > 0 ? (coveredHours / inScopePlannedHours) * 100 : 0;

    // Available teaching hours before the exam begins
    const examStartDate = new Date(exam.startDate);
    const availableHours = CalendarEngine.calculateAvailableHours(
      referenceDate,
      examStartDate,
      saturdayRule,
      timetableSlots,
      holidays,
      campusId,
      batchId
    );

    let status: ProgressStatus = 'ON TRACK';
    let warning: string | undefined;

    if (remainingHours <= 0.0001) {
      status = 'COMPLETE';
    } else {
      const buffer = availableHours / remainingHours;
      if (buffer >= thresholds.onTrackThreshold) {
        status = 'ON TRACK';
      } else if (buffer >= thresholds.tightThreshold) {
        status = 'TIGHT';
        warning = `Tight preparation window: ${Math.round(remainingHours * 10) / 10}h syllabus remains with ${Math.round(availableHours * 10) / 10}h available.`;
      } else {
        status = 'DANGER';
        warning = `Critical Alert: Remaining syllabus (${Math.round(remainingHours * 10) / 10}h) exceeds available teaching hours (${Math.round(availableHours * 10) / 10}h) before ${exam.displayName}!`;
      }
    }

    return {
      examName: exam.name,
      displayName: exam.displayName,
      startDate: CalendarEngine.formatDateOnly(exam.startDate),
      endDate: CalendarEngine.formatDateOnly(exam.endDate),
      inScopeTopicsCount: inScopeTopics.length,
      inScopePlannedHours: Math.round(inScopePlannedHours * 100) / 100,
      coveredHours: Math.round(coveredHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      availableTeachingHoursBeforeExam: Math.round(availableHours * 100) / 100,
      isReady: remainingHours <= availableHours,
      status,
      warning,
      uncoveredTopics,
    };
  }

  /**
   * Roll-up for campus, track, or batch:
   * Rule: Show WORST subject's status, not an average!
   * Identify which bottleneck subject is driving that status.
   */
  public static calculateRollup(
    entityId: string,
    entityName: string,
    type: 'CAMPUS' | 'TRACK' | 'BATCH',
    subjects: SubjectCalculationResult[]
  ): RollupResult {
    if (subjects.length === 0) {
      return {
        entityId,
        entityName,
        type,
        totalSubjects: 0,
        worstStatus: 'COMPLETE',
        bottleneckSubject: null,
        statusBreakdown: { complete: 0, onTrack: 0, tight: 0, danger: 0 },
        averageCoveragePercentage: 0,
        totalPlannedHours: 0,
        totalCoveredHours: 0,
      };
    }

    const breakdown = {
      complete: 0,
      onTrack: 0,
      tight: 0,
      danger: 0,
    };

    let totalPlanned = 0;
    let totalCovered = 0;

    for (const sub of subjects) {
      totalPlanned += sub.hoursInScope;
      totalCovered += sub.coveredHours;

      if (sub.status === 'COMPLETE') breakdown.complete++;
      else if (sub.status === 'ON TRACK') breakdown.onTrack++;
      else if (sub.status === 'TIGHT') breakdown.tight++;
      else if (sub.status === 'DANGER') breakdown.danger++;
    }

    // Determine worst status: DANGER > TIGHT > ON TRACK > COMPLETE
    let worstStatus: ProgressStatus = 'COMPLETE';
    let bottleneckSubject: RollupResult['bottleneckSubject'] = null;

    if (breakdown.danger > 0) {
      worstStatus = 'DANGER';
      // Bottleneck is the danger subject with the lowest buffer ratio
      const dangerSubjects = subjects.filter((s) => s.status === 'DANGER');
      dangerSubjects.sort((a, b) => a.bufferRatio - b.bufferRatio);
      const worst = dangerSubjects[0];
      bottleneckSubject = {
        id: worst.subjectId,
        code: worst.subjectCode,
        name: worst.subjectName,
        status: worst.status,
        bufferRatio: worst.bufferRatio,
      };
    } else if (breakdown.tight > 0) {
      worstStatus = 'TIGHT';
      const tightSubjects = subjects.filter((s) => s.status === 'TIGHT');
      tightSubjects.sort((a, b) => a.bufferRatio - b.bufferRatio);
      const worst = tightSubjects[0];
      bottleneckSubject = {
        id: worst.subjectId,
        code: worst.subjectCode,
        name: worst.subjectName,
        status: worst.status,
        bufferRatio: worst.bufferRatio,
      };
    } else if (breakdown.onTrack > 0) {
      worstStatus = 'ON TRACK';
      const onTrackSubjects = subjects.filter((s) => s.status === 'ON TRACK');
      onTrackSubjects.sort((a, b) => a.bufferRatio - b.bufferRatio);
      const worst = onTrackSubjects[0];
      bottleneckSubject = {
        id: worst.subjectId,
        code: worst.subjectCode,
        name: worst.subjectName,
        status: worst.status,
        bufferRatio: worst.bufferRatio,
      };
    } else {
      worstStatus = 'COMPLETE';
      bottleneckSubject = null;
    }

    const averageCoveragePercentage =
      totalPlanned > 0
        ? Math.round((totalCovered / totalPlanned) * 10000) / 100
        : 100;

    return {
      entityId,
      entityName,
      type,
      totalSubjects: subjects.length,
      worstStatus,
      bottleneckSubject,
      statusBreakdown: breakdown,
      averageCoveragePercentage,
      totalPlannedHours: Math.round(totalPlanned * 100) / 100,
      totalCoveredHours: Math.round(totalCovered * 100) / 100,
    };
  }
}
