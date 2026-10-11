import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const TimetableManagement: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/timetable');
      setEntries(res.timetableEntries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const handleGenerateSessions = async () => {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      // Find current semester
      const semRes = await apiRequest('/academic/semesters');
      const semester = semRes.semesters?.[0];
      if (!semester) return;

      const res = await apiRequest('/timetable/generate-sessions', {
        method: 'POST',
        body: JSON.stringify({ semesterId: semester.id }),
      });

      setGenerateMsg(`Generated ${res.sessionsCreated} scheduled teaching sessions matching calendar working days!`);
      setTimeout(() => setGenerateMsg(null), 5000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Delete this weekly timetable slot?')) return;
    try {
      await apiRequest(`/timetable/${slotId}`, { method: 'DELETE' });
      loadTimetable();
    } catch (e) {
      console.error(e);
    }
  };

  const weekdays = [
    { num: 1, name: 'Monday' },
    { num: 2, name: 'Tuesday' },
    { num: 3, name: 'Wednesday' },
    { num: 4, name: 'Thursday' },
    { num: 5, name: 'Friday' },
    { num: 6, name: 'Saturday' },
  ];

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
        Loading weekly timetable schedule...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Institutional Timetable</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Weekly scheduled teaching hours consumed by the deterministic calendar engine.
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'CAMPUS_MANAGER') && (
          <button
            onClick={handleGenerateSessions}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating Sessions...' : 'Generate Calendar Sessions'}</span>
          </button>
        )}
      </div>

      {generateMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{generateMsg}</span>
        </div>
      )}

      {/* Weekday Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {weekdays.map((wd) => {
          const dayEntries = entries.filter((e) => e.weekday === wd.num);
          const totalDayHours = dayEntries.reduce((sum, e) => sum + e.durationHours, 0);

          return (
            <div
              key={wd.num}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{wd.name}</span>
                  </h3>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {totalDayHours.toFixed(1)}h planned
                  </span>
                </div>

                <div className="space-y-2">
                  {dayEntries.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs italic">
                      No classes scheduled
                    </div>
                  ) : (
                    dayEntries.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex justify-between items-start"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-700">
                              {slot.subject.code}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-slate-800 truncate max-w-[140px]">
                              {slot.subject.name}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {slot.startTime} - {slot.endTime} ({slot.durationHours}h)
                          </div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {slot.faculty.name} {slot.roomNumber ? `• ${slot.roomNumber}` : ''}
                          </div>
                        </div>

                        {(user?.role === 'ADMIN' || user?.role === 'CAMPUS_MANAGER') && (
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 transition"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
