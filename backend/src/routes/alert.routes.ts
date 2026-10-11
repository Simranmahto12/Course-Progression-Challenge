import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { AlertEngine } from '../services/alertEngine.js';

const router = Router();

// GET /api/alerts
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const where: any = {};

    if (req.user?.role === 'FACULTY') {
      where.recipientUserId = req.user.id;
    } else if (req.user?.role === 'CAMPUS_MANAGER' && req.user.campusId) {
      where.subject = { campusId: req.user.campusId };
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        subject: true,
        recipientUser: { select: { id: true, name: true, email: true, role: true } },
        scheduledSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/scan (Triggers missing log alert scan)
router.post('/scan', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await AlertEngine.scanAndGenerateAlerts();
    res.json({
      success: true,
      message: `Scanned ${result.scannedUnloggedSessions} unlogged sessions. Generated ${result.newAlertsCount} new alerts.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await AlertEngine.acknowledgeAlert(id, req.user!.id);
    res.json({ success: true, alert });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/delivery-logs
router.get('/delivery-logs', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.notificationDeliveryLog.findMany({
      include: {
        alert: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    res.json({ deliveryLogs: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
