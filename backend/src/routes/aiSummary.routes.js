import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { AiCampusSummaryEngine } from '../services/aiCampusSummaryEngine.js';

const router = Router();

/**
 * GET /api/campus-summaries
 * Retrieve existing weekly campus summaries
 */
router.get('/', authenticate, (req, res) => {
  try {
    const { campusId = 'camp-hitech' } = req.query;
    const summaries = db.prepare(`
      SELECT s.*, c.name as campus_name, u.name as reviewer_name
      FROM campus_summaries s
      JOIN campuses c ON s.campus_id = c.id
      LEFT JOIN users u ON s.reviewed_by = u.id
      WHERE s.campus_id = ?
      ORDER BY s.created_at DESC
      LIMIT 20
    `).all(campusId);

    const parsed = summaries.map((s) => ({
      id: s.id,
      campusId: s.campus_id,
      campusName: s.campus_name,
      weekStartDate: s.week_start_date,
      weekEndDate: s.week_end_date,
      summaryText: s.summary_text,
      slippingSubjects: JSON.parse(s.slipping_subjects_json || '[]'),
      recoveryActions: JSON.parse(s.recovery_actions_json || '[]'),
      groundedEvidence: JSON.parse(s.grounded_evidence_json || '[]'),
      reviewStatus: s.review_status,
      reviewedBy: s.reviewer_name,
      reviewedAt: s.reviewed_at,
      createdAt: s.created_at,
      disclaimer: 'AI-generated summary for Academic Leadership / Campus Manager review only. Timetables and lesson plans have NOT been modified.',
      isManagerSuggestionOnly: true,
    }));

    res.json({ summaries: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/campus-summaries/:id
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const s = db.prepare(`
      SELECT s.*, c.name as campus_name, u.name as reviewer_name
      FROM campus_summaries s
      JOIN campuses c ON s.campus_id = c.id
      LEFT JOIN users u ON s.reviewed_by = u.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!s) {
      return res.status(404).json({ error: 'Summary not found.' });
    }

    res.json({
      id: s.id,
      campusId: s.campus_id,
      campusName: s.campus_name,
      weekStartDate: s.week_start_date,
      weekEndDate: s.week_end_date,
      summaryText: s.summary_text,
      slippingSubjects: JSON.parse(s.slipping_subjects_json || '[]'),
      recoveryActions: JSON.parse(s.recovery_actions_json || '[]'),
      groundedEvidence: JSON.parse(s.grounded_evidence_json || '[]'),
      reviewStatus: s.review_status,
      reviewedBy: s.reviewer_name,
      reviewedAt: s.reviewed_at,
      createdAt: s.created_at,
      disclaimer: 'AI-generated summary for Academic Leadership / Campus Manager review only. Timetables and lesson plans have NOT been modified.',
      isManagerSuggestionOnly: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/campus-summaries/generate
 * Trigger AI Weekly Campus Summary generation
 */
router.post('/generate', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), async (req, res) => {
  try {
    const { campusId = 'camp-hitech', weekStartDate, weekEndDate } = req.body;
    const summary = await AiCampusSummaryEngine.generateSummary({
      campusId,
      weekStartDate,
      weekEndDate,
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/campus-summaries/:id/review
 * Academic Manager reviews and marks recommendations
 */
router.post('/:id/review', authenticate, requireRoles(['ADMIN', 'CAMPUS_MANAGER']), (req, res) => {
  try {
    const { reviewNotes, actionDecision } = req.body;
    const result = AiCampusSummaryEngine.reviewSummary({
      summaryId: req.params.id,
      reviewerId: req.user.id,
      reviewNotes,
      actionDecision,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

