import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

// In-memory or simple table fallback for institutional threshold settings
let cachedSettings = {
  id: 'default-settings',
  onTrackThreshold: 1.15,
  tightThreshold: 1.00,
  defaultSaturdayRule: 'SECOND_FOURTH_SATURDAY',
  academicYearName: '2026-2027',
};

// GET /api/settings
router.get('/', authenticate, (_req: Request, res: Response): void => {
  res.json({ settings: cachedSettings });
});

// PUT /api/settings (Admin only)
router.put('/', authenticate, requireRoles(['ADMIN']), (req: Request, res: Response): void => {
  try {
    const { onTrackThreshold, tightThreshold, defaultSaturdayRule, academicYearName } = req.body;

    if (onTrackThreshold !== undefined) {
      const val = parseFloat(onTrackThreshold);
      if (isNaN(val) || val <= 0) {
        res.status(400).json({ error: 'onTrackThreshold must be a positive number' });
        return;
      }
      cachedSettings.onTrackThreshold = val;
    }

    if (tightThreshold !== undefined) {
      const val = parseFloat(tightThreshold);
      if (isNaN(val) || val <= 0) {
        res.status(400).json({ error: 'tightThreshold must be a positive number' });
        return;
      }
      cachedSettings.tightThreshold = val;
    }

    if (defaultSaturdayRule) cachedSettings.defaultSaturdayRule = defaultSaturdayRule;
    if (academicYearName) cachedSettings.academicYearName = academicYearName;

    res.json({
      settings: cachedSettings,
      message: 'Institutional thresholds updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
