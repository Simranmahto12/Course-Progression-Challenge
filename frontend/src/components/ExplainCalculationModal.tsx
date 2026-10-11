import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { apiRequest } from '../services/api';

interface ExplainModalProps {
  subjectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExplainCalculationModal: React.FC<ExplainModalProps> = ({
  subjectId,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && subjectId) {
      setLoading(true);
      setError(null);
      apiRequest(`/subjects/${subjectId}/explain-calculation`)
        .then((res) => setData(res))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, subjectId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Deterministic Planned Dates Audit
              </h2>
              <p className="text-xs text-slate-500">
                Detailed calendar day steps, Saturday rules, and timetable slot consumption
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-700">
          {loading && (
            <div className="py-16 text-center text-slate-500">
              <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
              Walking calendar days and timetable schedule...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Saturday Rule</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{data.saturdayRule}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Weekly Teaching</div>
                  <div className="text-sm font-semibold text-indigo-600 mt-1">{data.totalTimetableHoursPerWeek} hrs / week</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Semester Start</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {data.semesterDates.start ? data.semesterDates.start.slice(0, 10) : 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Target Finish</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {data.semesterDates.targetFinish ? data.semesterDates.targetFinish.slice(0, 10) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Day Steps Table */}
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span>Calendar Progression Steps ({data.steps?.length || 0} days inspected)</span>
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Weekday</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Hours</th>
                        <th className="py-2.5 px-4">Topic(s) Covered / Assigned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.steps?.map((step: any, idx: number) => (
                        <tr
                          key={idx}
                          className={
                            step.topicsAllocated.length > 0
                              ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                              : !step.isWorkingDay
                              ? 'bg-slate-50/60 text-slate-400'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-2 px-3 font-mono font-medium">{step.date}</td>
                          <td className="py-2 px-3">{step.weekdayName}</td>
                          <td className="py-2 px-3">
                            {step.isWorkingDay ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3 h-3" /> Working
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium" title={step.reason}>
                                Off ({step.reason?.slice(0, 24)}...)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {step.scheduledHours > 0 ? `${step.scheduledHours}h` : '-'}
                          </td>
                          <td className="py-2 px-4">
                            {step.topicsAllocated.length > 0 ? (
                              <div className="space-y-1">
                                {step.topicsAllocated.map((t: any, i: number) => (
                                  <div key={i} className="flex items-center gap-1.5 font-medium text-slate-800">
                                    <ChevronRight className="w-3 h-3 text-indigo-500" />
                                    <span>{t.topicName}</span>
                                    <span className="text-indigo-600 text-[11px]">({t.hoursAllocated}h)</span>
                                    {t.completedOnThisDay && (
                                      <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                        TARGET DATE
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
