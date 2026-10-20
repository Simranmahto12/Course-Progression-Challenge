import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, verifySubjectAccess } from '../middleware/auth.js';
import { CalculationEngine } from '../services/calculationEngine.js';

const router = Router();

function formatTopic(t) {
  return {
    id: t.id,
    subjectId: t.subject_id,
    unit: t.unit_name,
    sequence: t.sequence,
    name: t.topic_name,
    plannedHours: t.planned_hours,
    status: t.status,
    completionPercentage: t.percentage_complete,
    coveredHours: CalculationEngine.calculateTopicCoveredHours({
      status: t.status,
      planned_hours: t.planned_hours,
      percentage_complete: t.percentage_complete,
    }),
    plannedDate: t.planned_date,
    examScopes: t.exam_scope_flag,
    approvedExamScope: t.approved_exam_scope || t.exam_scope_flag,
    unitWeightage: t.unit_weightage || 20,
    learningOutcomes: t.learning_outcomes || '',
    prerequisiteKnowledge: t.prerequisite_knowledge || '',
    diagnosticQuestion: t.diagnostic_question || '',
    conceptExplanation: t.concept_explanation || '',
    workedExample: t.worked_example || '',
    guidedPractice: t.guided_practice || '',
    independentApplication: t.independent_application || '',
    teachingMethod: t.teaching_method || 'Interactive Lecture',
    readingsResources: t.readings_resources || '',
    equipmentSafetyNotes: t.equipment_safety_notes || '',
    formativeCheck: t.formative_check || '',
    assignmentEvidence: t.assignment_evidence || '',
    reflectionRemediation: t.reflection_remediation || '',
    inclusiveOptions: t.inclusive_options || '',
    facultyNotes: t.faculty_notes || '',
    lessonPlanStatus: t.lesson_plan_status || 'DRAFT',
    version: t.version || 1,
    sourceDocument: t.source_document || 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
    pageReference: t.page_reference || '',
  };
}

/**
 * GET /api/subjects
 * Retrieve subjects with calculation metrics and topics
 */
