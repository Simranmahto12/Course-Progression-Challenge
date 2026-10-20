import { db } from '../db.js';
import { CalculationEngine } from './calculationEngine.js';

export class AiCampusSummaryEngine {
  /**
   * Generate Grounded Weekly Campus Progress Summary
   * Detects slipping subjects, extracts recorded faculty notes for reasons,
   * generates grounded recovery suggestions, and labels all actions as manager suggestions.
   */
  static async generateSummary({ campusId = 'camp-hitech', weekStartDate, weekEndDate }) {
    if (process.env.AI_SUMMARY_ENABLED === 'false') {
      return {
        enabled: false,
        message: 'AI Campus Summary feature is disabled via AI_SUMMARY_ENABLED=false.',
      };
    }

    const campus = db.prepare(`SELECT * FROM campuses WHERE id = ?`).get(campusId);
    if (!campus) {
      throw new Error(`Campus "${campusId}" not found.`);
    }

    // Default dates if omitted: past 7 days up to today
    const now = new Date();
    const endStr = weekEndDate || now.toISOString().slice(0, 10);
    const startDateObj = new Date(now);
    startDateObj.setDate(startDateObj.getDate() - 7);
    const startStr = weekStartDate || startDateObj.toISOString().slice(0, 10);

    // 1. Fetch all subjects for this campus across tracks
    const subjects = db.prepare(`
      SELECT s.*, b.name as batch_name, t.name as track_name, u.name as faculty_name, u.email as faculty_email
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN tracks t ON b.track_id = t.id
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE b.campus_id = ? AND s.is_active_for_batch = 1
      ORDER BY s.code ASC
    `).all(campusId);

    const slippingSubjects = [];
    const allProgressMap = [];

    // 2. Analyze progress for each subject
    for (const sub of subjects) {
      const prog = CalculationEngine.calculateSubjectProgress(sub.id);
      if (!prog) continue;

      allProgressMap.push({
        id: sub.id,
        code: sub.code,
        name: sub.name,
        track: sub.track_name,
        facultyName: sub.faculty_name || 'Unassigned',
        bufferRatio: prog.bufferRatio,
        coveragePercentage: prog.coveragePercentage,
        status: prog.status,
        remainingHours: prog.remainingHours,
        hoursInScope: prog.hoursInScope,
        coveredHours: prog.coveredHours,
      });

      // Slipping condition: Buffer ratio < 1.15 or status BEHIND / AT_RISK
      if (prog.bufferRatio < 1.15 || prog.status === 'BEHIND' || prog.status === 'AT_RISK') {
        // Query recent faculty session logs for notes and explanations
        const recentLogs = db.prepare(`
          SELECT dl.*, tt.start_time, tt.end_time
          FROM daily_logs dl
          JOIN timetables tt ON dl.timetable_id = tt.id
          WHERE tt.subject_id = ?
            AND dl.session_date >= ?
            AND dl.session_date <= ?
          ORDER BY dl.session_date DESC
        `).all(sub.id, startStr, endStr);

        // Also query missed log alerts
        const missedAlerts = db.prepare(`
          SELECT a.* FROM alerts a
          WHERE a.subject_id = ? AND a.type LIKE '%MISSED%'
        `).all(sub.id);

        const facultyNotes = recentLogs
          .filter((l) => l.notes && l.notes.trim())
          .map((l) => ({
            date: l.session_date,
            note: l.notes,
            topicsCovered: l.topics_covered,
            leftovers: l.leftovers,
            status: l.status,
          }));

        slippingSubjects.push({
          subjectId: sub.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          trackName: sub.track_name,
          facultyName: sub.faculty_name || 'Unassigned',
          bufferRatio: prog.bufferRatio,
          coveragePercentage: prog.coveragePercentage,
          status: prog.status,
          remainingHours: prog.remainingHours,
          availableHours: prog.availableHours,
          facultyNotes,
          missedSessionsCount: missedAlerts.length,
          recentLogsCount: recentLogs.length,
        });
      }
    }

    // 3. Grounded Recovery Actions Generation
    const recoveryActions = [];
    const evidenceList = [];

    for (const item of slippingSubjects) {
      // Find calendar working Saturdays or recovery windows
      const actionType = item.bufferRatio < 0.95 ? 'EXTRA_CLASS' : 'TOPIC_MERGE';
      let proposedDetail = '';
      let rationale = '';
      let evidenceQuote = '';

      if (item.facultyNotes.length > 0) {
        const topNote = item.facultyNotes[0];
        evidenceQuote = `Faculty note on ${topNote.date}: "${topNote.note}" (Leftovers: ${topNote.leftovers || 'None'})`;
      } else if (item.missedSessionsCount > 0) {
        evidenceQuote = `${item.missedSessionsCount} unlogged/missed timetable session(s) recorded in alert history.`;
      } else {
        evidenceQuote = `Buffer ratio dropped to ${item.bufferRatio.toFixed(2)} (below 1.15 threshold) with ${item.remainingHours} hours remaining.`;
      }

      if (actionType === 'EXTRA_CLASS') {
        proposedDetail = `Schedule a 2.0-hour extra recovery session on the upcoming open Saturday for ${item.subjectName}.`;
        rationale = `Subject has ${item.remainingHours} hours remaining with buffer ratio ${item.bufferRatio.toFixed(2)}. ${evidenceQuote}`;
      } else {
        proposedDetail = `Merge adjacent practical exercises or review sessions for ${item.subjectName} to recoup ${item.remainingHours} hrs.`;
        rationale = `Buffer ratio is ${item.bufferRatio.toFixed(2)}. Evidence: ${evidenceQuote}`;
      }

      recoveryActions.push({
        id: `rec-${item.subjectId}-${Date.now().toString(36)}`,
        subjectId: item.subjectId,
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        actionType,
        proposedAction: proposedDetail,
        rationale,
        evidenceCitation: evidenceQuote,
        status: 'SUGGESTION_FOR_MANAGER_REVIEW',
        requiresManagerApproval: true,
      });

      evidenceList.push({
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        bufferRatio: item.bufferRatio,
        evidence: evidenceQuote,
        recordedNotes: item.facultyNotes,
      });
    }

    // 4. Construct Human-Readable Summary Narrative
    const totalCount = subjects.length;
    const slippingCount = slippingSubjects.length;
    const onTrackCount = totalCount - slippingCount;

    let narrative = `### Weekly Academic Progression Summary (${startStr} to ${endStr})\n`;
    narrative += `**Campus:** ${campus.name} | **Active Subjects:** ${totalCount} | **On-Track:** ${onTrackCount} | **Slipping/At-Risk:** ${slippingCount}\n\n`;

    if (slippingCount === 0) {
      narrative += `✅ **All courses are progressing satisfactorily.** All subject buffer ratios exceed the 1.15 safety margin ahead of mid-term exam milestones.\n`;
    } else {
      narrative += `⚠️ **Attention Required for ${slippingCount} Subject(s):**\n\n`;
      for (const s of slippingSubjects) {
        narrative += `- **${s.subjectCode} - ${s.subjectName}** (${s.trackName})\n`;
        narrative += `  - **Faculty:** ${s.facultyName}\n`;
        narrative += `  - **Buffer Ratio:** ${s.bufferRatio.toFixed(2)} (Safety threshold: 1.15) | **Coverage:** ${s.coveragePercentage.toFixed(1)}%\n`;
        narrative += `  - **Recorded Reasons / Notes:** ${s.facultyNotes.length > 0 ? s.facultyNotes.map((n) => `[${n.date}] "${n.note}"`).join('; ') : 'No notes entered; low progression velocity detected'}\n\n`;
      }

      narrative += `💡 **Recommended Recovery Actions (For Campus Manager Review):**\n\n`;
      for (const rec of recoveryActions) {
        narrative += `1. **[${rec.actionType}] ${rec.subjectCode}:** ${rec.proposedAction}\n`;
        narrative += `   *Evidence Link:* ${rec.evidenceCitation}\n`;
      }
    }

    const summaryId = `sum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 5. Persist Summary in Database
    db.prepare(`
      INSERT INTO campus_summaries (
        id, campus_id, week_start_date, week_end_date, summary_markdown, summary_text,
        slipping_subjects_json, recovery_actions_json, grounded_evidence_json,
        status, review_status, generated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT_SUGGESTION', 'PENDING_REVIEW', datetime('now'), datetime('now'))
    `).run(
      summaryId,
      campusId,
      startStr,
      endStr,
      narrative,
      narrative,
      JSON.stringify(slippingSubjects),
      JSON.stringify(recoveryActions),
      JSON.stringify(evidenceList)
    );

    return {
      id: summaryId,
      campusId,
      campusName: campus.name,
      weekStartDate: startStr,
      weekEndDate: endStr,
      totalSubjects: totalCount,
      slippingCount,
      onTrackCount,
      summaryText: narrative,
      slippingSubjects,
      recoveryActions,
      groundedEvidence: evidenceList,
      reviewStatus: 'PENDING_REVIEW',
      disclaimer: 'AI-generated summary for Academic Leadership / Campus Manager review only. Timetables and lesson plans have NOT been modified.',
      isManagerSuggestionOnly: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Manager Reviews and Notes Recovery Action
   */
  static reviewSummary({ summaryId, reviewerId, reviewNotes, actionDecision }) {
    const summary = db.prepare(`SELECT * FROM campus_summaries WHERE id = ?`).get(summaryId);
    if (!summary) throw new Error('Campus summary not found.');

    db.prepare(`
      UPDATE campus_summaries SET
        status = 'REVIEWED_BY_MANAGER',
        review_status = 'REVIEWED',
        reviewer_notes = ?,
        reviewed_by = ?,
        reviewed_at = datetime('now')
      WHERE id = ?
    `).run(reviewNotes || 'Acknowledged by campus academic manager.', reviewerId, summaryId);

    return {
      success: true,
      summaryId,
      reviewStatus: 'REVIEWED',
      reviewedBy: reviewerId,
      reviewNotes: reviewNotes || 'Acknowledged by campus academic manager.',
      actionDecision: actionDecision || 'APPROVED_FOR_OFFLINE_EXECUTION',
    };
  }
}
