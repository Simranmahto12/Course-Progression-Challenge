import crypto from 'crypto';
import { db } from '../db.js';

export class AiLogParser {
  /**
   * Verify WhatsApp HMAC SHA256 Webhook Signature
   */
  static verifyWhatsAppSignature(rawBody, signatureHeader, appSecret) {
    if (!appSecret) return { valid: false, reason: 'WHATSAPP_APP_SECRET not configured' };
    if (!signatureHeader) return { valid: false, reason: 'Missing signature header' };

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSignature)
      );
      return { valid: isValid };
    } catch {
      return { valid: false, reason: 'Signature mismatch' };
    }
  }

  /**
   * Verify Telegram Bot Secret Token Header
   */
  static verifyTelegramSecret(tokenHeader, configuredSecret) {
    if (!configuredSecret) return { valid: false, reason: 'TELEGRAM_BOT_SECRET not configured' };
    if (!tokenHeader) return { valid: false, reason: 'Missing X-Telegram-Bot-Api-Secret-Token header' };
    return { valid: tokenHeader === configuredSecret };
  }

  /**
   * Parse faculty text or voice note transcript into a PROPOSED draft session entry.
   * If confidence is low or key fields are missing, asks for clarification instead of guessing.
   * NEVER silently commits directly to daily_logs!
   */
  static async parseMessageToDraft({ text, senderPhoneOrId, provider = 'whatsapp', explicitFacultyId = null }) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('Message text or transcript is required for parsing.');
    }

    const cleanText = text.trim();
    const validProviders = ['whatsapp', 'telegram', 'voice_web', 'text_input'];
    const cleanProvider = validProviders.includes(provider) ? provider : 'voice_web';

    // 1. Identify and authenticate faculty member
    let faculty = null;
    if (explicitFacultyId) {
      faculty = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'faculty'`).get(explicitFacultyId);
    }

    if (!faculty && senderPhoneOrId) {
      // Find faculty by registered phone or email or id
      faculty = db.prepare(`
        SELECT * FROM users 
        WHERE (phone = ? OR email = ? OR id = ?) AND role = 'faculty'
      `).get(senderPhoneOrId, senderPhoneOrId, senderPhoneOrId);
    }

    if (!faculty) {
      return {
        success: false,
        authorized: false,
        error: `Sender "${senderPhoneOrId}" is not recognized as an authorized faculty member. Please link your phone number in user settings.`,
        needsClarification: true,
        clarificationPrompt: 'Your phone number is not linked to any registered faculty profile. Please contact the campus manager or provide your official email.',
      };
    }

    // 2. Fetch assigned subjects and timetable slots for this faculty
    const assignedSubjects = db.prepare(`
      SELECT s.*, b.name as batch_name, b.campus_id, b.track_id, c.name as campus_name, t.name as track_name
      FROM subjects s
      JOIN batches b ON s.batch_id = b.id
      JOIN campuses c ON b.campus_id = c.id
      JOIN tracks t ON b.track_id = t.id
      WHERE s.faculty_id = ?
    `).all(faculty.id);

    if (assignedSubjects.length === 0) {
      return {
        success: false,
        authorized: true,
        faculty: { id: faculty.id, name: faculty.name },
        error: `Faculty ${faculty.name} does not have any active subjects assigned in this semester.`,
        needsClarification: true,
        clarificationPrompt: 'You have no assigned subjects in the active semester. Please request your campus manager to assign your subjects first.',
      };
    }

    // 3. Match Subject from Message Text
    let matchedSubject = null;
    let subjectMatchScore = 0;

    for (const sub of assignedSubjects) {
      const subNameLower = sub.name.toLowerCase();
      const subCodeLower = sub.code.toLowerCase();
      const textLower = cleanText.toLowerCase();

      // Check code or full name
      if (textLower.includes(subCodeLower)) {
        matchedSubject = sub;
        subjectMatchScore = 1.0;
        break;
      }

      // Check key subject words
      const keywords = subNameLower.split(/[\s,–-]+/).filter((w) => w.length > 2);
      const matchedKeywords = keywords.filter((kw) => textLower.includes(kw));
      const score = matchedKeywords.length / Math.max(1, keywords.length);

      if (score > subjectMatchScore && score >= 0.5) {
        matchedSubject = sub;
        subjectMatchScore = score;
      }
    }

    // If only one subject assigned and text doesn't explicitly conflict, can default with lower confidence
    if (!matchedSubject && assignedSubjects.length === 1) {
      matchedSubject = assignedSubjects[0];
      subjectMatchScore = 0.65;
    }

    // 4. Check for low confidence on subject
    if (!matchedSubject) {
      const subjectList = assignedSubjects.map((s) => `"${s.name}"`).join(', ');
      const draftId = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const prompt = `Which subject was this class for? Your assigned subjects are: ${subjectList}.`;

      db.prepare(`
        INSERT INTO ai_draft_logs (id, provider, sender_phone_or_id, faculty_id, raw_message_text, parsed_payload_json, confidence_score, needs_clarification, clarification_prompt, status, created_at)
        VALUES (?, ?, ?, ?, ?, '{}', 0.35, 1, ?, 'PROPOSED', datetime('now'))
      `).run(draftId, cleanProvider, senderPhoneOrId || faculty.phone, faculty.id, cleanText, prompt);

      return {
        success: true,
        draftId,
        needsClarification: true,
        confidenceScore: 0.35,
        clarificationPrompt: prompt,
        rawMessage: cleanText,
      };
    }

    // 5. Detect Date (defaults to today)
    let sessionDate = new Date().toISOString().slice(0, 10);
    const textLower = cleanText.toLowerCase();
    if (textLower.includes('yesterday')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      sessionDate = d.toISOString().slice(0, 10);
    } else {
      const dateMatch = cleanText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      if (dateMatch) {
        sessionDate = dateMatch[1];
      }
    }

    // 6. Match Timetable Slot
    const timetableSlots = db.prepare(`
      SELECT * FROM timetables 
      WHERE subject_id = ? AND faculty_id = ?
    `).all(matchedSubject.id, faculty.id);

    const slot = timetableSlots[0] || null;

    // 7. Parse Status and Completion Percentage
    let status = 'Completed';
    let percentage = 100;
    let confidence = 0.85;

    if (textLower.includes('cancel') || textLower.includes('could not take') || textLower.includes('leave')) {
      status = 'Cancelled';
      percentage = 0;
    } else if (textLower.includes('skip') || textLower.includes('skipped')) {
      status = 'Skipped';
      percentage = 0;
    } else if (textLower.includes('merge') || textLower.includes('merged')) {
      status = 'Merged';
      percentage = 100;
    } else if (textLower.includes('in progress') || textLower.includes('halfway') || textLower.includes('partially') || textLower.includes('remaining') || textLower.includes('started')) {
      status = 'In Progress';
      percentage = 50;

      // Check for explicit percentage in text (e.g. 70%, 80 percent)
      const pctMatch = cleanText.match(/(\d{1,3})\s*(%|percent)/i);
      if (pctMatch) {
        const parsedPct = parseInt(pctMatch[1], 10);
        if (parsedPct >= 0 && parsedPct <= 100) {
          percentage = parsedPct;
        }
      }
    }

    // 8. Extract Topics Covered, Leftovers, Classwork, Homework
    // Check pending topics of the matched subject
    const subjectTopics = db.prepare(`
      SELECT * FROM topics WHERE subject_id = ? ORDER BY sequence ASC
    `).all(matchedSubject.id);

    let nextTopic = subjectTopics.find((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED') || subjectTopics[0];
    let topicsCovered = nextTopic ? nextTopic.topic_name : matchedSubject.name;

    // Look for topic name matches
    for (const t of subjectTopics) {
      if (textLower.includes(t.topic_name.toLowerCase().slice(0, 15))) {
        topicsCovered = t.topic_name;
        nextTopic = t;
        break;
      }
    }

    let leftovers = '';
    const leftoverMatch = cleanText.match(/(?:leftover|remaining|carry forward|will finish next|next class)[:\s]+([^.]+)/i);
    if (leftoverMatch) {
      leftovers = leftoverMatch[1].trim();
    } else if (status === 'In Progress') {
      leftovers = `${nextTopic?.topic_name || 'Topic'} continuation`;
    }

    let classworkStatus = 'None';
    if (textLower.includes('classwork given') || textLower.includes('lab work done') || textLower.includes('exercise completed')) {
      classworkStatus = 'Completed';
    } else if (textLower.includes('classwork') || textLower.includes('exercise')) {
      classworkStatus = 'Given';
    }

    let homeworkStatus = 'None';
    if (textLower.includes('homework given') || textLower.includes('assignment given') || textLower.includes('assigned task')) {
      homeworkStatus = 'Given';
    } else if (textLower.includes('homework submitted') || textLower.includes('assignment collected')) {
      homeworkStatus = 'Collected';
    }

    // 9. Formulate proposed payload
    const proposedPayload = {
      campusId: matchedSubject.campus_id,
      campusName: matchedSubject.campus_name,
      trackId: matchedSubject.track_id,
      trackName: matchedSubject.track_name,
      batchId: matchedSubject.batch_id,
      batchName: matchedSubject.batch_name,
      subjectId: matchedSubject.id,
      subjectCode: matchedSubject.code,
      subjectName: matchedSubject.name,
      facultyId: faculty.id,
      facultyName: faculty.name,
      timetableId: slot?.id || `tt-auto-${matchedSubject.id}`,
      sessionDate,
      status,
      percentageComplete: percentage,
      topicsCovered,
      leftovers,
      carryForwardTopic: leftovers,
      classworkStatus,
      homeworkStatus,
      notes: `[Parsed from ${provider.toUpperCase()}] ${cleanText}`,
    };

    // Calculate final confidence score
    confidence = Math.round((0.5 * subjectMatchScore + (slot ? 0.3 : 0.15) + 0.2) * 100) / 100;
    const needsClarification = confidence < 0.65;
    const clarificationPrompt = needsClarification
      ? 'Please confirm if this session was for ' + matchedSubject.name + ' on ' + sessionDate + '.'
      : null;

    // 10. Save draft to ai_draft_logs (STATUS = PROPOSED, NEVER AUTO-COMMITTED)
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO ai_draft_logs (
        id, provider, sender_phone_or_id, faculty_id, raw_message_text,
        parsed_payload_json, confidence_score, needs_clarification,
        clarification_prompt, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROPOSED', datetime('now'))
    `).run(
      draftId,
      cleanProvider,
      senderPhoneOrId || faculty.phone,
      faculty.id,
      cleanText,
      JSON.stringify(proposedPayload),
      confidence,
      needsClarification ? 1 : 0,
      clarificationPrompt
    );

    return {
      success: true,
      draftId,
      proposedEntry: proposedPayload,
      confidenceScore: confidence,
      needsClarification,
      clarificationPrompt,
      requiresExplicitConfirmation: true,
      message: 'Class session parsed into a proposed draft. Faculty review and confirmation required before saving.',
    };
  }
}
