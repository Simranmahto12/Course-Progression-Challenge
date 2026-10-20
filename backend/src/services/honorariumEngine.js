import { db } from '../db.js';
import { CalculationEngine } from './calculationEngine.js';

export class HonorariumEngine {
  /**
   * Get Active Visiting Faculty Policy for a Campus
   */
  static getPolicy(campusId) {
    const policy = db.prepare(`
      SELECT * FROM visiting_faculty_policies 
      WHERE campus_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(campusId);

    if (!policy) {
      return {
        configured: false,
        campusId,
        message: 'No honorarium policy configured for this campus. An administrator must configure rates before generating reports.',
      };
    }

    return {
      configured: true,
      ...policy,
    };
  }

  /**
   * Admin Configures Honorarium Policy
   * Strictly avoids inventing rates by enforcing administrator input
   */
  static setPolicy({
    campusId,
    ratePerLectureHour,
    labMultiplier = 1.0,
    maxHoursPerMonth = 40.0,
    conveyanceAllowance = 0.0,
    currency = 'INR',
    configuredBy,
  }) {
    if (!campusId) throw new Error('campusId is required.');
    const rate = Number(ratePerLectureHour);
    if (isNaN(rate) || rate <= 0) {
      throw new Error('Valid positive ratePerLectureHour must be configured by an administrator.');
    }

    const existing = db.prepare(`SELECT * FROM visiting_faculty_policies WHERE campus_id = ?`).get(campusId);
    const nowIso = new Date().toISOString();
    const effectiveFrom = nowIso.slice(0, 10);

    if (existing) {
      db.prepare(`
        UPDATE visiting_faculty_policies SET
          rate_per_lecture_hour = ?,
          lab_multiplier = ?,
          max_hours_per_month = ?,
          conveyance_allowance = ?,
          currency = ?,
          configured_by = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        rate,
        Number(labMultiplier) || 1.0,
        Number(maxHoursPerMonth) || 40.0,
        Number(conveyanceAllowance) || 0.0,
        currency,
        configuredBy,
        nowIso,
        existing.id
      );

      return { success: true, policyId: existing.id, updated: true, ratePerLectureHour: rate };
    }

