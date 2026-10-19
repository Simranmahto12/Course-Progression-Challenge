import { db } from '../db.js';

export interface TopicRecord {
  id: string;
  subject_id: string;
  unit_name: string;
  topic_name: string;
  planned_hours: number;
  exam_scope_flag: string;
  sequence: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  percentage_complete: number;
  planned_date?: string | null;
}

export interface TimetableSlot {
  id: string;
  batch_id: string;
  subject_id: string;
  faculty_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface SubjectCalculationResult {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  campusName: string;
  trackName: string;
  facultyName?: string;
  targetFinishDate: string;
  hoursInScope: number;
  coveredHours: number;
  coveragePercentage: number;
  remainingHours: number;
  availableHours: number;
  bufferRatio: number;
  status: 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';
  paceVsPlan: number;
  overdueTopicsCount: number;
  overdueTopics: Array<{
    id: string;
    sequence: number;
    name: string;
    plannedDate: string;
    plannedHours: number;
    completionPercentage: number;
  }>;
}

export interface ExamReadinessResult {
  examName: string;
  displayName: string;
  startDate: string;
  endDate: string;
  inScopeTopicsCount: number;
  inScopePlannedHours: number;
  coveredHours: number;
  remainingHours: number;
  coveragePercentage: number;
  availableTeachingHoursBeforeExam: number;
  isReady: boolean;
  status: 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';
  warning?: string;
  uncoveredTopics: Array<{
    id: string;
    name: string;
    plannedHours: number;
    plannedDate?: string;
    completionPercentage: number;
  }>;
}

export interface RollupResult {
  entityId: string;
  entityName: string;
  type: 'CAMPUS' | 'TRACK' | 'BATCH';
  totalSubjects: number;
  worstStatus: 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';
  bottleneckSubject: {
    id: string;
    code: string;
    name: string;
    status: 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';
    bufferRatio: number;
  } | null;
  statusBreakdown: {
    complete: number;
    onTrack: number;
    tight: number;
    danger: number;
  };
  averageCoveragePercentage: number;
  totalPlannedHours: number;
  totalCoveredHours: number;
}

export class CalculationEngine {
  /**
   * Helper: Parse "HH:MM" to decimal hours (e.g. "09:30" -> 9.5)
   */
  public static timeToHours(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  }

  /**
   * Helper: Calculate topic covered hours
   * - Completed: 100% of planned_hours
   * - In Progress: planned_hours * (percentage_complete / 100)
   * - Skipped / Pending: 0
   */
  public static calculateTopicCoveredHours(topic: {
    status: string;
    planned_hours: number;
    percentage_complete?: number;
  }): number {
    if (topic.status === 'SKIPPED') return 0;
    if (topic.status === 'COMPLETED') return topic.planned_hours;
    if (topic.status === 'IN_PROGRESS') {
      const pct = Math.max(0, Math.min(100, topic.percentage_complete || 0));
      return Math.round(topic.planned_hours * (pct / 100) * 100) / 100;
    }
    return 0;
  }

  /**
   * Check if a specific date is a working day given Saturday rules and holiday list
   */
  public static isWorkingDay(
    date: Date,
    saturdayRule: string,
    holidays: string[]
  ): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Sunday is always non-working
    if (dayOfWeek === 0) return false;

    // Check holiday list (YYYY-MM-DD)
    const dateStr = date.toISOString().split('T')[0];
    if (holidays.includes(dateStr)) return false;

    // Weekdays (Monday - Friday) are working days
    if (dayOfWeek >= 1 && dayOfWeek <= 5) return true;

    // Saturday logic
    if (dayOfWeek === 6) {
      if (saturdayRule === 'ALL_SATURDAYS') return true;
      if (saturdayRule === 'NO_SATURDAYS') return false;
      if (saturdayRule === 'SECOND_FOURTH_SATURDAY') {
        // Occurrence of Saturday in month: 1st, 2nd, 3rd, 4th, 5th
        const satIndex = Math.floor((date.getDate() - 1) / 7) + 1;
        // 2nd and 4th are holidays
        if (satIndex === 2 || satIndex === 4) return false;
        return true;
      }
    }

