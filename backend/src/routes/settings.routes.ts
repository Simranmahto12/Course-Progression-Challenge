import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'default-settings',
          onTrackThreshold: 1.15,
          tightThreshold: 1.00,
          defaultSaturdayRule: 'SECOND_FOURTH_SATURDAY',
          academicYearName: '2026-2027',
        },
      });
    }
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings (Admin only)
router.put('/', authenticate, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { onTrackThreshold, tightThreshold, defaultSaturdayRule, academicYearName } = req.body;

    const data: any = {};
    if (onTrackThreshold !== undefined) {
      const val = parseFloat(onTrackThreshold);
      if (isNaN(val) || val <= 0) {
        res.status(400).json({ error: 'onTrackThreshold must be a positive number' });
        return;
      }
      data.onTrackThreshold = val;
    }

    if (tightThreshold !== undefined) {
      const val = parseFloat(tightThreshold);
      if (isNaN(val) || val <= 0) {
        res.status(400).json({ error: 'tightThreshold must be a positive number' });
        return;
      }
      data.tightThreshold = val;
    }

    if (defaultSaturdayRule) data.defaultSaturdayRule = defaultSaturdayRule;
    if (academicYearName) data.academicYearName = academicYearName;

    const updated = await prisma.systemSettings.upsert({
      where: { id: 'default-settings' },
      update: data,
      create: {
        id: 'default-settings',
        ...data,
      },
    });

    res.json({ settings: updated, message: 'Institutional thresholds updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
