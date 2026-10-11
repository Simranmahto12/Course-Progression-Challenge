export type Role = 'ADMIN' | 'CAMPUS_MANAGER' | 'FACULTY' | 'STUDENT';
export type ProgressStatus = 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  campus?: { id: string; name: string };
  batch?: { id: string; name: string };
}

export interface ProgressionMetrics {
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
  status: ProgressStatus;
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

export interface Topic {
  id: string;
  unit: string;
  sequence: number;
  name: string;
  description?: string;
  plannedHours: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completionPercentage: number;
  coveredHours: number;
  plannedDate?: string | null;
  actualDate?: string | null;
  examScopes: string;
  prerequisites?: string;
}

export interface ExamReadiness {
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

export interface Subject {
  id: string;
  code: string;
  name: string;
  campusId: string;
  campus?: { id: string; name: string };
  track?: { id: string; name: string };
  batch?: { id: string; name: string };
  faculty?: { id: string; name: string; email: string };
  plannedHours: number;
  targetFinishDate: string;
  color?: string;
  topics?: Topic[];
  progression?: ProgressionMetrics;
  examReadiness?: ExamReadiness[];
}

export interface ScheduledSession {
  id: string;
  subjectId: string;
  subject: Subject;
  faculty: { id: string; name: string; email: string };
  batch: { id: string; name: string };
  campus: { id: string; name: string };
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: string;
  hasLog: boolean;
  expectedTopic?: Topic;
  sessionLog?: {
    id: string;
    status: string;
    actualHours: number;
    topicsCovered: string;
    whatWasCovered?: string;
    whatWasLeftOver?: string;
    carryForwardAction?: string;
    classworkStatus?: string;
    notes?: string;
    loggedAt: string;
  };
}

export interface AlertItem {
  id: string;
  subjectId: string;
  subject: { id: string; code: string; name: string };
  recipientUserId: string;
  recipientUser: { id: string; name: string; email: string; role: string };
  type: 'FACULTY_REMINDER' | 'CAMPUS_MANAGER_ESCALATION';
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED';
  hoursUnlogged: number;
  scheduledDate: string;
  createdAt: string;
}

export interface Rollup {
  entityId: string;
  entityName: string;
  type: string;
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
