-- Course Progression Tracker Schema (PostgreSQL / SQLite Compatible DDL)
-- Mirai School of Technology (MSOT)

CREATE TABLE IF NOT EXISTS campuses (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(64) NOT NULL UNIQUE,
    city VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracks (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_years (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS semesters (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_number INT DEFAULT 5,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_finish_date DATE NOT NULL,
    saturday_rule VARCHAR(64) DEFAULT 'SECOND_FOURTH_SATURDAY',
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    campus_id VARCHAR(64) REFERENCES campuses(id) ON DELETE CASCADE,
    track_id VARCHAR(64) REFERENCES tracks(id) ON DELETE CASCADE,
    semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'FACULTY', -- ADMIN, CAMPUS_MANAGER, FACULTY, STUDENT
    campus_id VARCHAR(64) REFERENCES campuses(id) ON DELETE SET NULL,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_windows (
    id VARCHAR(64) PRIMARY KEY,
    semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL, -- SESSIONAL_1, SESSIONAL_2, MID_TERM, PUT, END_TERM
    display_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holiday_calendars (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(64) DEFAULT 'HOLIDAY',
    campus_id VARCHAR(64) REFERENCES campuses(id) ON DELETE CASCADE,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE,
    is_teaching_suspended BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    campus_id VARCHAR(64) REFERENCES campuses(id) ON DELETE CASCADE,
    track_id VARCHAR(64) REFERENCES tracks(id) ON DELETE CASCADE,
    semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE CASCADE,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE,
    faculty_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    planned_hours DOUBLE PRECISION DEFAULT 0.0,
    target_finish_date DATE NOT NULL,
    color VARCHAR(32) DEFAULT '#2563eb',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(code, campus_id, batch_id)
);

CREATE TABLE IF NOT EXISTS topics (
    id VARCHAR(64) PRIMARY KEY,
    subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE CASCADE,
    unit VARCHAR(128) NOT NULL,
    sequence INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    planned_hours DOUBLE PRECISION NOT NULL,
    exam_scopes VARCHAR(255) NOT NULL, -- e.g. 'MID_TERM,END_TERM'
    prerequisites TEXT,
    status VARCHAR(32) DEFAULT 'PENDING',
    completion_percentage DOUBLE PRECISION DEFAULT 0.0,
    covered_hours DOUBLE PRECISION DEFAULT 0.0,
    planned_date DATE,
    actual_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id VARCHAR(64) PRIMARY KEY,
    campus_id VARCHAR(64) REFERENCES campuses(id) ON DELETE CASCADE,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE,
    subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    weekday INT NOT NULL, -- 1=Mon .. 6=Sat
    start_time VARCHAR(16) NOT NULL,
    end_time VARCHAR(16) NOT NULL,
    duration_hours DOUBLE PRECISION NOT NULL,
    room_number VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_sessions (
    id VARCHAR(64) PRIMARY KEY,
    timetable_entry_id VARCHAR(64) REFERENCES timetable_entries(id) ON DELETE SET NULL,
    subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE,
    campus_id VARCHAR(64) REFERENCES campuses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time VARCHAR(16) NOT NULL,
    end_time VARCHAR(16) NOT NULL,
    duration_hours DOUBLE PRECISION DEFAULT 1.0,
    status VARCHAR(32) DEFAULT 'SCHEDULED',
    has_log BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, session_date, start_time)
);

CREATE TABLE IF NOT EXISTS session_logs (
    id VARCHAR(64) PRIMARY KEY,
    scheduled_session_id VARCHAR(64) UNIQUE REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
    subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(32) NOT NULL,
    actual_hours DOUBLE PRECISION NOT NULL,
    topics_covered TEXT NOT NULL, -- JSON
    what_was_covered TEXT,
    what_was_left_over TEXT,
    carry_forward_action TEXT,
    classwork_status VARCHAR(64) DEFAULT 'NONE',
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    session_log_id VARCHAR(64) REFERENCES session_logs(id) ON DELETE CASCADE,
    changed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL,
    previous_state TEXT,
    new_state TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    scheduled_session_id VARCHAR(64) REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
    subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE CASCADE,
    recipient_user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL, -- FACULTY_REMINDER, CAMPUS_MANAGER_ESCALATION
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    hours_unlogged DOUBLE PRECISION DEFAULT 0.0,
    scheduled_date DATE NOT NULL,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheduled_session_id, type)
);

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id VARCHAR(64) PRIMARY KEY,
    alert_id VARCHAR(64) REFERENCES alerts(id) ON DELETE CASCADE,
    channel VARCHAR(64) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default-settings',
    on_track_threshold DOUBLE PRECISION DEFAULT 1.15,
    tight_threshold DOUBLE PRECISION DEFAULT 1.00,
    default_saturday_rule VARCHAR(64) DEFAULT 'SECOND_FOURTH_SATURDAY',
    academic_year_name VARCHAR(64) DEFAULT '2026-2027',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