    const policyId = `pol-${campusId}-${Date.now().toString(36)}`;
    db.prepare(`
      INSERT INTO visiting_faculty_policies (
        id, campus_id, rate_per_lecture_hour, lab_multiplier, max_hours_per_month,
        conveyance_allowance, currency, effective_from, configured_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      policyId,
      campusId,
      rate,
      Number(labMultiplier) || 1.0,
      Number(maxHoursPerMonth) || 40.0,
      Number(conveyanceAllowance) || 0.0,
      currency,
      effectiveFrom,
      configuredBy,
      nowIso
    );

    return { success: true, policyId, created: true, ratePerLectureHour: rate };
  }

  /**
   * Generate Monthly Visiting Faculty Honorarium Report
   */
  static generateMonthlyReport({ campusId, monthYear, facultyId = null, createdBy }) {
    const policyResult = this.getPolicy(campusId);
    if (!policyResult.configured) {
      throw new Error(
        'Honorarium rate policy has not been configured by an academic administrator for this campus. Please configure the policy first.'
      );
    }

    const rate = policyResult.rate_per_lecture_hour;
    const conveyance = policyResult.conveyance_allowance || 0;

    // Determine date boundaries for the month (e.g. 2026-10)
    const [year, month] = monthYear.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const startDateStr = `${monthYear}-01`;
    const endDateStr = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

    // Query visiting faculty
    let facultyQuery = `
      SELECT * FROM users 
      WHERE (is_visiting_faculty = 1 OR role = 'faculty')
        AND (campus_id = ? OR campus_id IS NULL)
    `;
    const facultyParams = [campusId];

    if (facultyId) {
      facultyQuery += ` AND id = ?`;
      facultyParams.push(facultyId);
    }

    const facultyList = db.prepare(facultyQuery).all(...facultyParams);

    if (facultyList.length === 0) {
      throw new Error('No visiting faculty members found for this campus.');
    }

    const generatedReports = [];
    const nowIso = new Date().toISOString();

    for (const fac of facultyList) {
      // 1. Calculate planned hours from timetables
      const timetables = db.prepare(`
        SELECT tt.*, s.name as subject_name, s.code as subject_code
        FROM timetables tt
        JOIN subjects s ON tt.subject_id = s.id
        WHERE tt.faculty_id = ?
      `).all(fac.id);

      let plannedWeeklyHours = 0;
      for (const slot of timetables) {
        plannedWeeklyHours += CalculationEngine.timeToHours(slot.end_time) - CalculationEngine.timeToHours(slot.start_time);
      }
      // Estimated 4.2 weeks in a month
      const estimatedMonthlyPlannedHours = Math.round(plannedWeeklyHours * 4.2 * 10) / 10;
      const plannedSessionsCount = Math.round(timetables.length * 4.2);

      // 2. Query delivered logs for the month
      const logs = db.prepare(`
        SELECT dl.*, tt.start_time, tt.end_time, s.name as subject_name, s.code as subject_code
        FROM daily_logs dl
        JOIN timetables tt ON dl.timetable_id = tt.id
        JOIN subjects s ON tt.subject_id = s.id
        WHERE dl.faculty_id = ?
          AND dl.session_date >= ?
          AND dl.session_date <= ?
        ORDER BY dl.session_date ASC
      `).all(fac.id, startDateStr, endDateStr);

      let deliveredHours = 0;
      let deliveredSessionsCount = 0;
      let cancelledSessionsCount = 0;
      const sourceLogIds = [];

      for (const log of logs) {
        sourceLogIds.push(log.id);
        if (log.status === 'Completed' || log.status === 'In Progress' || log.status === 'Merged') {
          deliveredSessionsCount++;
          const duration = CalculationEngine.timeToHours(log.end_time) - CalculationEngine.timeToHours(log.start_time);
          const effectiveHours = duration * (log.percentage_complete / 100);
          deliveredHours += effectiveHours;
        } else if (log.status === 'Cancelled' || log.status === 'Skipped') {
          cancelledSessionsCount++;
        }
      }

      deliveredHours = Math.round(deliveredHours * 10) / 10;

      // Honorarium amount calculation
      const lectureHonorarium = Math.round(deliveredHours * rate);
      const totalAmount = lectureHonorarium + conveyance;

      // Query subject syllabus coverage %
      const taughtSubject = timetables[0]?.subject_id
        ? db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(timetables[0].subject_id)
        : null;

      let syllabusCoveragePercentage = 0;
      if (taughtSubject) {
        const prog = CalculationEngine.calculateSubjectProgress(taughtSubject.id);
        syllabusCoveragePercentage = prog?.coveragePercentage || 0;
      }

      // Check existing report for same month and faculty
      const existingReport = db.prepare(`
        SELECT * FROM honorarium_reports 
        WHERE campus_id = ? AND month_year = ? AND faculty_id = ?
      `).get(campusId, monthYear, fac.id);

      const reportId = existingReport ? existingReport.id : `hon-${campusId}-${fac.id}-${monthYear}`;

      if (existingReport) {
        db.prepare(`
          UPDATE honorarium_reports SET
            planned_sessions_count = ?,
            planned_hours = ?,
            delivered_sessions_count = ?,
            delivered_hours = ?,
            rate_applied = ?,
            total_amount = ?,
            source_log_ids_json = ?,
            notes = ?
          WHERE id = ?
        `).run(
          plannedSessionsCount,
          estimatedMonthlyPlannedHours,
          deliveredSessionsCount,
          deliveredHours,
          rate,
          totalAmount,
          JSON.stringify(sourceLogIds),
          `Cancelled sessions: ${cancelledSessionsCount}. Syllabus coverage: ${syllabusCoveragePercentage}%.`,
          reportId
        );
      } else {
        db.prepare(`
          INSERT INTO honorarium_reports (
            id, campus_id, month_year, faculty_id,
            planned_sessions_count, planned_hours,
            delivered_sessions_count, delivered_hours,
            rate_applied, total_amount, source_log_ids_json,
            status, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
        `).run(
          reportId,
          campusId,
          monthYear,
          fac.id,
          plannedSessionsCount,
          estimatedMonthlyPlannedHours,
          deliveredSessionsCount,
          deliveredHours,
          rate,
          totalAmount,
          JSON.stringify(sourceLogIds),
          `Cancelled sessions: ${cancelledSessionsCount}. Syllabus coverage: ${syllabusCoveragePercentage}%.`,
          nowIso
        );
      }

      generatedReports.push({
        id: reportId,
        campusId,
        monthYear,
        faculty: {
          id: fac.id,
          name: fac.name,
          email: fac.email,
          phone: fac.phone,
          designation: fac.designation || 'Visiting Professor',
        },
        plannedSessionsCount,
        plannedHours: estimatedMonthlyPlannedHours,
        deliveredSessionsCount,
        cancelledSessionsCount,
        deliveredHours,
        rateApplied: rate,
        conveyanceAllowance: conveyance,
        totalAmount,
        syllabusCoveragePercentage,
        sourceLogIds,
        status: existingReport?.status || 'DRAFT',
      });
    }

    return {
      success: true,
      campusId,
      monthYear,
      ratePolicy: policyResult,
      totalFacultyReports: generatedReports.length,
      reports: generatedReports,
    };
  }

  /**
   * Submit Report for Approval
   */
  static submitReport(reportId, userId) {
    const report = db.prepare(`SELECT * FROM honorarium_reports WHERE id = ?`).get(reportId);
    if (!report) throw new Error('Honorarium report not found.');

    db.prepare(`UPDATE honorarium_reports SET status = 'SUBMITTED' WHERE id = ?`).run(reportId);
    return { success: true, reportId, status: 'SUBMITTED', message: 'Report submitted for Academic Head review.' };
  }

  /**
   * Academic Administrator Approves Report
   */
  static approveReport(reportId, approverUser, notes) {
    const report = db.prepare(`SELECT * FROM honorarium_reports WHERE id = ?`).get(reportId);
    if (!report) throw new Error('Honorarium report not found.');

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE honorarium_reports SET
        status = 'APPROVED_BY_ADMIN',
        approved_by = ?,
        approved_at = ?,
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(approverUser.name || approverUser.id, nowIso, notes, reportId);

    return {
      success: true,
      reportId,
      status: 'APPROVED_BY_ADMIN',
      approvedBy: approverUser.name || approverUser.id,
      approvedAt: nowIso,
      message: 'Honorarium report approved by administrator and ready for finance export.',
    };
  }
}

