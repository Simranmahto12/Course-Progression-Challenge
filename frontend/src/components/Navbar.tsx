import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Bell,
  Menu,
  X,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Settings,
  BookOpen,
  Calendar,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { apiRequest } from '../services/api';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, switchRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.role !== 'STUDENT') {
      apiRequest('/alerts')
        .then((res) => setAlerts(res.alerts || []))
        .catch(console.error);
    } else {
      setAlerts([]);
    }
  }, [user]);

  const unreadAlerts = alerts.filter((a) => a.status === 'SENT' || a.status === 'PENDING');

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiRequest(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Institution Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-2">
                <span>Mirai School of Technology</span>
                <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800 rounded-full">
                  MSOT • BTech CSE (AI/ML)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Course Progression Tracker
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setCurrentTab('subjects')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                currentTab === 'subjects'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Subjects & Lesson Plans
            </button>

            {user?.role !== 'STUDENT' && (
              <button
                onClick={() => setCurrentTab('timetable')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  currentTab === 'timetable'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Timetable
              </button>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'CAMPUS_MANAGER') && (
              <button
                onClick={() => setCurrentTab('csv')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  currentTab === 'csv'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                CSV Center
              </button>
            )}

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setCurrentTab('settings')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  currentTab === 'settings'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>
            )}
          </nav>

          {/* Right Controls: Role Switcher & Alerts & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Demo Role Switcher */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
              {(['ADMIN', 'CAMPUS_MANAGER', 'FACULTY', 'STUDENT'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    user?.role === r
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Switch to demo ${r}`}
                >
                  {r === 'CAMPUS_MANAGER' ? 'Manager' : r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Notification Bell (Hides strictly for students as required) */}
            {user?.role !== 'STUDENT' && (
              <div className="relative">
                <button
                  onClick={() => setAlertsOpen(!alertsOpen)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl relative transition"
                  title="Notifications & Missing-log Alerts"
                >
                  <Bell className="w-5 h-5" />
                  {unreadAlerts.length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadAlerts.length}
                    </span>
                  )}
                </button>

                {/* Alerts Dropdown Drawer */}
                {alertsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fadeIn">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>Session Alerts & Escalations</span>
                      </div>
                      <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                        {alerts.length} total
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {alerts.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                          All sessions logged up to date! No pending alerts.
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`p-3 transition ${
                              alert.status === 'SENT' ? 'bg-amber-50/50' : 'bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  alert.type === 'CAMPUS_MANAGER_ESCALATION'
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {alert.type === 'CAMPUS_MANAGER_ESCALATION' ? '48H ESCALATION' : 'REMINDER'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-800 mb-0.5">{alert.title}</div>
                            <div className="text-slate-600 text-[11px] leading-relaxed mb-2">
                              {alert.message}
                            </div>
                            {alert.status === 'SENT' && (
                              <button
                                onClick={() => acknowledgeAlert(alert.id)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                              >
                                Mark Acknowledged ✓
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <div className="font-bold text-slate-800 truncate max-w-[140px]">{user?.name}</div>
                <div className="text-[10px] text-indigo-600 font-semibold">
                  {user?.role} {user?.campus ? `• ${user.campus.name}` : ''}
                </div>
              </div>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-1">
            <button
              onClick={() => {
                setCurrentTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                currentTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentTab('subjects');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                currentTab === 'subjects' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
              }`}
            >
              Subjects & Lesson Plans
            </button>
            {user?.role !== 'STUDENT' && (
              <button
                onClick={() => {
                  setCurrentTab('timetable');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                  currentTab === 'timetable' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                }`}
              >
                Timetable
              </button>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'CAMPUS_MANAGER') && (
              <button
                onClick={() => {
                  setCurrentTab('csv');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                  currentTab === 'csv' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                }`}
              >
                CSV Import & Export Center
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setCurrentTab('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                  currentTab === 'settings' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                }`}
              >
                System Settings
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-400 w-full mb-1">Switch Role Demo:</span>
              {(['ADMIN', 'CAMPUS_MANAGER', 'FACULTY', 'STUDENT'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-2 py-1 text-[11px] rounded font-semibold ${
                    user?.role === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
