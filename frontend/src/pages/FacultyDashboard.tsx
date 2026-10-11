import React, { useState, useEffect } from 'react';
import {
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { ScheduledSession, Subject } from '../types';
import { apiRequest } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { SessionLogModal } from '../components/SessionLogModal';
import { ExplainCalculationModal } from '../components/ExplainCalculationModal';

export const FacultyDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [todaySessions, setTodaySessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [explainSubjectId, setExplainSubjectId] = useState<string | null>(null);
  const [explainModalOpen, setExplainModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, todayRes] = await Promise.all([
        apiRequest('/dashboard/faculty'),
        apiRequest('/sessions/today'),
      ]);
      setDashboardData(dashRes);
      setTodaySessions(todayRes.sessions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLog = (session: ScheduledSession) => {
    setSelectedSession(session);
    setLogModalOpen(true);
  };

  const openExplain = (subjectId: string) => {
    setExplainSubjectId(subjectId);
    setExplainModalOpen(true);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
        Loading your faculty teaching schedule and course progression...
      </div>
    );
  }

  const subjects: Subject[] = dashboardData?.subjects || [];
  const overdueTopics = dashboardData?.overdueTopics || [];
  const recoveryActions = dashboardData?.recoveryActions || [];
  const unloggedSessions = dashboardData?.unloggedSessions || [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Greeting & Unlogged Alerts */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              Faculty Workspace • Mirai School of Technology
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Teaching Progression Dashboard</h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1">
              Deterministic syllabus tracking, timetable slot consumption, and rapid mobile session logging.
            </p>
          </div>

          {unloggedSessions.length > 0 && (
            <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-300 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-200">
                  {unloggedSessions.length} Past Scheduled Class(es) Need Logging
                </span>
                <p className="text-amber-100 text-[11px] mt-0.5">
                  Unlogged classes trigger 48h escalation alerts to your Campus Manager.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TODAY'S SESSIONS (Pre-filled from timetable) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Today's Scheduled Sessions</h2>
              <p className="text-xs text-slate-500">
                Pre-filled from timetable with batch, timing, and expected syllabus topic
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            {todaySessions.length} class(es) scheduled
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
            No more classes scheduled for today. You are all set!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-md font-mono">
                      {session.subject.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{session.subject.name}</h3>
                  <div className="text-xs text-slate-500 mt-1">Batch: {session.batch.name}</div>

                  {session.expectedTopic ? (
                    <div className="mt-3 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs">
                      <span className="text-[10px] text-indigo-500 font-bold uppercase block tracking-wider">
                        Next Expected Topic
                      </span>
                      <div className="font-medium text-slate-800 truncate mt-0.5">
                        {session.expectedTopic.name}
                      </div>
                      <span className="text-[11px] text-indigo-600 font-semibold">
                        Planned: {session.expectedTopic.plannedHours}h
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400 italic">All topics covered</div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {session.hasLog ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Logged ({session.sessionLog?.status})
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending Log
                      </span>
                    )}
                  </span>

                  <button
                    onClick={() => openLog(session)}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition"
                  >
                    {session.hasLog ? 'Edit Log' : 'Quick Log (<60s)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ASSIGNED SUBJECTS CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Assigned Subject Progression Cards</span>
          </h2>
          <span className="text-xs text-slate-500">
            Weighted by planned hours • 2 decimal precision
          </span>
        </div>

        {subjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No subjects currently assigned to this faculty profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subjects.map((sub) => {
              const prog = sub.progression;
              if (!prog) return null;

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs font-bold">
                            {sub.code}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{sub.campus?.name}</span>
                          <span className="text-xs text-indigo-600 font-semibold">
                            • {sub.track?.name}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{sub.name}</h3>
                      </div>
                      <StatusBadge status={prog.status} size="lg" />
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <ProgressBar
                        coveredHours={prog.coveredHours}
                        totalHours={prog.hoursInScope}
                        percentage={prog.coveragePercentage}
                      />
                    </div>

                    {/* 4-Quadrant Metric Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl mb-3">
                      <div>
                        <div className="text-slate-400 font-medium text-[11px]">Hours in Scope</div>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">
                          {prog.hoursInScope.toFixed(1)}h
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium text-[11px]">Remaining</div>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">
                          {prog.remainingHours.toFixed(1)}h
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium text-[11px]">Timetable Avail.</div>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">
                          {prog.availableHours.toFixed(1)}h
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium text-[11px]">Buffer Ratio</div>
                        <div
                          className={`font-bold text-sm mt-0.5 ${
                            prog.bufferRatio >= 1.15
                              ? 'text-emerald-700'
                              : prog.bufferRatio >= 1.0
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {prog.bufferRatio >= 900 ? 'Complete' : prog.bufferRatio.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Pace vs Plan & Target Finish */}
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span className="flex items-center gap-1">
                        <TrendingDown
                          className={`w-3.5 h-3.5 ${
                            prog.paceVsPlan < 0 ? 'text-rose-500' : 'text-emerald-500'
                          }`}
                        />
                        Pace vs Plan:{' '}
                        <span
                          className={`font-semibold ${
                            prog.paceVsPlan < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {prog.paceVsPlan > 0 ? `+${prog.paceVsPlan}` : prog.paceVsPlan}h
                        </span>
                      </span>

                      <span className="font-mono text-slate-500">Target: {prog.targetFinishDate}</span>
                    </div>

                    {/* Overdue alert in card if any */}
                    {prog.overdueTopicsCount > 0 && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          {prog.overdueTopicsCount} topic(s) overdue
                        </span>
                        <span className="text-[11px] text-rose-600">Past target date</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => openExplain(sub.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Explain Calculation Inputs
                    </button>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {sub.topics?.length || 0} topics in plan
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OVERDUE TOPICS & REMEDIAL ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Topics Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Overdue Syllabus Topics Requiring Action</span>
          </h3>

          {overdueTopics.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
              No overdue topics! Syllabus is on schedule.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {overdueTopics.map((ot: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-800">
                      [{ot.subjectCode}] {ot.name}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Planned date: <span className="font-mono text-rose-700">{ot.plannedDate}</span> • Planned: {ot.plannedHours}h
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded font-bold text-[10px]">
                      {ot.completionPercentage}% Done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recovery Actions & Reminders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Recommended Recovery Actions</span>
          </h3>

          {recoveryActions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
              All subjects meet or exceed the 1.15 buffer threshold. No remedial actions required.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {recoveryActions.map((ra: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900">
                      [{ra.subjectCode}] {ra.subjectName}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">
                      Buffer: {ra.bufferRatio}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{ra.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <SessionLogModal
        session={selectedSession}
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={loadData}
      />

      {explainSubjectId && (
        <ExplainCalculationModal
          subjectId={explainSubjectId}
          isOpen={explainModalOpen}
          onClose={() => setExplainModalOpen(false)}
        />
      )}
    </div>
  );
};
