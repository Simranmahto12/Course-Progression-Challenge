import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { stringify } from 'csv-stringify/sync';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { CSVEngine } from '../services/csvEngine.js';
import prisma from '../lib/prisma.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const TEMPLATES_DIR = path.resolve(process.cwd(), '../database/templates');

// GET /api/csv/template/:type
router.get('/template/:type', authenticate, (req: Request, res: Response): void => {
  const { type } = req.params;
  const validTypes = ['calendar', 'timetable', 'subjects', 'lesson_plans'];

  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `Invalid template type: ${type}. Must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const filename = `${type}_template.csv`;
  const filePath = path.join(TEMPLATES_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Template file not found on disk.' });
  }
});

// POST /api/csv/preview/:type
router.post('/preview/:type', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params as { type: 'calendar' | 'timetable' | 'subjects' | 'lesson_plans' };
    let csvContent = '';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csvContent) {
      csvContent = req.body.csvContent;
    } else {
      res.status(400).json({ error: 'No CSV file or csvContent provided.' });
      return;
    }

    const preview = CSVEngine.previewAndValidate(csvContent, type);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/csv/import/:type
router.post('/import/:type', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No valid rows provided for import.' });
      return;
    }

    if (type === 'calendar') {
      const result = await CSVEngine.importCalendarRows(rows);
      res.json({ success: true, ...result });
    } else if (type === 'lesson_plans') {
      const result = await CSVEngine.importLessonPlans(rows);
      res.json({ success: true, ...result });
    } else {
      res.status(400).json({ error: `Import handler for ${type} is not yet implemented or use direct screen management.` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/csv/export/:type
router.get('/export/:type', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    if (type === 'lesson_plans') {
      const topics = await prisma.topic.findMany({
        include: { subject: true },
        orderBy: [{ subject: { code: 'asc' } }, { sequence: 'asc' }],
      });

      const records = topics.map((t) => ({
        subjectCode: t.subject.code,
        subjectName: t.subject.name,
        unit: t.unit,
        sequence: t.sequence,
        topicName: t.name,
        plannedHours: t.plannedHours,
        status: t.status,
        completionPercentage: t.completionPercentage,
        coveredHours: t.coveredHours,
        plannedDate: t.plannedDate ? t.plannedDate.toISOString().slice(0, 10) : '',
        examScopes: t.examScopes,
      }));

      const csv = stringify(records, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="lesson_plans_export.csv"');
      res.send(csv);
    } else if (type === 'subjects') {
      const subjects = await prisma.subject.findMany({
        include: { campus: true, track: true, faculty: true },
        orderBy: { code: 'asc' },
      });

      const records = subjects.map((s) => ({
        code: s.code,
        name: s.name,
        campus: s.campus.name,
        track: s.track.name,
        faculty: s.faculty?.name || 'TBD',
        plannedHours: s.plannedHours,
        targetFinishDate: s.targetFinishDate.toISOString().slice(0, 10),
      }));

      const csv = stringify(records, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="subjects_export.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: `Unsupported export type: ${type}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
