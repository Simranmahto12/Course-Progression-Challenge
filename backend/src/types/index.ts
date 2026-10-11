export type Role = 'ADMIN' | 'CAMPUS_MANAGER' | 'FACULTY' | 'STUDENT';

export type SaturdayRule = 'ALL_SATURDAYS' | 'NO_SATURDAYS' | 'SECOND_FOURTH_SATURDAY';

export type TopicStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'IN_PROGRESS' | 'SKIPPED' | 'MERGED' | 'CANCELLED';

export type AlertType = 'FACULTY_REMINDER' | 'CAMPUS_MANAGER_ESCALATION';

export type AlertStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED';

export type ProgressStatus = 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  campusId?: string | null;
  batchId?: string | null;
}

export interface TopicProgressItem {
  id: string;
  unit: string;
  sequence: number;
  name: string;
  plannedHours: number;
  status: TopicStatus;
  completionPercentage: number;
  coveredHours: number;
  plannedDate?: string | null;
  examScopes: string[];
}

export interface SubjectCalculationResult {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  campusName: string;
  trackName: string;
  facultyName?: string;
  targetFinishDate: string;
  
  // Progress calculations according to exact definitions:
  hoursInScope: number;       // Sum of planned hours for non-skipped topics
  coveredHours: number;       // Completed = 100% planned hrs, In-progress = % * planned hrs
  coveragePercentage: number; // (coveredHours / hoursInScope) * 100
  remainingHours: number;     // hoursInScope - coveredHours
  availableHours: number;     // Scheduled timetable teaching hours remaining on eligible working days
  bufferRatio: number;        // availableHours / remainingHours
  status: ProgressStatus;     // COMPLETE, ON TRACK (>=1.15), TIGHT (1.00-1.14), DANGER (<1.00)
  paceVsPlan: number;         // coveredHours - hours that should have been covered by today
  overdueTopicsCount: number; // planned date passed & not completed
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
  status: ProgressStatus;
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
  worstStatus: ProgressStatus;
  bottleneckSubject: {
    id: string;
    code: string;
    name: string;
    status: ProgressStatus;
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
