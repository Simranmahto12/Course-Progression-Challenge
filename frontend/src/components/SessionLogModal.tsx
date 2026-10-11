import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, BookOpen, AlertCircle, History, Sparkles } from 'lucide-react';
import { ScheduledSession, Topic } from '../types';
import { apiRequest } from '../services/api';

interface SessionLogModalProps {
  session: ScheduledSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SessionLogModal: React.FC<SessionLogModalProps> = ({
  session,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<string>('COMPLETED');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [completionPercentage, setCompletionPercentage] = useState<number>(100);
  const [whatWasCovered, setWhatWasCovered] = useState<string>('');
  const [whatWasLeftOver, setWhatWasLeftOver] = useState<string>('');
  const [carryForwardAction, setCarryForwardAction] = useState<string>('');
  const [classworkStatus, setClassworkStatus] = useState<string>('NONE');
  const [notes, setNotes] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'log' | 'audit'>('log');

  useEffect(() => {
    if (session && isOpen) {
      setError(null);
      // Fetch subject topics
      apiRequest(`/subjects/${session.subjectId}`)
        .then((res) => {
          const topics = res.subject.topics || [];
          setAvailableTopics(topics);

          // Pre-fill expected topic
          if (session.expectedTopic) {
            setSelectedTopicId(session.expectedTopic.id);
            setWhatWasCovered(`Covered core material for: ${session.expectedTopic.name}`);
          } else if (topics.length > 0) {
            setSelectedTopicId(topics[0].id);
            setWhatWasCovered(`Covered topic: ${topics[0].name}`);
          }
        })
        .catch(console.error);

      // If already logged, load previous values and audit history
      if (session.sessionLog) {
        setStatus(session.sessionLog.status);
        setWhatWasCovered(session.sessionLog.whatWasCovered || '');
        setWhatWasLeftOver(session.sessionLog.whatWasLeftOver || '');
        setCarryForwardAction(session.sessionLog.carryForwardAction || '');
        setClassworkStatus(session.sessionLog.classworkStatus || 'NONE');
        setNotes(session.sessionLog.notes || '');

        apiRequest(`/sessions/audit-history/${session.sessionLog.id}`)
          .then((res) => setAuditHistory(res.auditHistory || []))
          .catch(console.error);
      } else {
        setStatus('COMPLETED');
        setCompletionPercentage(100);
        setWhatWasLeftOver('');
        setCarryForwardAction('');
        setClassworkStatus('NONE');
        setNotes('');
        setAuditHistory([]);
      }
    }
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === 'COMPLETED') {
      setCompletionPercentage(100);
    } else if (newStatus === 'IN_PROGRESS' && completionPercentage === 100) {
      setCompletionPercentage(50);
    } else if (newStatus === 'CANCELLED' || newStatus === 'SKIPPED') {
      setCompletionPercentage(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const selectedTopic = availableTopics.find((t) => t.id === selectedTopicId);
      const topicsCovered = selectedTopicId
        ? [
            {
              topicId: selectedTopicId,
              topicName: selectedTopic?.name,
              completionPercentage,
              hoursLogged: session.durationHours,
            },
          ]
        : [];

      if (session.sessionLog) {
        // Edit flow
        await apiRequest(`/sessions/log/${session.sessionLog.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status,
            actualHours: session.durationHours,
            topicsCovered,
            whatWasCovered,
            whatWasLeftOver,
            carryForwardAction,
            classworkStatus,
            notes,
            reason: 'Faculty updated session log',
          }),
        });
      } else {
        // Create flow
        await apiRequest('/sessions/log', {
          method: 'POST',
          body: JSON.stringify({
            scheduledSessionId: session.id,
            status,
            actualHours: session.durationHours,
            topicsCovered,
            whatWasCovered,
            whatWasLeftOver,
            carryForwardAction,
            classworkStatus,
            notes,
          }),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit session log');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {session.subject.code} — Session Log
              </h2>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {session.startTime} - {session.endTime} ({session.durationHours}h)
                </span>
                <span>•</span>
                <span>{session.batch.name}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch if audit exists */}
        {session.sessionLog && (
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('log')}
              className={`py-2 px-3 border-b-2 transition ${
                activeTab === 'log'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Session Details
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Trail ({auditHistory.length})
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'audit' ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                Revision History
              </h4>
              {auditHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No audit logs found.</div>
              ) : (
                auditHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">{item.changedByUser.name}</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-indigo-600 font-mono text-[11px] mb-1">Action: {item.action}</div>
                    {item.reason && <div className="text-slate-600 italic">Reason: "{item.reason}"</div>}
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Session Outcome <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {['COMPLETED', 'IN_PROGRESS', 'SKIPPED', 'MERGED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition text-center ${
                        status === st
                          ? st === 'COMPLETED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : st === 'IN_PROGRESS'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : st === 'CANCELLED'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Covered Dropdown */}
              {status !== 'CANCELLED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>Topic Covered</span>
                    {session.expectedTopic && (
                      <span className="text-[11px] text-indigo-600 font-normal flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Timetable Expectation: {session.expectedTopic.name}
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => {
                      setSelectedTopicId(e.target.value);
                      const t = availableTopics.find((top) => top.id === e.target.value);
                      if (t && !whatWasCovered) {
                        setWhatWasCovered(`Covered: ${t.name}`);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- Select Syllabus Topic --</option>
                    {availableTopics.map((top) => (
                      <option key={top.id} value={top.id}>
                        Seq {top.sequence} [{top.unit}]: {top.name} ({top.plannedHours}h planned - {top.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* In Progress Slider / Percentage Chips */}
              {status === 'IN_PROGRESS' && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-900 mb-1.5">
                    <span>Topic Completion Percentage:</span>
                    <span className="text-base font-bold text-blue-700">{completionPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={completionPercentage}
                    onChange={(e) => setCompletionPercentage(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 cursor-pointer mb-2"
                  />
                  <div className="flex justify-between gap-1 text-[11px]">
                    {[25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCompletionPercentage(pct)}
                        className={`flex-1 py-1 rounded-lg border text-center transition font-semibold ${
                          completionPercentage === pct
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* What was covered & Left Over */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    What Was Covered
                  </label>
                  <textarea
                    rows={2}
                    value={whatWasCovered}
                    onChange={(e) => setWhatWasCovered(e.target.value)}
                    placeholder="Key concepts or derivations taught today..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Left Over / Next Step
                  </label>
                  <textarea
                    rows={2}
                    value={whatWasLeftOver}
                    onChange={(e) => setWhatWasLeftOver(e.target.value)}
                    placeholder="Remaining examples or lab exercises..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Classwork / Homework Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Classwork / Homework State
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['NONE', 'GIVEN', 'COLLECTED', 'REVIEWED'].map((cw) => (
                    <button
                      key={cw}
                      type="button"
                      onClick={() => setClassworkStatus(cw)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition text-center ${
                        classworkStatus === cw
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Faculty Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Good student participation, need more practice questions on gradient descent"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>{session.sessionLog ? 'Update Session Log' : 'Save Session Log (<60s)'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
