import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import campusRoutes from './routes/campus.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import sessionRoutes from './routes/session.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import alertRoutes from './routes/alert.routes.js';
import csvRoutes from './routes/csv.routes.js';
import settingsRoutes from './routes/settings.routes.js';

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    institution: 'Mirai School of Technology (MSOT)',
    system: 'Course Progression Tracker',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/academic', campusRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
