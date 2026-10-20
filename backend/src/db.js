import Database from 'better-sqlite3';
import path from 'path';
const DB_FILE = process.env.DATABASE_FILE || path.resolve(process.cwd(), 'database.sqlite');
export const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
export function initDatabase() {
    db.exec(`
    -- Campuses
    CREATE TABLE IF NOT EXISTS campuses (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    -- Tracks
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    -- Batches
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      campus_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    -- Users (admin, campus_manager, faculty, student)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'campus_manager', 'faculty', 'student')),
      campus_id TEXT,
      batch_id TEXT,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    );

    -- Semesters
    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      campus_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      working_saturdays_rule TEXT NOT NULL DEFAULT 'SECOND_FOURTH_SATURDAY' CHECK(working_saturdays_rule IN ('ALL_SATURDAYS', 'NO_SATURDAYS', 'SECOND_FOURTH_SATURDAY')),
      holidays_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    );

    -- Subjects
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      faculty_id TEXT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      target_finish_date TEXT NOT NULL,
      color TEXT,
      course_category TEXT DEFAULT 'ESC',
      department TEXT DEFAULT 'CSE',
      credits REAL DEFAULT 3,
      contact_hours_l INTEGER DEFAULT 3,
      contact_hours_t INTEGER DEFAULT 0,
      contact_hours_p INTEGER DEFAULT 0,
      ncrf_hours INTEGER DEFAULT 45,
      is_alternative INTEGER DEFAULT 0,
      alternative_group TEXT,
      alternative_for TEXT,
      is_active_for_batch INTEGER DEFAULT 1,
      source_document TEXT DEFAULT 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version TEXT DEFAULT 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference TEXT,
      course_type TEXT DEFAULT 'THEORY',
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Timetables
    CREATE TABLE IF NOT EXISTS timetables (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      faculty_id TEXT NOT NULL,
      day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT DEFAULT 'Room 101',
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Topics (Lesson Plans with College-Level Pedagogical Architecture)
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      planned_hours REAL NOT NULL,
      exam_scope_flag TEXT NOT NULL DEFAULT 'MID_TERM,FINAL',
      approved_exam_scope TEXT DEFAULT 'MID_TERM,FINAL',
      sequence INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
      percentage_complete REAL NOT NULL DEFAULT 0,
      planned_date TEXT,
      unit_weightage REAL DEFAULT 20.0,
      learning_outcomes TEXT,
      prerequisite_knowledge TEXT,
      diagnostic_question TEXT,
      concept_explanation TEXT,
      worked_example TEXT,
      guided_practice TEXT,
      independent_application TEXT,
      teaching_method TEXT,
      readings_resources TEXT,
      equipment_safety_notes TEXT,
      formative_check TEXT,
      assignment_evidence TEXT,
      reflection_remediation TEXT,
      inclusive_options TEXT,
      faculty_notes TEXT,
      lesson_plan_status TEXT DEFAULT 'DRAFT' CHECK(lesson_plan_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION')),
      version INTEGER DEFAULT 1,
      source_document TEXT DEFAULT 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      page_reference TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- Lesson Plan Version History
    CREATE TABLE IF NOT EXISTS lesson_plan_versions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      content_json TEXT NOT NULL,
      edited_by TEXT NOT NULL,
      edited_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      reviewer_notes TEXT,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- Planned Date Movement Audit Trail
    CREATE TABLE IF NOT EXISTS date_movement_audit (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      old_date TEXT,
      new_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'SYSTEM_CALENDAR_ENGINE',
      created_at TEXT NOT NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- Daily Logs
    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      session_date TEXT NOT NULL,
      timetable_id TEXT NOT NULL,
      faculty_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Completed', 'In Progress', 'Skipped', 'Merged', 'Cancelled')),
      percentage_complete REAL NOT NULL DEFAULT 100,
      topics_covered TEXT,
      leftovers TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Exams
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      semester_id TEXT NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    );

    -- Alerts (Faculty reminders and Campus Manager escalations)
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      subject_id TEXT,
      recipient_user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      scheduled_date TEXT,
      created_at TEXT NOT NULL,
      timetable_id TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- AI Draft Session Logs (WhatsApp, Telegram, Voice Web Notes)
    CREATE TABLE IF NOT EXISTS ai_draft_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK(provider IN ('whatsapp', 'telegram', 'voice_web', 'text_input')),
      sender_phone_or_id TEXT NOT NULL,
      faculty_id TEXT,
      raw_message_text TEXT NOT NULL,
      parsed_payload_json TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      needs_clarification INTEGER NOT NULL DEFAULT 0,
      clarification_prompt TEXT,
      status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK(status IN ('PROPOSED', 'CONFIRMED', 'DISCARDED')),
      created_at TEXT NOT NULL,
      confirmed_at TEXT,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- AI Weekly Grounded Campus Summaries
    CREATE TABLE IF NOT EXISTS campus_summaries (
      id TEXT PRIMARY KEY,
      campus_id TEXT NOT NULL,
      week_start_date TEXT NOT NULL,
      week_end_date TEXT NOT NULL,
      summary_markdown TEXT NOT NULL,
      slipping_subjects_json TEXT NOT NULL DEFAULT '[]',
      grounded_evidence_json TEXT NOT NULL DEFAULT '[]',
      recovery_actions_json TEXT NOT NULL DEFAULT '[]',
      model_used TEXT NOT NULL DEFAULT 'deterministic-grounded-v1',
      status TEXT NOT NULL DEFAULT 'DRAFT_SUGGESTION' CHECK(status IN ('DRAFT_SUGGESTION', 'REVIEWED_BY_MANAGER')),
      reviewer_notes TEXT,
      generated_at TEXT NOT NULL,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    );

    -- Google Calendar / Outlook Sync Accounts
    CREATE TABLE IF NOT EXISTS calendar_sync_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('google', 'outlook')),
      sync_enabled INTEGER NOT NULL DEFAULT 1,
      scopes TEXT DEFAULT 'https://www.googleapis.com/auth/calendar.events',
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      external_calendar_id TEXT,
      external_account_id TEXT,
      calendar_id TEXT DEFAULT 'primary',
      sync_exam_dates INTEGER DEFAULT 1,
      sync_extra_classes INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      last_synced_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Synced Calendar Events with ETag and Conflict Detection
    CREATE TABLE IF NOT EXISTS calendar_synced_events (
      id TEXT PRIMARY KEY,
      sync_account_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('EXAM', 'EXTRA_CLASS', 'REGULAR_CLASS')),
      source_id TEXT NOT NULL,
      external_event_id TEXT NOT NULL,
      event_summary TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      last_pushed_hash TEXT NOT NULL,
      external_etag TEXT,
      conflict_status TEXT NOT NULL DEFAULT 'IN_SYNC' CHECK(conflict_status IN ('IN_SYNC', 'CONFLICT_EXTERNAL_MODIFICATION', 'ERROR')),
      conflict_details TEXT,
      last_synced_at TEXT NOT NULL,
      FOREIGN KEY (sync_account_id) REFERENCES calendar_sync_accounts(id) ON DELETE CASCADE
    );

    -- Visiting Faculty Compensation Policy
    CREATE TABLE IF NOT EXISTS visiting_faculty_policies (
      id TEXT PRIMARY KEY,
      campus_id TEXT NOT NULL,
      rate_per_lecture_hour REAL NOT NULL,
      lab_multiplier REAL NOT NULL DEFAULT 1.0,
      max_hours_per_month REAL NOT NULL DEFAULT 40.0,
      conveyance_allowance REAL NOT NULL DEFAULT 0.0,
      currency TEXT NOT NULL DEFAULT 'INR',
      effective_from TEXT NOT NULL,
      configured_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
    );

    -- Monthly Visiting Faculty Honorarium Reports
    CREATE TABLE IF NOT EXISTS honorarium_reports (
      id TEXT PRIMARY KEY,
      campus_id TEXT NOT NULL,
      month_year TEXT NOT NULL,
      faculty_id TEXT NOT NULL,
      planned_sessions_count INTEGER NOT NULL DEFAULT 0,
      planned_hours REAL NOT NULL DEFAULT 0.0,
      delivered_sessions_count INTEGER NOT NULL DEFAULT 0,
      delivered_hours REAL NOT NULL DEFAULT 0.0,
      rate_applied REAL NOT NULL,
      total_amount REAL NOT NULL,
      source_log_ids_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED_BY_ADMIN', 'PAID')),
      approved_by TEXT,
      approved_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  function ensureColumn(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((item) => item.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  ensureColumn('users', 'phone', 'TEXT');
  ensureColumn('users', 'is_visiting_faculty', 'INTEGER DEFAULT 0');
  ensureColumn('users', 'designation', 'TEXT DEFAULT "Assistant Professor"');

  ensureColumn('semesters', 'track_id', 'TEXT');
  ensureColumn('semesters', 'name', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('subjects', 'record_label', 'TEXT');
  ensureColumn('subjects', 'needs_admin_review', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('subjects', 'course_category', "TEXT DEFAULT 'ESC'");
  ensureColumn('subjects', 'department', "TEXT DEFAULT 'CSE'");
  ensureColumn('subjects', 'credits', 'REAL DEFAULT 3');
  ensureColumn('subjects', 'contact_hours_l', 'INTEGER DEFAULT 3');
  ensureColumn('subjects', 'contact_hours_t', 'INTEGER DEFAULT 0');
  ensureColumn('subjects', 'contact_hours_p', 'INTEGER DEFAULT 0');
  ensureColumn('subjects', 'ncrf_hours', 'INTEGER DEFAULT 45');
  ensureColumn('subjects', 'is_alternative', 'INTEGER DEFAULT 0');
  ensureColumn('subjects', 'alternative_group', 'TEXT');
  ensureColumn('subjects', 'alternative_for', 'TEXT');
  ensureColumn('subjects', 'is_active_for_batch', 'INTEGER DEFAULT 1');
  ensureColumn('subjects', 'source_document', "TEXT DEFAULT 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27'");
  ensureColumn('subjects', 'source_version', "TEXT DEFAULT 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)'");
  ensureColumn('subjects', 'page_reference', 'TEXT');
  ensureColumn('subjects', 'course_type', "TEXT DEFAULT 'THEORY'");

  ensureColumn('topics', 'unit_weightage', 'REAL DEFAULT 20.0');
  ensureColumn('topics', 'approved_exam_scope', "TEXT DEFAULT 'MID_TERM,FINAL'");
  ensureColumn('topics', 'learning_outcomes', 'TEXT');
  ensureColumn('topics', 'prerequisite_knowledge', 'TEXT');
  ensureColumn('topics', 'diagnostic_question', 'TEXT');
  ensureColumn('topics', 'concept_explanation', 'TEXT');
  ensureColumn('topics', 'worked_example', 'TEXT');
  ensureColumn('topics', 'guided_practice', 'TEXT');
  ensureColumn('topics', 'independent_application', 'TEXT');
  ensureColumn('topics', 'teaching_method', 'TEXT');
  ensureColumn('topics', 'readings_resources', 'TEXT');
  ensureColumn('topics', 'equipment_safety_notes', 'TEXT');
  ensureColumn('topics', 'formative_check', 'TEXT');
  ensureColumn('topics', 'assignment_evidence', 'TEXT');
  ensureColumn('topics', 'reflection_remediation', 'TEXT');
  ensureColumn('topics', 'inclusive_options', 'TEXT');
  ensureColumn('topics', 'faculty_notes', 'TEXT');
  ensureColumn('topics', 'lesson_plan_status', "TEXT DEFAULT 'DRAFT'");
  ensureColumn('topics', 'version', 'INTEGER DEFAULT 1');
  ensureColumn('topics', 'source_document', "TEXT DEFAULT 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27'");
  ensureColumn('topics', 'page_reference', 'TEXT');

  ensureColumn('daily_logs', 'classwork_status', "TEXT NOT NULL DEFAULT 'None'");
  ensureColumn('daily_logs', 'homework_status', "TEXT NOT NULL DEFAULT 'None'");
  ensureColumn('daily_logs', 'carry_forward_topic', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('alerts', 'timetable_id', 'TEXT');
  ensureColumn('alerts', 'delivery_channel', "TEXT DEFAULT 'IN_APP'");
  ensureColumn('alerts', 'is_escalated', 'INTEGER DEFAULT 0');
  ensureColumn('alerts', 'escalated_to', 'TEXT');
  ensureColumn('alerts', 'acknowledged_at', 'TEXT');

  ensureColumn('calendar_sync_accounts', 'external_account_id', 'TEXT');
  ensureColumn('calendar_sync_accounts', 'calendar_id', "TEXT DEFAULT 'primary'");
  ensureColumn('calendar_sync_accounts', 'sync_exam_dates', 'INTEGER DEFAULT 1');
  ensureColumn('calendar_sync_accounts', 'sync_extra_classes', 'INTEGER DEFAULT 1');
  ensureColumn('calendar_sync_accounts', 'created_at', 'TEXT');
  ensureColumn('calendar_sync_accounts', 'updated_at', 'TEXT');
  ensureColumn('calendar_sync_accounts', 'last_sync_at', 'TEXT');

  ensureColumn('campus_summaries', 'summary_text', 'TEXT');
  ensureColumn('campus_summaries', 'review_status', "TEXT DEFAULT 'PENDING_REVIEW'");
  ensureColumn('campus_summaries', 'reviewed_by', 'TEXT');
  ensureColumn('campus_summaries', 'reviewed_at', 'TEXT');
  ensureColumn('campus_summaries', 'created_at', 'TEXT');
}
// Automatically initialize schema on import
initDatabase();
