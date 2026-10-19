import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

    -- Topics
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      planned_hours REAL NOT NULL,
      exam_scope_flag TEXT NOT NULL DEFAULT 'MID_TERM,FINAL',
      sequence INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
      percentage_complete REAL NOT NULL DEFAULT 0,
      planned_date TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
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
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

// Automatically initialize schema on import
initDatabase();
