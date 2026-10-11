import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest('/dashboard/student')
      .then((res) => {
        setData(res);
        if (res.subjects && res.subjects.length > 0) {
          setSelectedSubjectId(res.subjects[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
        Loading student syllabus roadmap...
      </div>
    );
  }

  const batch = data?.batch;
  const subjects = data?.subjects || [];
  const upcomingExams = data?.upcomingExams || [];
  const activeSubject = subjects.find((s: any) => s.id === selectedSubjectId) || subjects[0];

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-indigo-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-300" />
            <span>Student Portal • {batch?.campusName || 'HI-Tech'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">
            {batch?.name || 'BTech CSE (AI/ML) - Batch A'}
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1">
            Track syllabus topics covered, planned dates, and upcoming examination scopes.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-xs text-indigo-100">
          Semester: <span className="font-bold text-white">{batch?.semesterName}</span>
        </div>
      </div>

      {/* UPCOMING EXAMS COUNTDOWN & SCOPES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Upcoming Semester Examinations & Syllabus Windows</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {upcomingExams.map((exam: any) => (
            <div
              key={exam.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                  {exam.name.replace('_', ' ')}
                </span>
                <h3 className="font-bold text-slate-900 text-xs">{exam.displayName}</h3>
                <div className="text-[11px] text-slate-500 font-mono mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {exam.startDate ? exam.startDate.slice(0, 10) : 'TBD'} to {exam.endDate ? exam.endDate.slice(0, 10) : 'TBD'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUBJECTS PROGRESSION GRID */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Enrolled Semester Subjects</span>
        </h2>

        {subjects.length === 0 ? (
          <div className="bg-white p-8 text-center text-slate-400 text-xs rounded-2xl border border-slate-200">
            No subjects currently configured for your batch.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub: any) => (
              <div
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedSubjectId === sub.id
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-sm ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {sub.code}
                    </span>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{sub.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">Faculty: {sub.facultyName}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <ProgressBar
                    coveredHours={sub.coveredHours}
                    totalHours={sub.hoursInScope}
                    percentage={sub.coveragePercentage}
                    height="sm"
                  />
                  <div className="text-right mt-1.5">
                    <span className="text-[11px] text-indigo-600 font-semibold flex items-center justify-end gap-1">
                      View Syllabus Breakdown <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED TOPIC BREAKDOWN FOR SELECTED SUBJECT */}
      {activeSubject && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600">
                {activeSubject.code}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {activeSubject.name} — Syllabus Roadmap
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                {activeSubject.coveredHours.toFixed(1)}h taught of {activeSubject.hoursInScope.toFixed(1)}h total
              </span>
              <StatusBadge status={activeSubject.status} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Completed Topics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Topics Taught So Far ({activeSubject.coveredTopics?.length || 0})</span>
              </h4>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {activeSubject.coveredTopics?.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-4">
                    Classes in session. No topics completed yet.
                  </div>
                ) : (
                  activeSubject.coveredTopics.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{t.name}</div>
                        <div className="text-[11px] text-slate-500">{t.unit}</div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        {t.plannedHours}h ✓
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Next Planned Topics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Upcoming Next Topics ({activeSubject.nextPlannedTopics?.length || 0})</span>
              </h4>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {activeSubject.nextPlannedTopics?.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-4">
                    All planned syllabus topics have been taught!
                  </div>
                ) : (
                  activeSubject.nextPlannedTopics.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{t.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {t.unit} • Expected: {t.plannedDate ? t.plannedDate.slice(0, 10) : 'Scheduled'}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {t.plannedHours}h
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
