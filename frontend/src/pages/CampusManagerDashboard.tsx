import React, { useState, useEffect } from 'react';
import {
  Building2,
  AlertTriangle,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Rollup, Subject } from '../types';
import { apiRequest } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ExplainCalculationModal } from '../components/ExplainCalculationModal';

export const CampusManagerDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [explainSubjectId, setExplainSubjectId] = useState<string | null>(null);
  const [explainModalOpen, setExplainModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboard/campus-manager');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
        Loading Campus Manager operational view...
      </div>
    );
  }

  const rollup: Rollup = data?.rollup;
  const trackRollups: Rollup[] = data?.trackRollups || [];
  const subjects: Subject[] = data?.subjects || [];
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-indigo-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            <span>Campus Operational Operations • {data?.campus?.name || 'HI-Tech'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Campus Manager Dashboard</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Worst-case subject status, missing session escalations, and track syllabus health.
          </p>
        </div>

        {rollup && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center sm:text-right">
            <div className="text-xs text-indigo-200 uppercase font-bold tracking-wider">
              Worst-Subject Campus Status
            </div>
            <div className="mt-1 flex items-center justify-center sm:justify-end gap-2">
              <StatusBadge status={rollup.worstStatus} size="lg" />
            </div>
            {rollup.bottleneckSubject && (
              <div className="text-[11px] text-rose-300 font-medium mt-1">
                Driving Bottleneck: {rollup.bottleneckSubject.code} (Buffer: {rollup.bottleneckSubject.bufferRatio.toFixed(2)})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campus Summary Cards */}
      {rollup && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-xs font-semibold">Total Subjects</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{rollup.totalSubjects}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg Coverage: {rollup.averageCoveragePercentage.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
            <div className="text-emerald-700 text-xs font-semibold">On Track (≥ 1.15)</div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">
              {rollup.statusBreakdown.onTrack + rollup.statusBreakdown.complete}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Healthy buffer margins</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
            <div className="text-amber-700 text-xs font-semibold">Tight (1.00 - 1.14)</div>
            <div className="text-2xl font-bold text-amber-800 mt-1">
              {rollup.statusBreakdown.tight}
            </div>
            <div className="text-[11px] text-amber-600 mt-0.5">Requires close monitoring</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
            <div className="text-rose-700 text-xs font-semibold">Danger (&lt; 1.00)</div>
            <div className="text-2xl font-bold text-rose-800 mt-1">
              {rollup.statusBreakdown.danger}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">Syllabus deficit at risk</div>
          </div>
        </div>
      )}

      {/* TRACK BREAKDOWN: Mirai Track vs University Track */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trackRollups.map((tr) => (
          <div key={tr.entityId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">{tr.entityName}</h3>
              </div>
              <StatusBadge status={tr.worstStatus} size="sm" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Subjects:</span>
                <span className="font-bold text-slate-900">{tr.totalSubjects}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Planned Teaching:</span>
                <span className="font-semibold text-slate-800">{tr.totalPlannedHours}h</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Delivered:</span>
                <span className="font-semibold text-slate-800">{tr.totalCoveredHours}h</span>
              </div>
              {tr.bottleneckSubject && (
                <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 mt-2">
                  <span className="font-bold">Bottleneck Subject:</span> {tr.bottleneckSubject.name} ({tr.bottleneckSubject.code}) — Buffer: {tr.bottleneckSubject.bufferRatio.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ESCALATED ALERTS & MISSING LOGS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              Missing-Log Alerts & 48-Hour Manager Escalations
            </h3>
          </div>
          <span className="text-xs text-slate-500">{alerts.length} alert records</span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No active escalations. Faculty logging compliance is 100%!
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.map((al: any) => (
              <div
                key={al.id}
                className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${
                  al.type === 'CAMPUS_MANAGER_ESCALATION'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/80">
                      {al.type === 'CAMPUS_MANAGER_ESCALATION' ? '48H Escalated' : 'Faculty Reminder'}
                    </span>
                    <span className="font-bold">{al.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">{al.message}</p>
                </div>
                <div className="text-right sm:flex-shrink-0">
                  <span className="text-[11px] text-slate-500 block font-mono">
                    {al.hoursUnlogged}h unlogged
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SUBJECTS STATUS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">Campus Subjects Progression Roster</h3>
          <span className="text-xs text-slate-500">Sorted by Code</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-3">Faculty</th>
                <th className="py-3 px-3">Track</th>
                <th className="py-3 px-3">Coverage</th>
                <th className="py-3 px-3 text-right">Available</th>
                <th className="py-3 px-3 text-right">Buffer Ratio</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((sub) => {
                const prog = sub.progression;
                if (!prog) return null;

                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{sub.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{sub.code}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {sub.faculty?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{sub.track?.name}</td>
                    <td className="py-3 px-3 w-40">
                      <ProgressBar
                        coveredHours={prog.coveredHours}
                        totalHours={prog.hoursInScope}
                        percentage={prog.coveragePercentage}
                        height="sm"
                      />
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {prog.availableHours}h
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {prog.bufferRatio >= 900 ? 'Complete' : prog.bufferRatio.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={prog.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setExplainSubjectId(sub.id);
                          setExplainModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 p-1"
                        title="Explain Calculation"
                      >
                        <HelpCircle className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