    return true;
  }

  /**
   * Calculate available teaching hours between referenceDate and targetDate
   */
  public static calculateAvailableHours(
    startDate: Date,
    endDate: Date,
    saturdayRule: string,
    timetableSlots: TimetableSlot[],
    holidays: string[],
    cancelledDates: string[] = []
  ): number {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let totalHours = 0;

    // Normalize start to beginning of day
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const finish = new Date(endDate);
    finish.setHours(23, 59, 59, 999);

    if (current > finish) return 0;

    while (current <= finish) {
      const dateStr = current.toISOString().split('T')[0];
      const isWorking = this.isWorkingDay(current, saturdayRule, holidays);

      if (isWorking && !cancelledDates.includes(dateStr)) {
        const dayName = dayNames[current.getDay()];
        // Find matching timetable slots for this day
        const matchingSlots = timetableSlots.filter((slot) => slot.day_of_week === dayName);

        for (const slot of matchingSlots) {
          const duration = this.timeToHours(slot.end_time) - this.timeToHours(slot.start_time);
          if (duration > 0) {
            totalHours += duration;
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return Math.round(totalHours * 100) / 100;
  }

  /**
   * Calculate comprehensive progress metrics for a subject
   */
  public static calculateSubjectProgress(
    subjectId: string,
    referenceDate: Date = new Date()
  ): SubjectCalculationResult | null {
    const subject = db.prepare(`
      SELECT s.*, b.name as batch_name, c.name as campus_name, c.id as campus_id,
             t.name as track_name, u.name as faculty_name
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE s.id = ?
    `).get(subjectId) as any;

    if (!subject) return null;

    // Get semester rules and holidays for this campus
    const semester = db.prepare(`
      SELECT * FROM semesters WHERE campus_id = ? ORDER BY start_date DESC LIMIT 1
    `).get(subject.campus_id) as any;

    const saturdayRule = semester?.working_saturdays_rule || 'SECOND_FOURTH_SATURDAY';
    let holidays: string[] = [];
    if (semester?.holidays_json) {
      try {
        const parsed = JSON.parse(semester.holidays_json);
        holidays = Array.isArray(parsed) ? parsed.map((h: any) => (typeof h === 'string' ? h : h.date)) : [];
      } catch (e) {
        holidays = [];
      }
    }

    // Get timetable slots for this subject
    const timetableSlots = db.prepare(`
      SELECT * FROM timetables WHERE subject_id = ?
    `).all(subjectId) as TimetableSlot[];

    // Get cancelled logs
    const cancelledLogs = db.prepare(`
      SELECT session_date FROM daily_logs dl
      JOIN timetables tt ON dl.timetable_id = tt.id
      WHERE tt.subject_id = ? AND dl.status = 'Cancelled'
    `).all(subjectId) as Array<{ session_date: string }>;
    const cancelledDates = cancelledLogs.map((l) => l.session_date);

    // Get topics
    const topics = db.prepare(`
      SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
    `).all(subjectId) as TopicRecord[];

    const todayStr = referenceDate.toISOString().split('T')[0];

    // 1. Hours in Scope: Sum of planned_hours for all non-skipped topics
    let hoursInScope = 0;
    let coveredHours = 0;
    let plannedHoursToDate = 0;
    const overdueTopics: SubjectCalculationResult['overdueTopics'] = [];

    for (const topic of topics) {
      if (topic.status === 'SKIPPED') continue;

      hoursInScope += topic.planned_hours;
      const topicCovered = this.calculateTopicCoveredHours({
        status: topic.status,
        planned_hours: topic.planned_hours,
        percentage_complete: topic.percentage_complete,
      });
      coveredHours += topicCovered;

      if (topic.planned_date) {
        if (topic.planned_date <= todayStr) {
          plannedHoursToDate += topic.planned_hours;

          const isFullyCovered = topic.status === 'COMPLETED' || topic.percentage_complete >= 100;
          if (!isFullyCovered && topic.planned_date < todayStr) {
            overdueTopics.push({
              id: topic.id,
              sequence: topic.sequence,
              name: topic.topic_name,
              plannedDate: topic.planned_date,
              plannedHours: topic.planned_hours,
              completionPercentage: topic.percentage_complete,
            });
          }
        }
      }
    }

    // 2. Remaining Hours
    const remainingHours = Math.max(0, hoursInScope - coveredHours);

    // 3. Coverage %
    const coveragePercentage = hoursInScope > 0 ? (coveredHours / hoursInScope) * 100 : 0;

    // 4. Available Teaching Hours from today to targetFinishDate
    const targetDate = new Date(subject.target_finish_date);
    const availableHours = this.calculateAvailableHours(
      referenceDate,
      targetDate,
      saturdayRule,
      timetableSlots,
      holidays,
      cancelledDates
    );

    // 5. Buffer Ratio: Available Teaching Hours / Remaining Planned Hours
    let bufferRatio = 0;
    let status: 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER' = 'ON TRACK';

    if (remainingHours <= 0.001) {
      bufferRatio = 999.99;
      status = 'COMPLETE';
    } else {
      bufferRatio = Math.round((availableHours / remainingHours) * 100) / 100;
      if (bufferRatio >= 1.15) {
        status = 'ON TRACK';
      } else if (bufferRatio >= 1.00) {
        status = 'TIGHT';
      } else {
        status = 'DANGER';
      }
    }

    // 6. Pace vs Plan
    const paceVsPlan = Math.round((coveredHours - plannedHoursToDate) * 100) / 100;

    return {
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      campusName: subject.campus_name,
      trackName: subject.track_name,
      facultyName: subject.faculty_name || 'Unassigned',
      targetFinishDate: subject.target_finish_date,
      hoursInScope: Math.round(hoursInScope * 100) / 100,
      coveredHours: Math.round(coveredHours * 100) / 100,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      availableHours: Math.round(availableHours * 100) / 100,
      bufferRatio,
      status,
      paceVsPlan,
      overdueTopicsCount: overdueTopics.length,
      overdueTopics,
    };
  }

  /**
   * Worst-Subject Roll-Up across a Campus, Track, or entire Program
   * RULE: The rolled-up status reflects the WORST subject (MIN buffer_ratio), never an average!
   */
  public static calculateRollup(
    entityId: string,
    entityName: string,
    type: 'CAMPUS' | 'TRACK' | 'BATCH',
    subjectResults: SubjectCalculationResult[]
  ): RollupResult {
    if (subjectResults.length === 0) {
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
    let totalCoveragePct = 0;
    let worstSubject: SubjectCalculationResult = subjectResults[0];

    const statusSeverity: Record<string, number> = {
      DANGER: 4,
      TIGHT: 3,
      'ON TRACK': 2,
      COMPLETE: 1,
    };

    for (const sub of subjectResults) {
      totalPlanned += sub.hoursInScope;
      totalCovered += sub.coveredHours;
      totalCoveragePct += sub.coveragePercentage;

      if (sub.status === 'COMPLETE') breakdown.complete++;
      else if (sub.status === 'ON TRACK') breakdown.onTrack++;
      else if (sub.status === 'TIGHT') breakdown.tight++;
      else if (sub.status === 'DANGER') breakdown.danger++;

      // Bottleneck comparison: higher severity, or lower buffer ratio when status is identical
      const currentSev = statusSeverity[sub.status] || 0;
      const worstSev = statusSeverity[worstSubject.status] || 0;

      if (currentSev > worstSev) {
        worstSubject = sub;
      } else if (currentSev === worstSev && sub.bufferRatio < worstSubject.bufferRatio) {
        worstSubject = sub;
      }
    }

    return {
      entityId,
      entityName,
      type,
      totalSubjects: subjectResults.length,
      worstStatus: worstSubject.status,
      bottleneckSubject: {
        id: worstSubject.subjectId,
        code: worstSubject.subjectCode,
        name: worstSubject.subjectName,
        status: worstSubject.status,
        bufferRatio: worstSubject.bufferRatio,
      },
      statusBreakdown: breakdown,
      averageCoveragePercentage: Math.round((totalCoveragePct / subjectResults.length) * 10) / 10,
      totalPlannedHours: Math.round(totalPlanned * 10) / 10,
      totalCoveredHours: Math.round(totalCovered * 10) / 10,
    };
  }

  /**
   * Exam Readiness calculation for a subject and exam
   */
  public static calculateExamReadiness(
    subjectId: string,
    exam: { id: string; name: string; display_name: string; start_date: string; end_date: string },
    referenceDate: Date = new Date()
  ): ExamReadinessResult | null {
    const subject = db.prepare(`
      SELECT s.*, b.campus_id FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      WHERE s.id = ?
    `).get(subjectId) as any;

    if (!subject) return null;

    const semester = db.prepare(`
      SELECT * FROM semesters WHERE campus_id = ? ORDER BY start_date DESC LIMIT 1
    `).get(subject.campus_id) as any;

    const saturdayRule = semester?.working_saturdays_rule || 'SECOND_FOURTH_SATURDAY';
    let holidays: string[] = [];
    if (semester?.holidays_json) {
      try {
        const parsed = JSON.parse(semester.holidays_json);
        holidays = Array.isArray(parsed) ? parsed.map((h: any) => (typeof h === 'string' ? h : h.date)) : [];
      } catch (e) {
        holidays = [];
      }
    }

    const timetableSlots = db.prepare(`
      SELECT * FROM timetables WHERE subject_id = ?
    `).all(subjectId) as TimetableSlot[];

    const topics = db.prepare(`
      SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
    `).all(subjectId) as TopicRecord[];

    // Filter topics in scope for this exam
    const examKeyword = exam.name.toUpperCase();
    const inScopeTopics = topics.filter((t) => {
      if (t.status === 'SKIPPED') return false;
      const flags = (t.exam_scope_flag || '').toUpperCase().split(',');
      return flags.some((f) => f.trim().includes(examKeyword) || examKeyword.includes(f.trim()));
    });

    let inScopePlannedHours = 0;
    let coveredHours = 0;
    const uncoveredTopics: ExamReadinessResult['uncoveredTopics'] = [];

    for (const t of inScopeTopics) {
      inScopePlannedHours += t.planned_hours;
      const covered = this.calculateTopicCoveredHours({
        status: t.status,
        planned_hours: t.planned_hours,
        percentage_complete: t.percentage_complete,
      });
      coveredHours += covered;

      if (t.status !== 'COMPLETED' && t.percentage_complete < 100) {
        uncoveredTopics.push({
          id: t.id,
          name: t.topic_name,
          plannedHours: t.planned_hours,
          plannedDate: t.planned_date || undefined,
          completionPercentage: t.percentage_complete,
        });
      }
    }

    const remainingHours = Math.max(0, inScopePlannedHours - coveredHours);
    const coveragePercentage = inScopePlannedHours > 0 ? (coveredHours / inScopePlannedHours) * 100 : 0;

    // Available teaching hours before the exam begins
    const examStartDate = new Date(exam.start_date);
    const availableHours = this.calculateAvailableHours(
      referenceDate,
      examStartDate,
      saturdayRule,
      timetableSlots,
      holidays
    );

    let status: 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER' = 'ON TRACK';
    let warning: string | undefined;

    if (remainingHours <= 0.001) {
      status = 'COMPLETE';
    } else {
      const buffer = remainingHours > 0 ? availableHours / remainingHours : 999;
      if (buffer >= 1.15) {
        status = 'ON TRACK';
      } else if (buffer >= 1.00) {
        status = 'TIGHT';
        warning = `Tight preparation: ${Math.round(remainingHours * 10) / 10}h syllabus remains with ${Math.round(availableHours * 10) / 10}h available.`;
      } else {
        status = 'DANGER';
        warning = `Critical Alert: Remaining syllabus (${Math.round(remainingHours * 10) / 10}h) exceeds available teaching hours (${Math.round(availableHours * 10) / 10}h) before ${exam.display_name}!`;
      }
    }

    return {
      examName: exam.name,
      displayName: exam.display_name,
      startDate: exam.start_date,
      endDate: exam.end_date,
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
}
