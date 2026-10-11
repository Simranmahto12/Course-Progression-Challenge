import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  HelpCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Subject, Topic } from '../types';
import { apiRequest } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ExplainCalculationModal } from '../components/ExplainCalculationModal';
import { useAuth } from '../context/AuthContext';

export const SubjectManagement: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [explainSubjectId, setExplainSubjectId] = useState<string | null>(null);
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // New Topic Form State
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [topicUnit, setTopicUnit] = useState('Unit 1');
  const [topicSeq, setTopicSeq] = useState(1);
  const [topicName, setTopicName] = useState('');
  const [topicHours, setTopicHours] = useState('2.0');
  const [topicScopes, setTopicScopes] = useState('MID_TERM,END_TERM');
  const [topicError, setTopicError] = useState<string | null>(null);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/subjects');
      setSubjects(res.subjects || []);
      if (res.subjects && res.subjects.length > 0) {
        if (!selectedSubject) {
          setSelectedSubject(res.subjects[0]);
        } else {
          const updated = res.subjects.find((s: Subject) => s.id === selectedSubject.id);
          setSelectedSubject(updated || res.subjects[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleRecalculateDates = async (subjectId: string) => {
    setRecalculating(true);
    try {
      await apiRequest(`/subjects/${subjectId}/recalculate-dates`, { method: 'POST' });
      await loadSubjects();
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setTopicError(null);

    const hours = parseFloat(topicHours);
    if (isNaN(hours) || hours <= 0) {
      setTopicError('Planned hours must be a positive number.');
      return;
    }

    try {
      await apiRequest(`/subjects/${selectedSubject.id}/topics`, {
        method: 'POST',
        body: JSON.stringify({
          unit: topicUnit,
          sequence: topicSeq,
          name: topicName,
          plannedHours: hours,
          examScopes: topicScopes,
        }),
      });

      setNewTopicOpen(false);
      setTopicName('');
      setTopicSeq((prev) => prev + 1);
      // Recalculate planned dates automatically
      await handleRecalculateDates(selectedSubject.id);
    } catch (err: any) {
      setTopicError(err.message || 'Failed to create topic');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!selectedSubject) return;
    if (!window.confirm('Are you sure you want to delete this topic from the lesson plan?')) return;

    try {
      await apiRequest(`/subjects/${selectedSubject.id}/topics/${topicId}`, {
        method: 'DELETE',
      });
      await handleRecalculateDates(selectedSubject.id);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
        Loading subjects & syllabus records...
      </div>
    );
  }

  const topics: Topic[] = selectedSubject?.topics || [];
  const prog = selectedSubject?.progression;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Subject & Lesson Plan Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage unit breakdowns, topic planned hours, exam scopes, and deterministic schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedSubject && user?.role !== 'STUDENT' && (
            <button
              onClick={() => handleRecalculateDates(selectedSubject.id)}
              disabled={recalculating}
              className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span>Recalculate Planned Dates</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Subjects List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Available Subjects ({subjects.length})
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No subjects registered in this semester yet.
            </div>
          ) : (
            subjects.map((sub) => {
              const isSelected = selectedSubject?.id === sub.id;
              const subProg = sub.progression;

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {sub.code}
                    </span>
                    {subProg && <StatusBadge status={subProg.status} size="sm" />}
                  </div>
                  <div className="font-bold text-slate-900 text-xs mt-1">{sub.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sub.campus?.name} • {sub.track?.name}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Subject & Lesson Plan Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedSubject ? (
            <>
              {/* Subject Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {selectedSubject.code}
                      </span>
                      <span className="text-xs text-slate-500">{selectedSubject.campus?.name}</span>
                      <span className="text-xs text-indigo-600 font-semibold">• {selectedSubject.track?.name}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedSubject.name}</h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Assigned Faculty: <span className="font-semibold text-slate-700">{selectedSubject.faculty?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  {prog && (
                    <div className="flex items-center gap-2">
                      <StatusBadge status={prog.status} size="lg" />
                      <button
                        onClick={() => {
                          setExplainSubjectId(selectedSubject.id);
                          setExplainModalOpen(true);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        title="Explain Deterministic Calculation"
                      >
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {prog && (
                  <div>
                    <ProgressBar
                      coveredHours={prog.coveredHours}
                      totalHours={prog.hoursInScope}
                      percentage={prog.coveragePercentage}
                    />
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2 font-mono">
                      <span>Buffer Ratio: {prog.bufferRatio >= 900 ? 'Complete' : prog.bufferRatio.toFixed(2)}</span>
                      <span>Target: {prog.targetFinishDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Plan Topics */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Ordered Lesson Plan Topics ({topics.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calculated planned dates shift dynamically when calendar or hours change
                    </p>
                  </div>

                  {user?.role !== 'STUDENT' && (
                    <button
                      onClick={() => setNewTopicOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Topic
                    </button>
                  )}
                </div>

                {/* Add Topic Drawer Form */}
                {newTopicOpen && (
                  <form
                    onSubmit={handleCreateTopic}
                    className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl mb-4 text-xs space-y-3"
                  >
                    <div className="font-bold text-indigo-950 text-xs uppercase tracking-wide">
                      Add Syllabus Topic
                    </div>

                    {topicError && (
                      <div className="p-2 bg-rose-50 text-rose-700 rounded text-xs">{topicError}</div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Unit</label>
                        <input
                          type="text"
                          value={topicUnit}
                          onChange={(e) => setTopicUnit(e.target.value)}
                          placeholder="e.g. Unit 1"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Sequence #</label>
                        <input
                          type="number"
                          value={topicSeq}
                          onChange={(e) => setTopicSeq(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Planned Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={topicHours}
                          onChange={(e) => setTopicHours(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Topic Name</label>
                      <input
                        type="text"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="e.g. Convolutional Neural Networks & Pooling Layers"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Exam Scopes (comma separated)
                      </label>
                      <input
                        type="text"
                        value={topicScopes}
                        onChange={(e) => setTopicScopes(e.target.value)}
                        placeholder="MID_TERM, END_TERM"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewTopicOpen(false)}
                        className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg shadow-xs"
                      >
                        Save Topic
                      </button>
                    </div>
                  </form>
                )}

                {/* Topics Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-4">Topic Name</th>
                        <th className="py-2.5 px-3 text-right">Hours</th>
                        <th className="py-2.5 px-3">Planned Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        {user?.role !== 'STUDENT' && <th className="py-2.5 px-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topics.map((top) => (
                        <tr key={top.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">
                            {top.sequence}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{top.unit}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{top.name}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                            {top.plannedHours}h
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {top.plannedDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-indigo-500" />
                                {top.plannedDate.slice(0, 10)}
                              </span>
                            ) : (
                              <span className="text-amber-500 text-[11px]">Uncalculated</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                top.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : top.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {top.status === 'IN_PROGRESS'
                                ? `${top.completionPercentage}%`
                                : top.status}
                            </span>
                          </td>
                          {user?.role !== 'STUDENT' && (
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteTopic(top.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition"
                                title="Delete Topic"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select a subject on the left to manage lesson plans and topics.
            </div>
          )}
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