router.get('/', authenticate, (req, res) => {
  try {
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();
    const { campusId, batchId, facultyId, trackId, includeInactive } = req.query;

    let query = `
      SELECT s.*, b.name as batch_name, b.campus_id, b.track_id, c.name as campus_name,
             t.name as track_name, u.name as faculty_name, u.email as faculty_email
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (campusId) {
      query += ` AND c.id = ?`;
      params.push(campusId);
    }
    if (trackId) {
      query += ` AND b.track_id = ?`;
      params.push(trackId);
    }
    if (batchId) {
      query += ` AND b.id = ?`;
      params.push(batchId);
    }
    if (facultyId) {
      query += ` AND s.faculty_id = ?`;
      params.push(facultyId);
    }
    if (includeInactive !== 'true') {
      query += ` AND s.is_active_for_batch = 1`;
    }

    // Role-based scoping
    if (userRole === 'FACULTY') {
      query += ` AND s.faculty_id = ?`;
      params.push(user?.id);
    } else if (userRole === 'CAMPUS_MANAGER' && user?.campusId) {
      query += ` AND c.id = ?`;
      params.push(user.campusId);
    } else if (userRole === 'STUDENT' && user?.batchId) {
      query += ` AND b.id = ?`;
      params.push(user.batchId);
    }

    query += ` ORDER BY s.name ASC`;
    const rawSubjects = db.prepare(query).all(...params);

    // Fetch exams for readiness
    const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all();

    const subjects = rawSubjects.map((sub) => {
      const topics = db.prepare(`
        SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
      `).all(sub.id);

      const progression = CalculationEngine.calculateSubjectProgress(sub.id);

      const examReadiness = exams.map((exam) => {
        return CalculationEngine.calculateExamReadiness(sub.id, exam);
      }).filter((r) => r !== null && r.inScopeTopicsCount > 0);

      const formattedTopics = topics.map(formatTopic);
      const totalPlanned = formattedTopics.reduce((acc, curr) => acc + curr.plannedHours, 0);

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        color: sub.color || '#4361ee',
        targetFinishDate: sub.target_finish_date,
        plannedHours: totalPlanned,
        courseCategory: sub.course_category,
        department: sub.department,
        credits: sub.credits,
        contactHoursL: sub.contact_hours_l,
        contactHoursT: sub.contact_hours_t,
        contactHoursP: sub.contact_hours_p,
        ncrfHours: sub.ncrf_hours,
        isAlternative: Boolean(sub.is_alternative),
        alternativeGroup: sub.alternative_group,
        alternativeFor: sub.alternative_for,
        isActiveForBatch: Boolean(sub.is_active_for_batch),
        sourceDocument: sub.source_document,
        sourceVersion: sub.source_version,
        pageReference: sub.page_reference,
        courseType: sub.course_type,
        campusId: sub.campus_id,
        campus: { id: sub.campus_id, name: sub.campus_name },
        trackId: sub.track_id,
        track: { id: sub.track_id, name: sub.track_name },
        batchId: sub.batch_id,
        batch: { id: sub.batch_id, name: sub.batch_name },
        facultyId: sub.faculty_id,
        facultyName: sub.faculty_name,
        faculty: sub.faculty_name
          ? { id: sub.faculty_id, name: sub.faculty_name, email: sub.faculty_email }
          : undefined,
        recordLabel: sub.record_label,
        needsAdminReview: Boolean(sub.needs_admin_review),
        topics: formattedTopics,
        progression,
        examReadiness,
      };
    });

    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subjects/all-catalog
 * Retrieve all subjects including inactive alternatives for configuration
 */
router.get('/all-catalog', authenticate, (req, res) => {
  try {
    const { batchId } = req.query;
    let query = `
      SELECT s.*, b.name as batch_name, b.campus_id, b.track_id, c.name as campus_name,
             t.name as track_name, u.name as faculty_name
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (batchId) {
      query += ` AND b.id = ?`;
      params.push(batchId);
    }
    query += ` ORDER BY s.alternative_group, s.name ASC`;
    const subjects = db.prepare(query).all(...params);
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/subjects/configure-alternatives
 * Switch active course in an alternative group
 */
router.post('/configure-alternatives', authenticate, (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'CAMPUS_MANAGER') {
      res.status(403).json({ error: 'Only Admin and Campus Manager can configure course alternatives.' });
      return;
    }

    const { activateSubjectId, deactivateSubjectId, batchId } = req.body;
    if (!activateSubjectId) {
      res.status(400).json({ error: 'activateSubjectId is required.' });
      return;
    }

    // Activate the chosen subject
    db.prepare(`UPDATE subjects SET is_active_for_batch = 1 WHERE id = ?`).run(activateSubjectId);

    // If a counterpart is specified or belongs to the same alternative group
    if (deactivateSubjectId) {
      db.prepare(`UPDATE subjects SET is_active_for_batch = 0 WHERE id = ?`).run(deactivateSubjectId);
    } else {
      const activeSub = db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(activateSubjectId);
      if (activeSub?.alternative_group) {
        db.prepare(`
          UPDATE subjects 
          SET is_active_for_batch = 0 
          WHERE alternative_group = ? AND id != ? AND batch_id = ?
        `).run(activeSub.alternative_group, activateSubjectId, activeSub.batch_id);
      }
    }

    res.json({
      success: true,
      message: `Course alternatives updated successfully. Active course set to: ${activateSubjectId}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subjects/topics/:topicId/lesson-plan
 * Get detailed lesson plan for a topic including version history
 */
router.get('/topics/:topicId/lesson-plan', authenticate, (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = db.prepare(`
      SELECT t.*, s.name as subject_name, s.code as subject_code, s.faculty_id
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = ?
    `).get(topicId);

    if (!topic) {
      res.status(404).json({ error: 'Topic not found.' });
      return;
    }

    const versions = db.prepare(`
      SELECT * FROM lesson_plan_versions WHERE topic_id = ? ORDER BY version DESC
    `).all(topicId);

    res.json({
      topic: formatTopic(topic),
      versions: versions.map((v) => ({
        ...v,
        content: JSON.parse(v.content_json || '{}'),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/subjects/topics/:topicId/lesson-plan
 * Update pedagogical lesson plan and create a version history snapshot
 */
router.put('/topics/:topicId/lesson-plan', authenticate, (req, res) => {
  try {
    const { topicId } = req.params;
    const user = req.user;
    const userRole = (user?.role || '').toUpperCase();

    const topic = db.prepare(`SELECT * FROM topics WHERE id = ?`).get(topicId);
    if (!topic) {
      res.status(404).json({ error: 'Topic not found.' });
      return;
    }

    const {
      learning_outcomes = topic.learning_outcomes,
      prerequisite_knowledge = topic.prerequisite_knowledge,
      diagnostic_question = topic.diagnostic_question,
      concept_explanation = topic.concept_explanation,
      worked_example = topic.worked_example,
      guided_practice = topic.guided_practice,
      independent_application = topic.independent_application,
      teaching_method = topic.teaching_method,
      readings_resources = topic.readings_resources,
      equipment_safety_notes = topic.equipment_safety_notes,
      formative_check = topic.formative_check,
      assignment_evidence = topic.assignment_evidence,
      reflection_remediation = topic.reflection_remediation,
      inclusive_options = topic.inclusive_options,
      faculty_notes = topic.faculty_notes,
      lesson_plan_status = 'DRAFT',
      approved_exam_scope = topic.approved_exam_scope,
      planned_hours = topic.planned_hours,
    } = req.body;

    const newVersion = (topic.version || 1) + 1;

    // Snapshot existing content into lesson_plan_versions
    const snapshotContent = {
      learning_outcomes: topic.learning_outcomes,
      prerequisite_knowledge: topic.prerequisite_knowledge,
      diagnostic_question: topic.diagnostic_question,
      concept_explanation: topic.concept_explanation,
      worked_example: topic.worked_example,
      guided_practice: topic.guided_practice,
      independent_application: topic.independent_application,
      teaching_method: topic.teaching_method,
      readings_resources: topic.readings_resources,
      equipment_safety_notes: topic.equipment_safety_notes,
      formative_check: topic.formative_check,
      assignment_evidence: topic.assignment_evidence,
      inclusive_options: topic.inclusive_options,
      faculty_notes: topic.faculty_notes,
      lesson_plan_status: topic.lesson_plan_status,
      version: topic.version,
    };

    db.prepare(`
      INSERT INTO lesson_plan_versions (id, topic_id, version, content_json, edited_by, edited_at, status)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(
      `lpv-${Date.now()}-${newVersion}`,
      topicId,
      topic.version || 1,
      JSON.stringify(snapshotContent),
      user?.name || user?.email || 'Faculty User',
      topic.lesson_plan_status || 'DRAFT'
    );

    // Update topics table
    db.prepare(`
      UPDATE topics
      SET learning_outcomes = ?, prerequisite_knowledge = ?, diagnostic_question = ?,
          concept_explanation = ?, worked_example = ?, guided_practice = ?,
          independent_application = ?, teaching_method = ?, readings_resources = ?,
          equipment_safety_notes = ?, formative_check = ?, assignment_evidence = ?,
          reflection_remediation = ?, inclusive_options = ?, faculty_notes = ?,
          lesson_plan_status = ?, approved_exam_scope = ?, planned_hours = ?,
          version = ?
      WHERE id = ?
    `).run(
      learning_outcomes, prerequisite_knowledge, diagnostic_question,
      concept_explanation, worked_example, guided_practice,
      independent_application, teaching_method, readings_resources,
      equipment_safety_notes, formative_check, assignment_evidence,
      reflection_remediation, inclusive_options, faculty_notes,
      lesson_plan_status, approved_exam_scope, planned_hours,
      newVersion, topicId
    );

    const updated = db.prepare(`SELECT * FROM topics WHERE id = ?`).get(topicId);
    res.json({
      success: true,
      message: 'Lesson plan updated and version archived successfully.',
      topic: formatTopic(updated),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/subjects/topics/:topicId/review
 * Admin / Campus Manager review and approval workflow
 */
router.post('/topics/:topicId/review', authenticate, (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'CAMPUS_MANAGER') {
      res.status(403).json({ error: 'Only Admin and Campus Manager can review/approve lesson plans.' });
      return;
    }

    const { topicId } = req.params;
    const { status, reviewer_notes = '' } = req.body; // status: 'APPROVED' | 'NEEDS_REVISION'

    if (!['APPROVED', 'NEEDS_REVISION', 'DRAFT'].includes(status)) {
      res.status(400).json({ error: 'Invalid review status. Must be APPROVED, NEEDS_REVISION, or DRAFT.' });
      return;
    }

    db.prepare(`
      UPDATE topics
      SET lesson_plan_status = ?
      WHERE id = ?
    `).run(status, topicId);

    // Record review in version history
    const latestVersion = db.prepare(`
      SELECT * FROM lesson_plan_versions WHERE topic_id = ? ORDER BY version DESC LIMIT 1
    `).get(topicId);

    if (latestVersion) {
      db.prepare(`
        UPDATE lesson_plan_versions
        SET reviewer_notes = ?, status = ?
        WHERE id = ?
      `).run(reviewer_notes, status, latestVersion.id);
    }

    res.json({
      success: true,
      message: `Lesson plan marked as ${status}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subjects/date-audit
 * Retrieve audit trail for why planned dates moved
 */
router.get('/date-audit', authenticate, (req, res) => {
  try {
    const { topicId, limit = 50 } = req.query;
    let query = `
      SELECT d.*, t.topic_name, t.unit_name, s.name as subject_name, s.code as subject_code
      FROM date_movement_audit d
      JOIN topics t ON d.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (topicId) {
      query += ` AND d.topic_id = ?`;
      params.push(topicId);
    }
    query += ` ORDER BY d.created_at DESC LIMIT ?`;
    params.push(Number(limit));

    const audits = db.prepare(query).all(...params);
    res.json({ audits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subjects/:id
 */
router.get('/:id', authenticate, verifySubjectAccess, (req, res) => {
  try {
    const { id } = req.params;
    const sub = db.prepare(`
      SELECT s.*, b.name as batch_name, b.campus_id, b.track_id, c.name as campus_name,
             t.name as track_name, u.name as faculty_name, u.email as faculty_email
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!sub) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const topics = db.prepare(`
      SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
    `).all(id);

    const progression = CalculationEngine.calculateSubjectProgress(id);
    const exams = db.prepare(`SELECT * FROM exams ORDER BY start_date ASC`).all();
    const examReadiness = exams.map((exam) => CalculationEngine.calculateExamReadiness(id, exam)).filter((r) => r !== null && r.inScopeTopicsCount > 0);

    const formattedTopics = topics.map(formatTopic);

    res.json({
      subject: {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        color: sub.color || '#4361ee',
        targetFinishDate: sub.target_finish_date,
        courseCategory: sub.course_category,
        department: sub.department,
        credits: sub.credits,
        contactHoursL: sub.contact_hours_l,
        contactHoursT: sub.contact_hours_t,
        contactHoursP: sub.contact_hours_p,
        ncrfHours: sub.ncrf_hours,
        isAlternative: Boolean(sub.is_alternative),
        alternativeGroup: sub.alternative_group,
        alternativeFor: sub.alternative_for,
        isActiveForBatch: Boolean(sub.is_active_for_batch),
        sourceDocument: sub.source_document,
        sourceVersion: sub.source_version,
        pageReference: sub.page_reference,
        courseType: sub.course_type,
        campusId: sub.campus_id,
        campus: { id: sub.campus_id, name: sub.campus_name },
        trackId: sub.track_id,
        track: { id: sub.track_id, name: sub.track_name },
        batchId: sub.batch_id,
        batch: { id: sub.batch_id, name: sub.batch_name },
        facultyId: sub.faculty_id,
        facultyName: sub.faculty_name,
        faculty: sub.faculty_name
          ? { id: sub.faculty_id, name: sub.faculty_name, email: sub.faculty_email }
          : undefined,
        recordLabel: sub.record_label,
        needsAdminReview: Boolean(sub.needs_admin_review),
        topics: formattedTopics,
        progression,
        examReadiness,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subjects/:id/explain-calculation
 * Transparent step-by-step mathematical derivation of progress, buffer ratio, and status
 */
router.get('/:id/explain-calculation', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const progress = CalculationEngine.calculateSubjectProgress(id);
    if (!progress) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    const sub = db.prepare(`
      SELECT s.*, b.campus_id, c.name as campus_name FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE s.id = ?
    `).get(id);

    const semester = db.prepare(`
      SELECT * FROM semesters WHERE campus_id = ? ORDER BY start_date DESC LIMIT 1
    `).get(sub.campus_id);

    const timetableSlots = db.prepare(`
      SELECT day_of_week, start_time, end_time FROM timetables WHERE subject_id = ?
    `).all(id);

    res.json({
      subjectId: id,
      subjectCode: progress.subjectCode,
      subjectName: progress.subjectName,
      metrics: progress,
      auditExplanation: {
        formulaHoursInScope: 'Sum of planned_hours for all non-skipped topics.',
        hoursInScope: progress.hoursInScope,
        formulaCoveredHours: 'Completed topics (100%) + In Progress topics (planned_hours * % / 100).',
        coveredHours: progress.coveredHours,
        remainingHours: progress.remainingHours,
        availableTeachingHours: progress.availableHours,
        saturdayRuleUsed: semester?.working_saturdays_rule || 'SECOND_FOURTH_SATURDAY',
        holidaysCount: semester?.holidays_json ? JSON.parse(semester.holidays_json).length : 0,
        timetableWeeklySlotsCount: timetableSlots.length,
        bufferRatioFormula: 'Available Teaching Hours ÷ Remaining Planned Hours',
        bufferRatio: progress.bufferRatio,
        thresholdInterpretation: progress.bufferRatio >= 1.15
          ? 'ON TRACK (Buffer ≥ 1.15): Plenty of buffer sessions remain.'
          : progress.bufferRatio >= 1.00
            ? 'TIGHT (1.00 ≤ Buffer < 1.15): Minimal margin for unforeseen cancellations.'
            : 'DANGER (Buffer < 1.00): Critical shortage! Classes must be added or syllabus paced faster.',
        status: progress.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/subjects/:id/recalculate-dates
 */
router.post('/:id/recalculate-dates', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const progress = CalculationEngine.calculateSubjectProgress(id);
    res.json({ success: true, progression: progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

