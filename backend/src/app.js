import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import logsRoutes from './routes/logs.routes.js';
import sessionRoutes from './routes/session.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import alertRoutes from './routes/alert.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import campusRoutes from './routes/campus.routes.js';
import csvRoutes from './routes/csv.routes.js';
import aiLoggingRoutes from './routes/aiLogging.routes.js';
import aiSummaryRoutes from './routes/aiSummary.routes.js';
import calendarSyncRoutes from './routes/calendarSync.routes.js';
import honorariumRoutes from './routes/honorarium.routes.js';
import './db.js'; // Ensure tables are initialized on startup

export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve vanilla static web frontend directly from root
const staticRootDir = fs.existsSync(path.join(process.cwd(), 'index.html'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');
app.use(express.static(staticRootDir));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    institution: 'Mirai School of Technology (MSOT)',
    system: 'Course Progression Platform (SQLite Self-Contained)',
    timestamp: new Date().toISOString(),
  });
});

// Prompt-specified core endpoints & REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/timetable', timetableRoutes); // frontend compatibility
app.use('/api/logs', aiLoggingRoutes); // AI draft parsing & explicit confirmation endpoints
app.use('/api/logs', logsRoutes);
app.use('/api/sessions', sessionRoutes); // frontend compatibility
app.use('/api/ai-logging', aiLoggingRoutes);
app.use('/api/webhooks', aiLoggingRoutes);
app.use('/api/dashboards', adminRoutes); // handles /global and /exam-readiness
app.use('/api/dashboard', dashboardRoutes); // handles role dashboards (/admin, /campus-manager, /faculty, /student)
app.use('/api/subjects', subjectRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/academic', campusRoutes);
app.use('/api/campus-summaries', aiSummaryRoutes);
app.use('/api/calendar-sync', calendarSyncRoutes);
app.use('/api/honorarium', honorariumRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/export', csvRoutes);

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
