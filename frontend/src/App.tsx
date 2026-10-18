import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { CampusManagerDashboard } from './pages/CampusManagerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { SubjectManagement } from './pages/SubjectManagement';
import { TimetableManagement } from './pages/TimetableManagement';
import { CSVImportCenter } from './pages/CSVImportCenter';
import { LoginPage } from './pages/LoginPage';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Initializing Mirai MSOT Course Progression Tracker...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderDashboard = () => {
    switch (user?.role) {
      case 'FACULTY':
        return <FacultyDashboard />;
      case 'CAMPUS_MANAGER':
        return <CampusManagerDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      case 'STUDENT':
        return <StudentDashboard />;
      default:
        return <FacultyDashboard />;
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return renderDashboard();
      case 'subjects':
        return <SubjectManagement />;
      case 'timetable':
        return <TimetableManagement />;
      case 'csv':
        return <CSVImportCenter />;
      case 'settings':
        return <AdminDashboard />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Mirai School of Technology (MSOT) • BTech CSE (AI/ML) Course Progression System
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
