import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building,
  CheckCircle,
  Clock,
  Save,
  Sliders,
} from 'lucide-react';
import { Rollup } from '../types';
import { apiRequest } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({
    onTrackThreshold: 1.15,
    tightThreshold: 1.00,
    defaultSaturdayRule: 'SECOND_FOURTH_SATURDAY',
    academicYearName: '2026-2027',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminRes, settingsRes] = await Promise.all([
        apiRequest('/dashboard/admin'),
        apiRequest('/settings'),
      ]);
      setData(adminRes);
      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
        Loading Mirai School of Technology cross-campus governance dashboard...
      </div>
    );
  }

  const campusRollups: Rollup[] = data?.campusRollups || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-indigo-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Institution Administration • Program Manager</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Cross-Campus Program Governance</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Institutional overview across HI-Tech, Ratnam, RGIB, and JUJ campuses.
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <div className="text-indigo-200 font-semibold">Total Sessions Logged</div>
              <div className="text-lg font-bold text-white mt-0.5">{stats.totalSessionsLogged}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <div className="text-indigo-200 font-semibold">Active Campuses</div>
              <div className="text-lg font-bold text-white mt-0.5">{stats.totalCampuses}</div>
            </div>
          </div>
        )}
      </div>

      {/* CROSS-CAMPUS COMPARISON: HI-Tech, Ratnam, RGIB, JUJ */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Building className="w-4 h-4 text-indigo-600" />
          <span>Cross-Campus Roll-Up Status (Worst-Subject Rule)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {campusRollups.map((cr) => (
            <div
              key={cr.entityId}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{cr.entityName}</h3>
                  <StatusBadge status={cr.worstStatus} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                  <div className="flex justify-between">
                    <span>Subjects:</span>
                    <span className="font-bold text-slate-900">{cr.totalSubjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Coverage:</span>
                    <span className="font-bold text-slate-900">
                      {cr.averageCoveragePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered Hours:</span>
                    <span className="font-medium text-slate-700">
                      {cr.totalCoveredHours}h / {cr.totalPlannedHours}h
                    </span>
                  </div>

                  {/* Bottleneck subject */}
                  {cr.bottleneckSubject && (
                    <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-[11px]">
                      <span className="font-bold">Bottleneck:</span> {cr.bottleneckSubject.code} ({cr.bottleneckSubject.name})
                      <div className="font-mono text-[10px] text-rose-600">
                        Buffer: {cr.bottleneckSubject.bufferRatio.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="bg-emerald-50 text-emerald-800 rounded p-1 font-semibold">
                  {cr.statusBreakdown.onTrack + cr.statusBreakdown.complete} On Track
                </div>
                <div className="bg-amber-50 text-amber-800 rounded p-1 font-semibold">
                  {cr.statusBreakdown.tight} Tight
                </div>
                <div className="bg-rose-50 text-rose-800 rounded p-1 font-semibold">
                  {cr.statusBreakdown.danger} Danger
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INSTITUTIONAL SETTINGS & THRESHOLDS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Institutional Governance Settings</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                On-Track Threshold Ratio
              </label>
              <input
                type="number"
                step="0.05"
                min="1.0"
                value={settings.onTrackThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, onTrackThreshold: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Default: 1.15</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tight Threshold Ratio
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={settings.tightThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, tightThreshold: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Default: 1.00</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Working Saturday Rule
              </label>
              <select
                value={settings.defaultSaturdayRule}
                onChange={(e) =>
                  setSettings({ ...settings, defaultSaturdayRule: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium bg-white"
              >
                <option value="SECOND_FOURTH_SATURDAY">2nd & 4th Saturdays Working</option>
                <option value="ALL_SATURDAYS">All Saturdays Working</option>
                <option value="NO_SATURDAYS">No Saturdays Working</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Institutional calendar policy</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={settings.academicYearName}
                onChange={(e) =>
                  setSettings({ ...settings, academicYearName: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Active calendar year</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Institutional thresholds saved successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {savingSettings ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Update Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
