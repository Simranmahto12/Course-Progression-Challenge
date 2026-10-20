import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';

export function seedDatabase() {
  console.log('🌱 Initializing SQLite Database and Seeding Sample Data for MSOT Course Progression Platform...');
  initDatabase();

  // Clean existing data for clean re-seed
  db.exec(`
    DELETE FROM calendar_synced_events;
    DELETE FROM calendar_sync_accounts;
    DELETE FROM honorarium_reports;
    DELETE FROM visiting_faculty_policies;
    DELETE FROM ai_draft_logs;
    DELETE FROM campus_summaries;
    DELETE FROM daily_logs;
    DELETE FROM lesson_plan_versions;
    DELETE FROM date_movement_audit;
    DELETE FROM topics;
    DELETE FROM timetables;
    DELETE FROM exams;
    DELETE FROM alerts;
    DELETE FROM subjects;
    DELETE FROM users;
    DELETE FROM batches;
    DELETE FROM semesters;
    DELETE FROM tracks;
    DELETE FROM campuses;
  `);

  // 1. Campuses (The three official campuses specified in the brief)
  const campuses = [
    { id: 'camp-rathinam', name: 'Rathinam' },
    { id: 'camp-hitech', name: 'HI-Tech' },
    { id: 'camp-jagannath', name: 'Jagannath University' },
  ];

  const insertCampus = db.prepare(`INSERT INTO campuses (id, name) VALUES (?, ?)`);
  for (const c of campuses) {
    insertCampus.run(c.id, c.name);
  }
  console.log('✔ Campuses seeded (Rathinam, HI-Tech, Jagannath University)');

  // 2. Tracks (Mirai Track & AKTU Track for HI-Tech)
  const tracks = [
    { id: 'track-mirai', name: 'Mirai Track', description: 'Industry-integrated AI/ML hands-on curriculum' },
    { id: 'track-aktu', name: 'AKTU Track', description: 'Official AKTU University Curriculum (2026-27 Model Scheme)' },
  ];

  const insertTrack = db.prepare(`INSERT INTO tracks (id, name, description) VALUES (?, ?, ?)`);
  for (const t of tracks) {
    insertTrack.run(t.id, t.name, t.description);
  }
  console.log('✔ Tracks seeded (Mirai Track, AKTU Track)');

  // 3. Batches
  const batches = [
    { id: 'batch-hitech-mirai', campus_id: 'camp-hitech', track_id: 'track-mirai', name: 'HI-Tech · BTech CSE (AI/ML) · Mirai Track' },
    { id: 'batch-hitech-aktu', campus_id: 'camp-hitech', track_id: 'track-aktu', name: 'HI-Tech · BTech CSE (AI/ML) · AKTU Track' },
    { id: 'batch-rathinam', campus_id: 'camp-rathinam', track_id: 'track-mirai', name: 'Rathinam · BTech CSE' },
    { id: 'batch-jagannath', campus_id: 'camp-jagannath', track_id: 'track-mirai', name: 'Jagannath Univ · BTech CSE' },
  ];

  const insertBatch = db.prepare(`INSERT INTO batches (id, campus_id, track_id, name) VALUES (?, ?, ?, ?)`);
  for (const b of batches) {
    insertBatch.run(b.id, b.campus_id, b.track_id, b.name);
  }

  // 4. Users (All password: 'mirai123', OTP: '123456')
  const passwordHash = bcrypt.hashSync('mirai123', 10);
  const users = [
    {
      id: 'usr-admin',
      email: 'admin@mirai.edu',
      name: 'Dr. Suresh Varma',
      role: 'admin',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543210',
    },
    {
      id: 'usr-mgr-hitech',
      email: 'manager.hitech@mirai.edu',
      name: 'Priya Nair',
      role: 'campus_manager',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543211',
    },
    {
      id: 'usr-fac-sharma',
      email: 'faculty.sharma@mirai.edu',
      name: 'Vishal Rathee',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543212',
    },
    {
      id: 'usr-fac-varun',
      email: 'faculty.varun@mirai.edu',
      name: 'Varun Kumar Sharma',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543220',
    },
    {
      id: 'usr-fac-gupta',
      email: 'faculty.gupta@mirai.edu',
      name: 'Aman Srivastava',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543214',
    },
    {
      id: 'usr-fac-himanshu',
      email: 'faculty.himanshu@mirai.edu',
      name: 'Himanshu Sharma Kumar',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543215',
    },
    {
      id: 'usr-fac-soniya',
      email: 'faculty.soniya@mirai.edu',
      name: 'Soniya tyagi',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543216',
    },
    {
      id: 'usr-fac-suman',
      email: 'faculty.suman@mirai.edu',
      name: 'Dr Suman Rajput',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543217',
    },
    {
      id: 'usr-fac-gaurav',
      email: 'faculty.gaurav@mirai.edu',
      name: 'Gaurav Singh Singh',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543218',
    },
    {
      id: 'usr-fac-zakir',
      email: 'faculty.zakir@mirai.edu',
      name: 'Zakir Husain Husain',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
      phone: '9876543219',
      is_visiting_faculty: 1,
      designation: 'Adjunct Visiting Specialist',
    },
    {
      id: 'usr-stu-aarav',
      email: 'student.aarav@mirai.edu',
      name: 'Aarav Mehta',
      role: 'student',
      campus_id: 'camp-hitech',
      batch_id: 'batch-hitech-mirai',
      phone: '9876543213',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, campus_id, batch_id, phone, is_visiting_faculty, designation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(
      u.id,
      u.email,
      passwordHash,
      u.name,
      u.role,
      u.campus_id,
      u.batch_id,
      u.phone,
      u.is_visiting_faculty || 0,
      u.designation || 'Assistant Professor'
    );
  }
  console.log('✔ Demo Users seeded (Admin, Campus Manager, Faculty, Student - Password: mirai123, OTP: 123456)');

  // 5. Semesters
  const holidays = [
    { date: '2026-08-15', title: 'Independence Day' },
    { date: '2026-10-02', title: 'Gandhi Jayanti' },
    { date: '2026-10-20', title: 'Dussehra Break' },
    { date: '2026-11-09', title: 'Diwali Break' },
  ];
  const holidaysJson = JSON.stringify(holidays);

  const insertSemester = db.prepare(`
    INSERT INTO semesters (id, campus_id, track_id, name, start_date, end_date, working_saturdays_rule, holidays_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSemester.run('sem-hitech-mirai', 'camp-hitech', 'track-mirai', 'HI-Tech · Fall 2026 (Mirai Track)', '2026-08-01', '2026-12-20', 'SECOND_FOURTH_SATURDAY', holidaysJson);
  insertSemester.run('sem-hitech-aktu', 'camp-hitech', 'track-aktu', 'HI-Tech · Fall 2026 (AKTU Track)', '2026-08-01', '2026-12-20', 'SECOND_FOURTH_SATURDAY', holidaysJson);
  insertSemester.run('sem-rathinam', 'camp-rathinam', 'track-mirai', 'Rathinam · Fall 2026', '2026-08-01', '2026-12-20', 'SECOND_FOURTH_SATURDAY', holidaysJson);
  insertSemester.run('sem-jagannath', 'camp-jagannath', 'track-mirai', 'Jagannath Univ · Fall 2026', '2026-08-01', '2026-12-20', 'SECOND_FOURTH_SATURDAY', holidaysJson);

  // 6. Exam Windows
  const insertExam = db.prepare(`
    INSERT INTO exams (id, semester_id, name, display_name, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertExam.run('exam-mid-hitech-mirai', 'sem-hitech-mirai', 'MID_TERM', 'Mid-Semester Examinations', '2026-10-27', '2026-11-03');
  insertExam.run('exam-final-hitech-mirai', 'sem-hitech-mirai', 'FINAL', 'End-Semester Final Examinations', '2026-12-10', '2026-12-20');
  insertExam.run('exam-mid-hitech-aktu', 'sem-hitech-aktu', 'MID_TERM', 'Mid-Semester Examinations', '2026-10-27', '2026-11-03');
  insertExam.run('exam-final-hitech-aktu', 'sem-hitech-aktu', 'FINAL', 'End-Semester Final Examinations', '2026-12-10', '2026-12-20');

  console.log('✔ Semesters, Saturday Rules, Holidays, and Exam Windows seeded');

  // 7. Subjects for HI-Tech
  // 7A. HI-Tech · Mirai Track Subjects (Semester 1: Vishal Rathee & Varun Kumar Sharma)
  const miraiSubjects = [
    {
      id: 'sub-dsa',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'CS101',
      name: 'DSA in C++',
      target_finish_date: '2026-12-05',
      color: '#6366f1',
      course_category: 'ESC',
      department: 'CSE',
      credits: 4,
      contact_hours_l: 3,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 60,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Mirai BTech CSE Curriculum 2026',
      source_version: 'v2026.1',
      page_reference: 'Section 4.1',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-mirai-web',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-varun',
      code: 'CS102',
      name: 'Web Development',
      target_finish_date: '2026-12-08',
      color: '#06b6d4',
      course_category: 'ESC',
      department: 'CSE',
      credits: 3,
      contact_hours_l: 2,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Mirai BTech CSE Curriculum 2026',
      source_version: 'v2026.1',
      page_reference: 'Section 4.2',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-mirai-dsa1',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'DSA-101',
      name: 'Data Structure and Algorithm 1',
      target_finish_date: '2026-12-05',
      color: '#ec4899',
      course_category: 'ESC',
      department: 'CSE',
      credits: 4,
      contact_hours_l: 3,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 60,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Mirai BTech CSE Curriculum 2026',
      source_version: 'v2026.1',
      page_reference: 'Section 4.3',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-mirai-web-basics',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-varun',
      code: 'Web 101',
      name: 'Internet & Web Basics',
      target_finish_date: '2026-12-10',
      color: '#3b82f6',
      course_category: 'ESC',
      department: 'CSE',
      credits: 3,
      contact_hours_l: 2,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Mirai BTech CSE Curriculum 2026',
      source_version: 'v2026.1',
      page_reference: 'Section 4.4',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-mirai-prod',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'PD 101',
      name: 'Product Development',
      target_finish_date: '2026-12-18',
      color: '#10b981',
      course_category: 'SDC',
      department: 'CSE',
      credits: 2,
      contact_hours_l: 0,
      contact_hours_t: 1,
      contact_hours_p: 2,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Mirai BTech CSE Curriculum 2026',
      source_version: 'v2026.1',
      page_reference: 'Section 4.5',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-mirai-prod-dup',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'PD 101',
      name: 'Product Development',
      target_finish_date: '2026-12-18',
      color: '#10b981',
      course_category: 'SDC',
      department: 'CSE',
      credits: 2,
      contact_hours_l: 0,
      contact_hours_t: 1,
      contact_hours_p: 2,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Mirai BTech CSE Curriculum 2026',
      source_version: 'v2026.1',
      page_reference: 'Section 4.5',
      course_type: 'THEORY',
      record_label: 'Duplicate System Record',
      needs_admin_review: 1,
    },
  ];

  // 7B. HI-Tech · AKTU Track Subjects (Semester 1)
  const aktuSubjects = [
    {
      id: 'sub-aktu-iks',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-gaurav',
      code: 'KNC101',
      name: 'IKS',
      target_finish_date: '2026-12-15',
      color: '#f59e0b',
      course_category: 'HSMC',
      department: 'AS&H',
      credits: 2,
      contact_hours_l: 2,
      contact_hours_t: 0,
      contact_hours_p: 0,
      ncrf_hours: 30,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 38-40',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-electrical',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-gupta',
      code: 'KEE101',
      name: 'Fundamentals of Electrical Engg.',
      target_finish_date: '2026-12-15',
      color: '#8b5cf6',
      course_category: 'ESC',
      department: 'EE/ECE',
      credits: 3,
      contact_hours_l: 2,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 21-23',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-physics',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-himanshu',
      code: 'KAS101',
      name: 'Physics',
      target_finish_date: '2026-12-15',
      color: '#3b82f6',
      course_category: 'BSC',
      department: 'AS&H',
      credits: 3,
      contact_hours_l: 3,
      contact_hours_t: 0,
      contact_hours_p: 0,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 7-9',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-prompt',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-sharma',
      code: 'KAI101',
      name: 'Introduction to prompt Eng',
      target_finish_date: '2026-12-15',
      color: '#f97316',
      course_category: 'ESC',
      department: 'CSE',
      credits: 2,
      contact_hours_l: 2,
      contact_hours_t: 0,
      contact_hours_p: 0,
      ncrf_hours: 30,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 46-52',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-langlab',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-soniya',
      code: 'KAS151',
      name: 'Language lab',
      target_finish_date: '2026-12-15',
      color: '#84cc16',
      course_category: 'BSC/NCMC',
      department: 'AS&H',
      credits: 1,
      contact_hours_l: 0,
      contact_hours_t: 0,
      contact_hours_p: 2,
      ncrf_hours: 30,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 3, 82-84',
      course_type: 'PRACTICAL',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-physlab',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-suman',
      code: 'KAS152',
      name: 'Physics Lab',
      target_finish_date: '2026-12-15',
      color: '#06b6d4',
      course_category: 'BSC',
      department: 'AS&H',
      credits: 1,
      contact_hours_l: 0,
      contact_hours_t: 0,
      contact_hours_p: 2,
      ncrf_hours: 30,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 56-59',
      course_type: 'PRACTICAL',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-math1',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-gaurav',
      code: 'KAS103',
      name: 'Mathematics-I',
      target_finish_date: '2026-12-15',
      color: '#6366f1',
      course_category: 'BSC',
      department: 'AS&H',
      credits: 4,
      contact_hours_l: 3,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 60,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 13-16',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-programming',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-sharma',
      code: 'KCS103',
      name: 'Programming language',
      target_finish_date: '2026-12-15',
      color: '#a855f7',
      course_category: 'ESC',
      department: 'CSE',
      credits: 3,
      contact_hours_l: 2,
      contact_hours_t: 1,
      contact_hours_p: 0,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 28-32',
      course_type: 'THEORY',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-eleclab',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-gupta',
      code: 'KEE151',
      name: 'Electrical Engg. Lab',
      target_finish_date: '2026-12-15',
      color: '#ef4444',
      course_category: 'ESC',
      department: 'EE/ECE',
      credits: 1,
      contact_hours_l: 0,
      contact_hours_t: 0,
      contact_hours_p: 2,
      ncrf_hours: 30,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 2, 64-67',
      course_type: 'PRACTICAL',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-cad',
      batch_id: 'batch-hitech-aktu',
      faculty_id: 'usr-fac-zakir',
      code: 'KCE151',
      name: 'Computer-Aided Engineering Drawing',
      target_finish_date: '2026-12-15',
      color: '#64748b',
      course_category: 'ESC/SDC',
      department: 'CE/ME',
      credits: 2,
      contact_hours_l: 0,
      contact_hours_t: 1,
      contact_hours_p: 2,
      ncrf_hours: 45,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      source_version: 'w.e.f. 2026-27 (AICTE Model Curriculum & NEP2020)',
      page_reference: 'Pages 3, 73-77',
      course_type: 'PRACTICAL',
      record_label: null,
      needs_admin_review: 0,
    },
    {
      id: 'sub-aktu-resources',
      batch_id: 'batch-hitech-aktu',
      faculty_id: null,
      code: 'ACAD-RES',
      name: 'ALL ACAD RESOURCES',
      target_finish_date: '2026-12-20',
      color: '#475569',
      course_category: 'AUDIT',
      department: 'Central Academic Desk',
      credits: 0,
      contact_hours_l: 0,
      contact_hours_t: 0,
      contact_hours_p: 0,
      ncrf_hours: 0,
      is_alternative: 0,
      alternative_group: null,
      alternative_for: null,
      is_active_for_batch: 1,
      source_document: 'Central Academic Repository 2026',
      source_version: 'v1.0',
      page_reference: 'Institutional Portal',
      course_type: 'PRACTICAL',
      record_label: null,
      needs_admin_review: 0,
    },
  ];

  const allSubjects = [...miraiSubjects, ...aktuSubjects];

  const insertSubject = db.prepare(`
    INSERT INTO subjects (
      id, batch_id, faculty_id, code, name, target_finish_date, color,
      course_category, department, credits, contact_hours_l, contact_hours_t, contact_hours_p,
      ncrf_hours, is_alternative, alternative_group, alternative_for, is_active_for_batch,
      source_document, source_version, page_reference, course_type, record_label, needs_admin_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of allSubjects) {
    insertSubject.run(
      s.id, s.batch_id, s.faculty_id, s.code, s.name, s.target_finish_date, s.color,
      s.course_category, s.department, s.credits, s.contact_hours_l, s.contact_hours_t, s.contact_hours_p,
      s.ncrf_hours, s.is_alternative, s.alternative_group, s.alternative_for, s.is_active_for_batch,
      s.source_document, s.source_version, s.page_reference, s.course_type, s.record_label, s.needs_admin_review
    );
  }
  console.log(`✔ Subjects seeded: ${miraiSubjects.length} Mirai Track subjects + ${aktuSubjects.length} AKTU Track subjects`);

  // 8. Topics (Lesson Plans with College-Level Pedagogical Architecture)
  const topicData = [
    // --------------------------------------------------------------------------
    // 8A. DSA in C++ (Mirai Track)
    // --------------------------------------------------------------------------
    { subId: 'sub-dsa', unit: 'Unit 1: Fundamentals & Complexity', name: 'Asymptotic Analysis & Big-O Notation', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-08',
      lo: 'CO1: Analyze time and space complexity of algorithms using asymptotic Big-O notations (KL: K3).',
      pre: 'Basic C++ programming and algebra', diag: 'Why does O(n log n) outperform O(n^2) on large inputs?',
      exp: 'Rigorous definition of Big-O, Big-Omega, Big-Theta, best/average/worst cases.',
      ex: 'Walkthrough recurrence relation T(n) = 2T(n/2) + O(n) via Master Theorem.',
      gp: 'Students determine asymptotic complexity of nested loop constructs in pairs.',
      ind: 'Analyze runtime of standard search operations on arrays vs sets.',
      method: 'Interactive lecture and code tracing', ref: 'CLRS Introduction to Algorithms, Ch 1-3' },

    { subId: 'sub-dsa', unit: 'Unit 1: Fundamentals & Complexity', name: 'Pointers, Dynamic Arrays & Vectors', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-18',
      lo: 'CO1: Implement dynamic memory allocation and vector resizings in C++ (KL: K3).',
      pre: 'Stack vs heap memory layout', diag: 'What causes memory leak and segmentation faults in C++?',
      exp: 'Pointers, references, raw heap allocation via new/delete, and amortized std::vector reallocation.',
      ex: 'Building a dynamic custom Vector class from scratch with capacity doubling.',
      gp: 'Live coding custom push_back and memory cleanup routines.',
      ind: 'Benchmark cache locality between dynamic arrays and raw pointer matrices.',
      method: 'Live coding and debugger demonstration' },

    { subId: 'sub-dsa', unit: 'Unit 2: Linear Structures', name: 'Singly, Doubly & Circular Linked Lists', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-28',
      lo: 'CO2: Construct and manipulate pointer-based linear structures (KL: K3).',
      pre: 'Pointer dereferencing and struct/class definitions', diag: 'When is a linked list preferred over a dynamic vector?',
      exp: 'Singly linked nodes, sentinel head/tail nodes, two-pointer techniques (Floyd cycle detection).',
      ex: 'Inverting a singly linked list iteratively and recursively in C++.',
      gp: 'Collaborative code review to detect pointer cycles and memory dangling.',
      ind: 'Build an LRU Cache skeleton using Doubly Linked List and Hash Map.',
      method: 'Visual blackboard pointer diagrams and IDE coding' },

    { subId: 'sub-dsa', unit: 'Unit 2: Linear Structures', name: 'Stacks, Queues & Monotonic Stacks', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-08',
      lo: 'CO2: Implement LIFO and FIFO abstractions and solve linear window problems (KL: K3).',
      pre: 'Arrays and linked list manipulation', diag: 'How does an operating system maintain the function execution call stack?',
      exp: 'LIFO stack semantics, circular queue buffer, and Next Greater Element monotonic stack pattern.',
      ex: 'Evaluation of postfix expressions and balanced parenthesis parsing.',
      gp: 'Trace sliding window maximum using monotonic deque.',
      ind: 'Implement browser history forward/backward mechanism.',
      method: 'Interactive problem-solving studio' },

    { subId: 'sub-dsa', unit: 'Unit 3: Trees & Traversals', name: 'Binary Trees, DFS & BFS Traversals', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-18',
      lo: 'CO3: Design recursive tree traversals and level-order queue traversals (KL: K3).',
      pre: 'Recursion and queue data structures', diag: 'What is the relationship between tree height and traversal call stack depth?',
      exp: 'Binary tree anatomy, Pre-order, In-order, Post-order DFS, and Breadth-First Level Order BFS.',
      ex: 'Serializing and deserializing a binary tree in C++.',
      gp: 'Trace tree traversal steps on paper and compare recursion traces.',
      ind: 'Calculate diameter of binary tree with O(N) complexity.',
      method: 'Lecture with VisuAlgo animations' },

    { subId: 'sub-dsa', unit: 'Unit 3: Trees & Traversals', name: 'Binary Search Trees (BST) & Operations', hours: 4, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 60, date: '2026-09-28',
      lo: 'CO3: Implement BST insertion, search, and node deletion algorithms (KL: K3).',
      pre: 'Binary tree structure and comparisons', diag: 'Why can an unbalanced BST degrade to O(N) performance?',
      exp: 'Binary search invariant, in-order predecessor/successor, and two-child deletion handling.',
      ex: 'Step-by-step deletion of a node with two children in C++.',
      gp: 'Students trace BST insertions for sorted input sequences.',
      ind: 'Write validator algorithm to test if a binary tree satisfies the BST property.',
      method: 'Board walkthrough and pair programming' },

    { subId: 'sub-dsa', unit: 'Unit 3: Trees & Traversals', name: 'AVL Trees & Self-Balancing Rotations', hours: 4, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-08',
      lo: 'CO3: Apply LL, RR, LR, and RL rotations to maintain tree balance (KL: K3).',
      pre: 'BST operations and balance factor definitions', diag: 'How does balance factor prevent tree degeneracy?',
      exp: 'Balance factor calculation, Left and Right rotations, rebalancing after insertion.',
      ex: 'Visualizing LR double rotation step by step.',
      gp: 'Hand trace tree rebalancing on paper.',
      ind: 'Implement height-augmented AVL node in C++.',
      method: 'Visual animation and algorithmic derivation' },

    { subId: 'sub-dsa', unit: 'Unit 4: Heaps & Graphs', name: 'Binary Heaps & Priority Queues', hours: 4, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-18',
      lo: 'CO4: Construct binary heaps and utilize priority queues (KL: K3).',
      pre: 'Array representations of complete trees', diag: 'Why is heap stored in a flat array rather than pointer nodes?',
      exp: 'Min-heap/Max-heap property, Heapify algorithm in O(N), push/pop in O(log N).',
      ex: 'Implementing Heapsort and priority queue task scheduler.',
      gp: 'Array index arithmetic for parent/child relationships.',
      ind: 'Find top K frequent elements using min-heap.',
      method: 'Code walkthrough and benchmark exercises' },

    { subId: 'sub-dsa', unit: 'Unit 4: Heaps & Graphs', name: 'Graph Representations, BFS & DFS', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-05',
      lo: 'CO4: Model network structures using adjacency lists and matrix graphs (KL: K3).',
      pre: 'Queues, recursion, and sets', diag: 'What prevents infinite loops during graph traversal?',
      exp: 'Adjacency list vs matrix, visited sets, connected components, topological sort (Kahn).',
      ex: 'Cycle detection in directed graphs using 3-color DFS.',
      gp: 'Trace BFS shortest paths in unweighted maze grid.',
      ind: 'Course schedule prerequisite validator.',
      method: 'Graph visualization interactive session' },

    { subId: 'sub-dsa', unit: 'Unit 4: Heaps & Graphs', name: 'Dijkstra & Shortest Path Algorithms', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-15',
      lo: 'CO4: Solve single-source shortest path problems (KL: K3).',
      pre: 'Priority queues and graph adjacency lists', diag: 'Why does Dijkstra algorithm fail on negative edge weights?',
      exp: 'Greedy shortest path relaxation, priority queue optimization O((V+E) log V).',
      ex: 'Trace Dijkstra algorithm on a 6-node weighted road network.',
      gp: 'Step-by-step distance table update in small groups.',
      ind: 'Implement road network navigation pathfinder in C++.',
      method: 'Case-study on Google Maps routing' },

    { subId: 'sub-dsa', unit: 'Unit 5: Dynamic Programming', name: 'Memoization, Tabulation & Knapsack', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-25',
      lo: 'CO5: Formulate dynamic programming state transitions (KL: K3).',
      pre: 'Recursion and DAG properties', diag: 'How does memoization transform exponential recursion to polynomial time?',
      exp: 'Overlapping subproblems, optimal substructure, top-down memoization vs bottom-up tabulation.',
      ex: '0/1 Knapsack problem derivation and space optimization.',
      gp: 'Formulate state equation for Coin Change problem.',
      ind: 'Solve 0/1 Knapsack with value-based space compression.',
      method: 'Interactive algorithmic dissection' },

    { subId: 'sub-dsa', unit: 'Unit 5: Dynamic Programming', name: 'Longest Common Subsequence & Grid DP', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-12-02',
      lo: 'CO5: Solve sequence alignment and 2D grid path problems (KL: K3).',
      pre: '2D matrices and state transitions', diag: 'How is string diff (git diff) related to sequence alignment?',
      exp: '2D DP tables, traceback reconstruction, minimum path sum on grid.',
      ex: 'Computing LCS matrix for DNA sequence comparison.',
      gp: 'Backtrack on DP table to construct the actual subsequence string.',
      ind: 'Edit Distance (Levenshtein Distance) algorithm implementation.',
      method: 'Bioinformatics and version control case study' },

    // --------------------------------------------------------------------------
    // 8B. Web Development (Mirai Track)
    // --------------------------------------------------------------------------
    { subId: 'sub-mirai-web', unit: 'Unit 1: Modern Frontend', name: 'Semantic HTML5, Accessibility & SEO', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-10',
      lo: 'Build accessible, semantic markup conforming to WCAG 2.1 standards.', pre: 'Basic web browsing concepts', diag: 'Why are divs bad for screen readers?', exp: 'Semantic HTML tags, ARIA roles, meta tags for OpenGraph and search engines.', ex: 'Audit a legacy page using Chrome Lighthouse.', gp: 'Refactor non-semantic div soup into accessible HTML5 landmarks.', ind: 'Build a compliant accessible landing page header and navigation.', method: 'Lighthouse audit live demo' },
    { subId: 'sub-mirai-web', unit: 'Unit 1: Modern Frontend', name: 'CSS Flexbox, Grid & Responsive Design', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-20',
      lo: 'Create mobile-first responsive layouts using CSS Flexbox and Grid.', pre: 'CSS box model', diag: 'Difference between justify-content and align-items?', exp: '1D flex layout, 2D grid template areas, media queries, mobile breakpoints.', ex: 'Building a responsive dashboard grid that adapts across mobile, tablet, and desktop.', gp: 'Flexbox Froggy and Grid Garden interactive drills.', ind: 'Build a fully responsive product card matrix.', method: 'Browser DevTools live layout inspect' },
    { subId: 'sub-mirai-web', unit: 'Unit 2: JavaScript Deep Dive', name: 'ES6+ Syntax, Closures & Event Loop', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-02',
      lo: 'Explain execution context, lexical scope, closures, and the event loop.', pre: 'Variables and functions in JS', diag: 'What is printed by setTimeout inside a var loop vs let loop?', exp: 'Call stack, microtask queue, task queue, closures, destructuring, modules.', ex: 'Trace asynchronous console output order with microtasks and macrotasks.', gp: 'Write a memoize function utilizing lexical closures.', ind: 'Implement an event emitter library from scratch.', method: 'Loupe visualizer interactive demonstration' },
    { subId: 'sub-mirai-web', unit: 'Unit 2: JavaScript Deep Dive', name: 'Promises, Async/Await & Fetch API', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-15',
      lo: 'Handle asynchronous network requests and error states.', pre: 'Callbacks and event loop', diag: 'Why is try/catch useless on synchronous code wrapping a raw callback?', exp: 'Promise lifecycle, async/await syntactic sugar, fetch options, abort controllers.', ex: 'Fetch API wrapper with retry logic and timeout interceptor.', gp: 'Handle loading, error, and success states for a REST API query.', ind: 'Build weather widget with live open-meteo API data.', method: 'Live network tab debugging in Chrome' },
    { subId: 'sub-mirai-web', unit: 'Unit 3: Component Architecture', name: 'React Foundations, JSX & Virtual DOM', hours: 5, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 50, date: '2026-09-28',
      lo: 'Create modular component hierarchies using React and JSX.', pre: 'Modern JavaScript modules', diag: 'Why does React require keys when rendering lists?', exp: 'Reconciliation algorithm, virtual DOM diffing, props vs state, pure components.', ex: 'Deconstruct a dashboard screen into reusable functional components.', gp: 'Build a filterable interactive data list in React.', ind: 'Build an interactive college department course directory.', method: 'React DevTools profiler walkthrough' },
    { subId: 'sub-mirai-web', unit: 'Unit 3: Component Architecture', name: 'Hooks: useState, useEffect & Custom Hooks', hours: 5, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-12',
      lo: 'Manage component lifecycle and extract reusable stateful logic.', pre: 'React component basics', diag: 'What happens when useEffect has no dependency array vs empty array?', exp: 'Hook rules, stale closures in useEffect, custom hook encapsulation.', ex: 'Writing a useDebounce and useLocalStorage custom hook.', gp: 'Refactor search input with debounced API triggering.', ind: 'Create a useMediaQuery hook for responsive render switching.', method: 'Live coding with hot reload' },
    { subId: 'sub-mirai-web', unit: 'Unit 4: Backend & APIs', name: 'Node.js, Express & RESTful Architecture', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-02',
      lo: 'Design and implement REST APIs with Express and middleware.', pre: 'HTTP protocol fundamentals', diag: 'Difference between PUT and PATCH in REST?', exp: 'HTTP verbs, status codes, route params, body parsing, error middleware.', ex: 'Building a CRUD API for course syllabus management with Express.', gp: 'Write request logging and authorization middleware.', ind: 'Implement pagination and filtering query handler.', method: 'Postman / Thunder Client API testing' },
    { subId: 'sub-mirai-web', unit: 'Unit 4: Backend & APIs', name: 'JWT Authentication & Security Best Practices', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-16',
      lo: 'Implement secure token-based authentication and sanitize user input.', pre: 'Cryptographic hashing concepts', diag: 'Why should passwords never be encrypted, but instead hashed with salt?', exp: 'JWT headers, payloads, signature verification, bcrypt hashing, CORS, XSS defense.', ex: 'Writing an auth middleware that verifies Bearer token on protected routes.', gp: 'Test OWASP injection attacks against an insecure endpoint and remediate.', ind: 'Add refresh token rotation to authentication flow.', method: 'Security audit demonstration' },
    { subId: 'sub-mirai-web', unit: 'Unit 5: Database & Deployment', name: 'Relational DBs with SQLite/Postgres', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-26',
      lo: 'Structure relational schemas, write queries, and handle database migrations.', pre: 'Tables and relational keys', diag: 'Why are Foreign Key constraints essential for referential integrity?', exp: 'Schema design, 1-to-many, many-to-many, indexes, ACID transactions.', ex: 'Connecting Express to SQLite with prepared statements to prevent SQLi.', gp: 'Design normalized schema for college exam attendance.', ind: 'Write SQL query joining 3 tables with grouping and aggregations.', method: 'Interactive DB client visualizer' },
    { subId: 'sub-mirai-web', unit: 'Unit 5: Database & Deployment', name: 'CI/CD Pipelines, Docker & Cloud Hosting', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-12-05',
      lo: 'Package applications into Docker containers and deploy to cloud platforms.', pre: 'Linux shell commands', diag: 'Why does containerization eliminate "it works on my machine"?', exp: 'Dockerfiles, multi-stage builds, environment variables, GitHub Actions.', ex: 'Writing a multi-stage Dockerfile for a Node.js web application.', gp: 'Set up GitHub Actions workflow to run automated test suites on push.', ind: 'Deploy containerized web service to production host.', method: 'Cloud deployment walkthrough' },

    // --------------------------------------------------------------------------
    // 8C. Product Development (Mirai Track - Single Record, Faculty: Vishal Rathee)
    // --------------------------------------------------------------------------
    { subId: 'sub-mirai-prod', unit: 'Unit 1: Product Strategy', name: 'Problem Identification & Design Thinking', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-12',
      lo: 'Identify high-value user problems using the five-stage design thinking model.', pre: 'Critical thinking and analytical reasoning', diag: 'Why do most startup products fail to achieve product-market fit?', exp: 'Empathize, Define, Ideate, Prototype, Test; problem vs solution space.', ex: 'Deconstruct why EdTech syllabus trackers fail without faculty mobile logging.', gp: 'Formulate user problem statements using Point of View (POV) frameworks.', ind: 'Draft a one-page Product Vision Document for campus automation.', method: 'Case study discussion and empathy mapping' },
    { subId: 'sub-mirai-prod', unit: 'Unit 1: Product Strategy', name: 'User Research, Personas & Customer Journeys', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-25',
      lo: 'Conduct contextual user interviews and build archetypal user personas.', pre: 'Interview techniques and ethics', diag: 'How do you avoid asking leading questions in discovery interviews?', exp: 'Qualitative user interviews, empathy maps, persona definition, friction points.', ex: 'Constructing personas for "Dr. Suresh (Admin)" and "Prof. Rajesh (Faculty)".', gp: 'Roleplay interview between faculty logger and product researcher.', ind: 'Map complete user journey from entering class to submitting 60s log.', method: 'Role-play workshop and journey mapping' },
    { subId: 'sub-mirai-prod', unit: 'Unit 2: Wireframing & Prototyping', name: 'Information Architecture & Wireframing', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-12',
      lo: 'Structure application navigation and produce low-fidelity wireframes.', pre: 'Visual hierarchy principles', diag: 'What is Miller Law (7±2) and how does it prevent navigation clutter?', exp: 'Card sorting, hierarchical site maps, mobile screen layout, button hierarchy.', ex: 'Low-fidelity paper prototyping of the mobile class-logging modal.', gp: 'Critique and simplify a cluttered multi-campus dashboard interface.', ind: 'Create low-fidelity wireframe set for student exam readiness portal.', method: 'Design studio and paper prototyping' },
    { subId: 'sub-mirai-prod', unit: 'Unit 2: Wireframing & Prototyping', name: 'Interactive Figma Prototypes & Usability Tests', hours: 4, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 50, date: '2026-09-29',
      lo: 'Create interactive Figma prototypes and conduct moderated usability tests.', pre: 'Figma basics and components', diag: 'How do component variants and auto-layout streamline design systems?', exp: 'Figma auto-layout, interactive component states, usability test metrics (time-on-task).', ex: 'Building an interactive 3-screen mobile flow with button click triggers.', gp: 'Run timed usability test measuring whether a user can complete a log in <60s.', ind: 'Refine UI based on user test feedback and error logs.', method: 'Figma hands-on laboratory' },
    { subId: 'sub-mirai-prod', unit: 'Unit 3: Agile Execution', name: 'PRD Documentation, User Stories & Epics', hours: 4, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-15',
      lo: 'Write comprehensive Product Requirement Documents and INVEST user stories.', pre: 'Agile manifesto principles', diag: 'What makes an acceptance criteria testable and unambiguous?', exp: 'Epics, user story syntax (As a... I want... So that...), Gherkin Given-When-Then.', ex: 'Writing the full PRD feature spec for Timetable Collision Prevention.', gp: 'Break down an Exam Scope feature into sprint-ready stories.', ind: 'Draft complete PRD for Student Read-Only Portal.', method: 'Agile backlog grooming workshop' },
    { subId: 'sub-mirai-prod', unit: 'Unit 4: Product Analytics', name: 'MVP Launch, Feedback Loops & Iteration', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-25',
      lo: 'Define product metrics, analyze user retention, and prioritize features.', pre: 'Basic statistics and web metrics', diag: 'Difference between vanity metrics and actionable engagement metrics?', exp: 'AARRR Pirate Funnel, DAU/MAU, CSAT, RICE feature scoring matrix.', ex: 'Calculating faculty log completion rate and missed-log alert response time.', gp: 'Prioritize product backlog features using RICE matrix scoring.', ind: 'Design product iteration plan based on synthetic usage analytics.', method: 'Analytics dashboard review' },

    // --------------------------------------------------------------------------
    // 8D. AKTU Track: AAS101E Quantum Physics and Applications (Pages 7-9)
    // --------------------------------------------------------------------------
    { subId: 'sub-aktu-physics', unit: 'Unit 1: Fundamentals of Quantum Mechanics', name: 'Inadequacy of classical mechanics & de-Broglie Matter Waves', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-15',
      lo: 'CO1: Understand the foundational concepts and principles of quantum mechanics (KL: K2).',
      pre: 'Wave optics, interference, and classical Newtonian mechanics',
      diag: 'Why does Rayleigh-Jeans classical radiation law fail in the ultraviolet region?',
      exp: 'Inadequacy of classical mechanics, black body radiation, de-Broglie concept of matter waves, Davisson and Germer experiment.',
      ex: 'Calculation of de-Broglie wavelength of an electron accelerated through 150 volts (λ = 1.0 Å).',
      gp: 'Students calculate wavelength of a 0.1 kg ball moving at 20 m/s and explain why wave nature is imperceptible macroscopically.',
      ind: 'Analyze Davisson-Germer diffraction peak data to verify de-Broglie hypothesis.',
      method: 'Interactive lecture and virtual diffraction simulation',
      ref: 'Engineering Physics: Theory and Practical - Katiyar & Pandey (Wiley), Ch 1' },

    { subId: 'sub-aktu-physics', unit: 'Unit 1: Fundamentals of Quantum Mechanics', name: 'Heisenberg Uncertainty & Schrodinger Wave Equations', hours: 4, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-25',
      lo: 'CO1: Apply Schrodinger wave equation to 1D quantum confinement problems (KL: K2).',
      pre: 'Partial differential equations and wave packet propagation',
      diag: 'Why cannot an electron reside inside the atomic nucleus according to uncertainty principle?',
      exp: 'Wave packet, phase velocity, group velocity, Heisenberg uncertainty principle, time-dependent and independent Schrodinger wave equations, particle in a 1D box, wave function and physical interpretation.',
      ex: 'Solving Schrodinger equation for particle in a box of width L to find quantized energy eigenvalues En = n^2 h^2 / (8 m L^2).',
      gp: 'Derive normalization constant for sinusoidal wave function in 1D infinite well.',
      ind: 'Calculate ground state energy of an electron confined in a 0.2 nm potential well.',
      method: 'Mathematical blackboard derivation and wave function visualization' },

    { subId: 'sub-aktu-physics', unit: 'Unit 2: Quantum Theory of Solids', name: 'Free Electron Theory & Energy Bands in Solids', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-05',
      lo: 'CO2: Understand the quantum mechanical principles governing electronic properties of solids (KL: K2).',
      pre: 'Classical Drude-Lorentz model of metals',
      diag: 'Why does Ohm law hold at room temperature but fail at cryogenic temperatures?',
      exp: 'Free electron theory, Fermi-Dirac distribution, energy bands in solids, band gap, conductors, semiconductors, and insulators.',
      ex: 'Plotting Fermi-Dirac distribution function f(E) versus energy at T = 0K and room temperature (300K).',
      gp: 'Determine probability of electron occupancy at Fermi level and 0.1 eV above EF.',
      ind: 'Distinguish direct and indirect band gap materials using E-k band diagrams.',
      method: 'Lecture with interactive Band Theory plotting tools' },

    { subId: 'sub-aktu-physics', unit: 'Unit 2: Quantum Theory of Solids', name: 'Semiconductor Physics & Fermi Level Dynamics', hours: 4, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 50, date: '2026-09-20',
      lo: 'CO2: Analyze carrier concentration and conductivity in semiconductors (KL: K2).',
      pre: 'Crystal structures and covalent bonding in silicon',
      diag: 'How does pentavalent phosphorus doping shift the Fermi level in silicon?',
      exp: 'Effective mass, density of states, intrinsic and extrinsic semiconductors, conductivity of semiconductors, Fermi level variation with temperature.',
      ex: 'Calculating intrinsic carrier concentration ni for Silicon at 300K with Eg = 1.12 eV.',
      gp: 'Compute electrical conductivity of n-type silicon with donor concentration Nd = 10^16 cm^-3.',
      ind: 'Derive temperature dependence of intrinsic semiconductor resistivity.',
      method: 'Problem-solving tutorial with semiconductor simulation models' },

    { subId: 'sub-aktu-physics', unit: 'Unit 3: Quantum Computing and Communication', name: 'Qubits, Quantum Superposition & Entanglement', hours: 5, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-10',
      lo: 'CO3: Comprehend fundamental principles of quantum computation and information systems (KL: K3).',
      pre: 'Linear algebra, complex numbers, and Dirac bra-ket notation',
      diag: 'How can a single qubit exist simultaneously in state |0> and |1>?',
      exp: 'Quantum computation, quantum states, quantum superposition, quantum entanglement, decoherence, quantum bits (qubits), physical realization of qubits (solid state, photonics).',
      ex: 'Mathematical construction of the four Bell states using Hadamard and CNOT transformations.',
      gp: 'Simulate qubit superposition on Bloch sphere using Qiskit.',
      ind: 'Analyze sources of environmental decoherence in superconducting transmon qubits.',
      method: 'Interactive Qiskit simulator tutorial and visual Bloch sphere' },

    { subId: 'sub-aktu-physics', unit: 'Unit 3: Quantum Computing and Communication', name: 'Quantum Gates & Cryptography (QKD)', hours: 4, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-22',
      lo: 'CO3: Apply quantum logic gates and analyze quantum key distribution protocols (KL: K3).',
      pre: 'Matrix multiplication and unitary operators',
      diag: 'What theorem guarantees that an eavesdropper cannot duplicate an unknown quantum state?',
      exp: 'Basics of quantum gates, single-qubit gates (X, Y, Z, H), multi-qubit gates (CNOT, SWAP), quantum cryptography, BB84 quantum key distribution (QKD).',
      ex: 'Tracing BB84 protocol: Alice basis selection, Bob measurement, sifting, and error-rate eavesdropping detection.',
      gp: 'Calculate output state when |1> passes through Hadamard gate.',
      ind: 'Evaluate security margins of fiber-optic QKD links against photon number splitting attacks.',
      method: 'Cryptographic case study and circuit simulation' },

    { subId: 'sub-aktu-physics', unit: 'Unit 4: Photonics', name: 'Optical Fiber Waveguides & Attenuation', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-08',
      lo: 'CO4: Comprehend the principles and applications of photonics and optical fibers (KL: K3).',
      pre: 'Snell law and total internal reflection',
      diag: 'Why is optical fiber immune to electromagnetic interference compared to copper coaxial cables?',
      exp: 'Fundamental idea about optical fiber, acceptance angle, acceptance cone, numerical aperture, principle of light propagation, attenuation and attenuation coefficient.',
      ex: 'Calculation of Numerical Aperture NA = sqrt(n1^2 - n2^2) and acceptance angle for step-index fiber.',
      gp: 'Calculate signal attenuation in dB for a 20 km fiber link with loss coefficient 0.25 dB/km.',
      ind: 'Compare single-mode versus multimode fiber bandwidth dispersion limits.',
      method: 'Laser bench demonstration and fiber coupling laboratory' },

    { subId: 'sub-aktu-physics', unit: 'Unit 4: Photonics', name: 'Laser Physics: Stimulated Emission & Gas Lasers', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-18',
      lo: 'CO4: Explain population inversion, Einstein coefficients, and laser cavity modes (KL: K3).',
      pre: 'Atomic energy levels and photon absorption',
      diag: 'Why is population inversion impossible in a two-level thermodynamic atomic system?',
      exp: 'Interaction of radiation with matter, absorption, spontaneous and stimulated emission, principle of laser operation, Einstein coefficients, Ruby laser, He-Ne laser, industrial and medical applications.',
      ex: 'Derivation of Einstein relation B12 = B21 and ratio of spontaneous to stimulated emission rate.',
      gp: 'Identify optical pump mechanism, active medium, and resonator mirrors in He-Ne laser diagram.',
      ind: 'Research semiconductor diode lasers used in modern telecommunications.',
      method: 'Laser optics demonstration in laboratory' },

    { subId: 'sub-aktu-physics', unit: 'Unit 5: Superconductors & Nano-materials', name: 'Superconductivity: Meissner Effect & Critical Fields', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-28',
      lo: 'CO5: Explore fundamental properties and phenomena of superconductivity (KL: K2).',
      pre: 'Electrical resistance and magnetic fields',
      diag: 'Why is a superconductor not merely a material with zero resistance, but also a perfect diamagnet?',
      exp: 'Temperature dependence of resistivity and critical field in superconducting materials, Meissner effect, Type I and Type II superconductors, persistent current, high-temperature superconductors, applications.',
      ex: 'Computing critical magnetic field Hc(T) = Hc(0) * [1 - (T/Tc)^2] for Mercury at 2K.',
      gp: 'Differentiate vortex state and magnetic penetration depth in Type I vs Type II superconductors.',
      ind: 'Case study on superconducting magnets in MRI machines and Maglev trains.',
      method: 'Cryogenic demonstration video and magnetic levitation analysis' },

    { subId: 'sub-aktu-physics', unit: 'Unit 5: Superconductors & Nano-materials', name: 'Nano-materials: Quantum Dots & Applications', hours: 4, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-12-06',
      lo: 'CO5: Relate quantum confinement to optical and electronic properties of nanomaterials (KL: K2).',
      pre: 'Particle in a 3D box model',
      diag: 'Why does gold nanoparticles appear red or purple rather than yellow?',
      exp: 'Introduction and properties of nano-materials, basic concept of quantum dots (0D), quantum wires (1D), and quantum wells (2D), applications of nano-materials.',
      ex: 'Calculating bandgap blueshift in CdSe quantum dots using Brus equation.',
      gp: 'Classify carbon nanotubes, graphene, and colloidal quantum dots by dimensionality.',
      ind: 'Investigate quantum dot displays (QLED) and nano-biosensors.',
      method: 'Interactive nanotechnology seminar and sample artifact review' },

    // --------------------------------------------------------------------------
    // 8E. AKTU Track: AAS103D Calculus and Linear Algebra (Pages 13-16)
    // --------------------------------------------------------------------------
    { subId: 'sub-aktu-math1', unit: 'Unit 1: Multivariable Calculus', name: 'Partial Derivatives & Euler Homogeneous Theorem', hours: 6, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-14',
      lo: 'CO1: Apply multivariable calculus and optimization techniques to solve engineering problems in AI (KL: K3).',
      pre: 'Single variable calculus and limits', diag: 'How does partial differentiation treat non-differentiated variables?',
      exp: 'Limits, continuity and differentiability of f(x, y), partial derivatives, Euler theorem for homogeneous functions.',
      ex: 'Verification of Euler theorem for z = (x^2 + y^2) / (x + y).', gp: 'Compute mixed second order partial derivatives.', ind: 'Gradient calculation for machine learning cost functions.', method: 'Mathematical lecture' },
    { subId: 'sub-aktu-math1', unit: 'Unit 1: Multivariable Calculus', name: 'Jacobians & Lagrange Multipliers Optimization', hours: 6, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-26',
      lo: 'CO1: Calculate Jacobians and solve constrained optimization problems (KL: K3).',
      pre: 'Determinants and gradients', diag: 'Why is the Jacobian determinant required when changing variables in coordinate systems?',
      exp: 'Jacobians, change of variables, Taylor expansion for two variables, maxima and minima, Lagrange method of multipliers.',
      ex: 'Finding rectangular box of maximum volume with given surface area using Lagrange multipliers.', gp: 'Calculate Jacobian of transformation from Cartesian to Polar coordinates.', ind: 'Formulate resource allocation problem as constrained optimization.', method: 'Optimization problem workshop' },
    { subId: 'sub-aktu-math1', unit: 'Unit 2: Multiple Integrals', name: 'Double & Triple Integrals: Area and Volume', hours: 6, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-08',
      lo: 'CO2: Apply multiple integrals to evaluate multidimensional data and volume (KL: K3).',
      pre: 'Definite integrals and integration techniques', diag: 'When must the order of integration be changed in double integrals?',
      exp: 'Evaluation of double and triple integrals, change of order of integration, change of variables in double integrals.',
      ex: 'Evaluate integral int_0^1 int_x^1 sin(y^2) dy dx by changing order of integration.', gp: 'Compute area bounded by parabolas y^2 = 4ax and x^2 = 4ay.', ind: 'Calculate centroid and volume of rotational solids.', method: 'Visual coordinate integration' },
    { subId: 'sub-aktu-math1', unit: 'Unit 2: Multiple Integrals', name: 'Beta and Gamma Functions & Dirichlet Integrals', hours: 6, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 40, date: '2026-09-22',
      lo: 'CO2: Utilize special functions in evaluating advanced integrals (KL: K3).',
      pre: 'Improper integrals and factorial algebra', diag: 'What is Gamma(1/2) and how is it related to Gaussian normal distribution?',
      exp: 'Beta and Gamma functions, relation between Beta and Gamma, Dirichlet integral and applications in probability.',
      ex: 'Proving Gamma(1/2) = sqrt(pi) and evaluating int_0^(pi/2) sin^p(theta) cos^q(theta) dtheta.', gp: 'Evaluate volume using Dirichlet triple integral theorem.', ind: 'Model continuous probability density using Gamma distribution.', method: 'Lecture and integral drills' },
    { subId: 'sub-aktu-math1', unit: 'Unit 3: Vector Calculus', name: 'Vector Fields, Gradient, Divergence & Curl', hours: 6, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-10',
      lo: 'CO3: Use vector calculus concepts in robotics, graphics, and simulations (KL: K3).',
      pre: 'Vector dot and cross products', diag: 'What physical condition makes a vector field solenoidal vs irrotational?',
      exp: 'Scalar point function, vector point function, gradient, directional derivatives, divergence, curl, physical interpretations.',
      ex: 'Finding directional derivative of phi(x,y,z) at (1,1,1) in the direction of vector 2i + j - 2k.', gp: 'Check if vector field F is conservative and find its scalar potential.', ind: 'Robotics path planning velocity field modeling.', method: '3D vector field plotting software' },
    { subId: 'sub-aktu-math1', unit: 'Unit 3: Vector Calculus', name: 'Green, Stokes & Gauss Divergence Theorems', hours: 6, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-10-24',
      lo: 'CO3: Evaluate line, surface, and volume integrals using integral theorems (KL: K3).',
      pre: 'Surface integration and unit normal vectors', diag: 'How does Gauss Divergence theorem convert closed surface integral into volume integral?',
      exp: 'Line integrals, work done, surface and volume integrals, Stokes theorem, Gauss divergence theorem.',
      ex: 'Verify Gauss Divergence theorem for vector field F = 4xi - 2y^2j + z^2k over a unit cube.', gp: 'Apply Green theorem to calculate area enclosed by an ellipse.', ind: 'Computer graphics lighting and flux computation.', method: 'Mathematical derivation and proof analysis' },
    { subId: 'sub-aktu-math1', unit: 'Unit 4: Matrices & Linear Systems', name: 'Matrix Rank, Echelon Form & Linear Systems', hours: 6, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-06',
      lo: 'CO4: Solve systems of linear equations using Gaussian elimination (KL: K3).',
      pre: 'Matrix operations and determinants', diag: 'Under what condition does a linear system Ax = b have infinitely many solutions?',
      exp: 'Complex matrices (Hermitian, Skew-Hermitian, Unitary), elementary transformations, rank by echelon form, Gauss Elimination, Gauss-Seidel.',
      ex: 'Solving a 3x3 linear electrical network system using Gauss-Seidel iteration.', gp: 'Reduce 4x4 matrix to row-reduced echelon form and determine rank.', ind: 'Implement Gaussian elimination solver with partial pivoting.', method: 'Algorithm board tracing' },
    { subId: 'sub-aktu-math1', unit: 'Unit 4: Matrices & Linear Systems', name: 'Eigenvalues, Eigenvectors & Diagonalization', hours: 6, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-18',
      lo: 'CO4: Apply eigenvalue techniques to PCA and stability interpretation (KL: K3).',
      pre: 'Characteristic equation and matrix inverse', diag: 'Why are eigenvalues of a symmetric real matrix always real numbers?',
      exp: 'Eigenvalues, eigenvectors, Cayley-Hamilton theorem, similarity transformation, diagonalization, PCA applications.',
      ex: 'Diagonalize matrix A = [[1, 2], [2, 1]] and compute A^10 using similarity matrix P.', gp: 'Compute eigenvalues of 3x3 covariance matrix for PCA dimensionality reduction.', ind: 'Face recognition eigenface projection formulation.', method: 'Machine learning data application' },
    { subId: 'sub-aktu-math1', unit: 'Unit 5: Vector Spaces', name: 'Vector Spaces, Subspaces & Linear Independence', hours: 6, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-28',
      lo: 'CO5: Understand vector spaces and apply them to data representation (KL: K3).',
      pre: 'Linear combinations and coordinate vectors', diag: 'How do you test whether a set of 3 vectors in R^3 spans the space?',
      exp: 'Definition of Field, vector spaces, subspaces, linear span, linear dependence and independence of vectors.',
      ex: 'Testing whether vectors v1=(1,2,1), v2=(2,1,0), v3=(1,-1,-1) are linearly independent in R^3.', gp: 'Find conditions for a subset W to form a valid subspace.', ind: 'Data compression subspace projection in signal analysis.', method: 'Abstract algebraic derivation' },
    { subId: 'sub-aktu-math1', unit: 'Unit 5: Vector Spaces', name: 'Basis, Dimension & Inner Product Spaces', hours: 6, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-12-08',
      lo: 'CO5: Calculate basis, dimension, and norms for signal processing (KL: K3).',
      pre: 'Matrix rank and linear independence', diag: 'Why does any basis of R^N contain exactly N vectors?',
      exp: 'Basis and dimension, coordinates, inner product space, vector norms, orthogonal basis, noise reduction.',
      ex: 'Construct an orthonormal basis using Gram-Schmidt orthogonalization process.', gp: 'Compute Euclidean L2 norm and Manhattan L1 norm for feature vectors.', ind: 'Audio noise reduction using orthogonal subspace decomposition.', method: 'Signal processing practical seminar' },

    // --------------------------------------------------------------------------
    // 8F. AKTU Track: AEE101A Fundamentals of Electrical Engineering (Pages 21-23)
    // --------------------------------------------------------------------------
    { subId: 'sub-aktu-electrical', unit: 'Unit 1: DC Circuits', name: 'Kirchhoff Laws & DC Network Theorems', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-16',
      lo: 'CO1: Apply Ohm law and Kirchhoff laws to analyse basic DC circuits (KL: K3).',
      pre: 'Basic physics of electric charge and voltage', diag: 'What is the physical conservation law behind KCL and KVL?',
      exp: 'Electric charge, current, voltage, EMF, resistance, Ohm law, resistors in series/parallel, KVL, KCL, mesh and nodal analysis, Thevenin theorem.',
      ex: 'Find current in 10-ohm load resistor using Thevenin equivalent circuit.', gp: 'Solve nodal equations for a 2-mesh DC circuit with independent voltage sources.', ind: 'Analyze power delivery in a multi-rail DC server power supply.', method: 'Circuit diagram board analysis' },
    { subId: 'sub-aktu-electrical', unit: 'Unit 2: AC Circuits', name: 'Single-Phase AC Waveforms & Power Factor', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-02',
      lo: 'CO2: Analyse single-phase AC circuits and explain power factor and its correction (KL: K3).',
      pre: 'Trigonometric sine functions and complex impedance', diag: 'Why does an inductive motor cause lagging power factor?',
      exp: 'Sinusoidal waveform, peak, RMS, average, form factor, phasor representation, series RL and RC circuits, impedance, active power (P), reactive power (Q), apparent power (S), power factor correction using capacitors.',
      ex: 'Calculate impedance, power factor, and active power for circuit with R=10 ohm and L=50 mH at 50 Hz.', gp: 'Compute required shunt capacitance to raise power factor from 0.7 to 0.95.', ind: 'Survey electricity bill penalty for low industrial power factor.', method: 'Phasor diagrams and oscilloscope waveforms' },
    { subId: 'sub-aktu-electrical', unit: 'Unit 3: Three-Phase Systems', name: 'Three-Phase Balanced Systems & Two-Wattmeter Method', hours: 4, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 40, date: '2026-09-24',
      lo: 'CO3: Analyse balanced three-phase circuits and measure three-phase power (KL: K3).',
      pre: 'Phasors and single-phase AC analysis', diag: 'Why is three-phase power transmission more economical than single-phase?',
      exp: 'Three-phase supply advantages, star (Y) and delta connections, phase and line voltages/currents, balanced three-phase power, two-wattmeter method, neutral wire concept.',
      ex: 'Calculate line current and total power of a 415V star-connected balanced inductive load.', gp: 'Interpret wattmeter readings W1 and W2 when load power factor is 0.5.', ind: 'Analyze neutral current in an unbalanced 4-wire commercial building system.', method: 'Laboratory bench demonstration' },
    { subId: 'sub-aktu-electrical', unit: 'Unit 4: Magnetic Circuits & Transformers', name: 'Faraday Law & Single-Phase Transformers', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-10-20',
      lo: 'CO4: Explain transformer working and calculate turns ratio, efficiency, and equivalent circuit (KL: K2).',
      pre: 'Magnetic flux and electromagnetic induction', diag: 'Why does a transformer core require laminated silicon steel sheets?',
      exp: 'Magnetic flux, MMF, reluctance, series magnetic circuit, Faraday law, mutual inductance, single-phase transformer principle, EMF equation, turns ratio, equivalent circuit, losses (core/copper), efficiency.',
      ex: 'Calculate primary and secondary turns for 230V/12V 50Hz transformer with maximum flux 0.02 Wb.', gp: 'Compute transformer efficiency at full load and half load at 0.8 power factor.', ind: 'Investigate high-frequency ferrite core transformers used in laptop chargers.', method: 'Hardware teardown and equivalent circuit modeling' },
    { subId: 'sub-aktu-electrical', unit: 'Unit 5: Electrical Machines & PV Systems', name: 'DC Motors, BLDC Motors & Solar PV Systems', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-20',
      lo: 'CO5: Explain operating principles of DC and AC motors, solar PV systems, and lab safety (KL: K2).',
      pre: 'Lorentz force and magnetic fields', diag: 'How does back EMF automatically regulate motor speed with mechanical load?',
      exp: 'DC motor principle, back EMF, torque, speed control, BLDC motors, 3-phase induction motor rotating magnetic field, slip, solar PV single diode model, I-V curves, electrical lab safety.',
      ex: 'Calculate rotor speed and slip for a 4-pole 50Hz induction motor running at 1440 RPM.', gp: 'Plot solar PV module I-V and P-V curves to identify Maximum Power Point (MPP).', ind: 'Compare BLDC motor versus brushed DC motor efficiency in drone propulsion.', method: 'Electric vehicle motor laboratory and solar PV test' },

    // --------------------------------------------------------------------------
    // 8G. AKTU Track: ACS101 Programming Languages (Pages 28-32)
    // --------------------------------------------------------------------------
    { subId: 'sub-aktu-programming', unit: 'Unit 1: Programming Basics (C)', name: 'C Syntax, Compilation & Data Types', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-12',
      lo: 'CO1: Write, compile, and run C programs using variables, operators, and I/O (KL: K3).',
      pre: 'Basic computer literacy', diag: 'What is the role of preprocessor, compiler, assembler, and linker in GCC?',
      exp: 'Structure of C program, compilation and execution, data types, variables, constants, operators (arithmetic, relational, logical), printf/scanf, type conversion.',
      ex: 'Write C program to compute real roots of quadratic equation ax^2 + bx + c = 0.', gp: 'Debug syntax and logical operator precedence bugs.', ind: 'Build CLI temperature converter and currency calculator.', method: 'Live terminal coding and GCC compilation' },
    { subId: 'sub-aktu-programming', unit: 'Unit 2: Control Flow & Functions (C)', name: 'Loops, Conditional Statements & Recursion', hours: 5, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-28',
      lo: 'CO2: Use control flow and functions in C to solve computational problems (KL: K3).',
      pre: 'C variables and operators', diag: 'Why does missing a loop termination condition lead to stack overflow in recursion?',
      exp: 'If/else, switch-case, for/while/do-while loops, break/continue, function definition, call by value, recursion (factorial, Fibonacci).',
      ex: 'Recursive function for GCD of two integers using Euclidean algorithm.', gp: 'Trace prime number generator loop with paper execution table.', ind: 'Build traffic signal countdown state machine in C.', method: 'Visual trace table and step-debugger' },
    { subId: 'sub-aktu-programming', unit: 'Unit 3: Advanced C Concepts', name: 'Arrays, Strings, Pointers & File I/O', hours: 5, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 70, date: '2026-09-18',
      lo: 'CO3: Work with arrays and strings in C and understand pointer memory concepts (KL: K2).',
      pre: 'C functions and variable scope', diag: 'What is the difference between an array identifier and a pointer variable in C?',
      exp: '1D arrays, traversal, min/max/sum, strings in C, gets/puts, strlen/strcpy/strcmp, pointer concept of memory address, structures, file handling.',
      ex: 'Program to reverse string in-place using two pointer indices.', gp: 'Store student records in a struct and write to a CSV file on disk.', ind: 'Linear search and bubble sort on integer array.', method: 'Memory visualizer and live coding' },
    { subId: 'sub-aktu-programming', unit: 'Unit 4: Python Introduction', name: 'Python Basics, Control Flow & Functions', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-10-25',
      lo: 'CO4: Write Python scripts using dynamic typing, control flow, and functions (KL: K3).',
      pre: 'Programming logic from C units', diag: 'How does Python dynamic typing differ from C static typing?',
      exp: 'Why Python, applications in AI/ML, variables, data types, print, input, operators, if/else, for loops, while loops, def functions, default arguments.',
      ex: 'Compare syntax of Fibonacci calculator in C vs Python side-by-side.', gp: 'Write Python functions with keyword and default arguments.', ind: 'Automate folder file renaming script in Python.', method: 'Google Colab / Jupyter notebook demo' },
    { subId: 'sub-aktu-programming', unit: 'Unit 5: Python Data Structures & Applications', name: 'Python Lists, Dictionaries, NumPy & Matplotlib', hours: 5, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-22',
      lo: 'CO5: Apply Python to read files, plot data with Matplotlib, and use NumPy (KL: K3).',
      pre: 'Python syntax and functions', diag: 'Why is NumPy array vectorized operation 50x faster than standard Python list loop?',
      exp: 'Python list, tuple, dictionary, set, file handling (read/write text and CSV), intro to NumPy arrays and mean, Matplotlib line plotting, IoT sensor data simulation.',
      ex: 'Read a CSV of temperature sensor logs, compute mean with NumPy, and plot line graph with Matplotlib.', gp: 'Count word frequencies in a text file using Python dictionary.', ind: 'Simulate and plot 24-hour IoT ambient humidity readings.', method: 'Hands-on data science notebook' },

    // --------------------------------------------------------------------------
    // 8H. AKTU Track: AAS104 Introduction to Indian Knowledge System (Pages 38-40)
    // --------------------------------------------------------------------------
    { subId: 'sub-aktu-iks', unit: 'Unit 1: Foundations of IKS', name: 'Scope, Vidyasthanas & Knowledge Validation', hours: 3, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-18',
      lo: 'CO1: Learn the nature, scope and classification of the Indian Knowledge System (KL: K1).',
      pre: 'General awareness of Indian cultural heritage', diag: 'What are the fourteen Chaturdasha Vidyasthanas in classical Indian taxonomy?',
      exp: 'Definition, scope, characteristics of IKS, vision of NEP 2020, 14 Vidyasthanas (4 Vedas, 4 Upavedas, 6 Vedangas), Orthodox and Heterodox philosophical schools, Pramanas (pratyaksha, anumana, shabda).',
      ex: 'Case study: relevance of IKS epistemology for a present-day engineer.', gp: 'Analyze Pramanas in scientific hypothesis testing.', ind: 'Write essay on NEP 2020 inclusion of traditional knowledge.', method: 'Interactive multimedia seminar' },
    { subId: 'sub-aktu-iks', unit: 'Unit 2: Indian Mathematics & Astronomy', name: 'Decimal Place-Value, Katapayadi & Pingala Binary', hours: 3, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-04',
      lo: 'CO2: Understand India contributions to mathematics and astronomy (KL: K2).',
      pre: 'Basic number theory and binary systems', diag: 'How did Pingala Chandahshastra anticipate binary combinatorics centuries before Leibniz?',
      exp: 'Decimal place-value system, zero, infinity, Bhutasankhya, Katapayadi numeration, Pingala binary representation, Sulbasutras, Aryabhata, Brahmagupta, Bhaskara, Kerala School of Mathematics.',
      ex: 'Encoding numbers using the Katapayadi scheme and reflecting on patterns in astronomical Panchang.', gp: 'Solve quadratic equation using Brahmagupta method.', ind: 'Trace Madhava infinite series for pi in the Kerala School.', method: 'Mathematical history interactive analysis' },
    { subId: 'sub-aktu-iks', unit: 'Unit 3: Engineering & Material Sciences', name: 'Metallurgy, Wootz Steel & Ancient Architecture', hours: 3, scope: 'MID_TERM,FINAL', status: 'PENDING', pct: 0, date: '2026-10-14',
      lo: 'CO3: Understand indigenous engineering, metallurgical and architectural achievements (KL: K2).',
      pre: 'Materials and civil structures basics', diag: 'Why does the Delhi Iron Pillar resist atmospheric corrosion for over 1600 years?',
      exp: 'Wootz steel, zinc distillation at Zawar, Delhi Iron Pillar corrosion-resistant protective film (misawite), Harappan town planning, stepwells, tanks, irrigation, temple structural engineering.',
      ex: 'Materials-science analysis of high-phosphorus passive film in the Delhi Iron Pillar.', gp: 'Evaluate water harvesting architecture of ancient Indian stepwells (Baolis). ind: Stupa structural stability analysis.', method: 'Engineering metallurgy case study' },
    { subId: 'sub-aktu-iks', unit: 'Unit 4: Health, Wellness & Governance', name: 'Ayurveda, Yoga, Ecology & Arthashastra', hours: 3, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-04',
      lo: 'CO4: Interpret Indian traditions of health, wellness, governance and ethics (KL: K2).',
      pre: 'Understanding of public administration and ecology', diag: 'How does Kautilya Arthashastra approach environmental conservation and resource auditing?',
      exp: 'Ayurveda principles, Tridosha, Patanjali Ashtanga Yoga, environment and ecological ethics in Indian thought, Kautilya Arthashastra governance, ethical leadership from Bhagavad Gita.',
      ex: 'Case study: Arthashastra management principles applied to modern organizational governance.', gp: 'Discuss ethical dilemmas using Bhagavad Gita Nishkama Karma frameworks.', ind: 'Examine preventive wellness routines in modern tech workplaces.', method: 'Socratic dialogue and ethics discussion' },
    { subId: 'sub-aktu-iks', unit: 'Unit 5: Contemporary Relevance & AI', name: 'Digital Preservation, Sanskrit NLP & Innovation', hours: 3, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-26',
      lo: 'CO5: Recognize contemporary relevance of IKS, including AI-enabled study and sustainability (KL: K2).',
      pre: 'Computational linguistics and AI awareness', diag: 'Why is Panini Ashtadhyayi considered the earliest formal generative grammar?',
      exp: 'Digital preservation (CSIR-TKDL, IKS Division), Sanskrit and computational linguistics, Panini grammar as formal state machine, NLP and LLMs for ancient texts, IKS-inspired sustainable engineering.',
      ex: 'Case study: Applying NLP tokenizers and transformer models to ancient Sanskrit corpus.', gp: 'Explore TKDL patent database protecting indigenous intellectual property.', ind: 'Draft proposal for an AI-driven Indian heritage application.', method: 'AI research seminar and live computational demo' },

    // --------------------------------------------------------------------------
    // 8I. AKTU Track: AAI101 Introduction to AI and Prompt Engineering (Pages 46-52)
    // --------------------------------------------------------------------------
    { subId: 'sub-aktu-prompt', unit: 'Unit 1: Introduction to AI', name: 'History, Types of AI & Learning Paradigms', hours: 3, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-08-16',
      lo: 'CO1: Explain what AI is, its types, and identify AI applications in everyday life (KL: K2).',
      pre: 'General awareness of digital technology', diag: 'What separates Narrow AI (ANI) from General AI (AGI)?',
      exp: 'Definition and scope of AI, Alan Turing to ChatGPT, Narrow vs General vs Super AI, AI vs ML vs DL, Supervised, Unsupervised, and Reinforcement Learning, data preprocessing.',
      ex: 'Class activity: List 5 everyday AI tools (Google Maps, Spotify, voice assistants) and trace their learning modality.', gp: 'Classify real-world problems as classification, regression, or clustering.', ind: 'One-page research note on real AI applications in computer science.', method: 'Interactive lecture and product breakdown' },
    { subId: 'sub-aktu-prompt', unit: 'Unit 2: Core AI Concepts', name: 'Machine Learning Algorithms & Computer Vision', hours: 3, scope: 'MID_TERM,FINAL', status: 'COMPLETED', pct: 100, date: '2026-09-06',
      lo: 'CO2: Describe key AI concepts — ML, Deep Learning, NLP, Computer Vision (KL: K2).',
      pre: 'Basic statistics and graphs', diag: 'How does a neuron compute weighted sum and pass through an activation function?',
      exp: 'Classification techniques (KNN, Naive Bayes), Clustering (K-Means), accuracy, precision, recall, F1, neural networks, CNNs in computer vision, NLP fundamentals.',
      ex: 'Live demo: Train a custom image classifier using Google Teachable Machine in 5 minutes without writing code.', gp: 'Calculate precision and recall from a confusion matrix for disease detection.', ind: 'Compare CNN image processing versus Transformer text processing.', method: 'Google Teachable Machine no-code demo' },
    { subId: 'sub-aktu-prompt', unit: 'Unit 3: Generative AI & LLMs', name: 'Large Language Models Architecture & Limitations', hours: 3, scope: 'MID_TERM,FINAL', status: 'IN_PROGRESS', pct: 60, date: '2026-09-26',
      lo: 'CO3: Apply working principles, capabilities, limitations, and responsible use of GenAI (KL: K3).',
      pre: 'Natural Language Processing basics', diag: 'What is hallucination in LLMs and why does it occur despite high fluency?',
      exp: 'What is Generative AI, Large Language Models (LLMs), training pipeline (pre-training, RLHF), tokens, context window, temperature, multimodal models, limitations, and academic integrity.',
      ex: 'Interact with LLM, alter temperature parameter from 0.1 to 1.2, and analyze response creativity versus factual accuracy.', gp: 'Detect and document an LLM hallucination in historical or scientific facts.', ind: 'Evaluate responsible AI disclosure policies in engineering.', method: 'Live model benchmarking and prompt experimentation' },
    { subId: 'sub-aktu-prompt', unit: 'Unit 4: AI Applications Across Domains', name: 'Engineering Applications & Ethics', hours: 3, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-10-28',
      lo: 'CO4: Apply AI concepts across engineering domains and societal implications (KL: K3).',
      pre: 'Domain knowledge in engineering', diag: 'How does AI assist software development in GitHub Copilot without replacing human engineers?',
      exp: 'AI in Civil (structural health), Mechanical (predictive maintenance), EE (smart grids), CSE (Copilot, cybersecurity), Healthcare, Agriculture, ethics, bias, and data privacy.',
      ex: 'Group case study: 2-minute presentation on AI defect detection in manufacturing vs software testing.', gp: 'Critique an algorithm demonstrating demographic bias in facial recognition.', ind: 'Write an ethical impact assessment for autonomous vehicle algorithms.', method: 'Domain-specific student presentations' },
    { subId: 'sub-aktu-prompt', unit: 'Unit 5: Prompt Engineering', name: 'Prompting Techniques, Few-Shot & Chain-of-Thought', hours: 3, scope: 'FINAL', status: 'PENDING', pct: 0, date: '2026-11-24',
      lo: 'CO5: Design and refine effective prompts using zero-shot, few-shot, and chain-of-thought (KL: K3).',
      pre: 'Generative AI interaction basics', diag: 'Why does Chain-of-Thought prompting drastically increase reasoning accuracy in LLMs?',
      exp: 'What is a prompt, principles of clarity/context/specificity/role assignment, techniques: Zero-shot, Few-shot, Chain-of-thought, Role prompting, domain-specific engineering prompts, tools (Copilot, Notion AI).',
      ex: 'Live prompt refinement: transforming vague "write code for binary search" into a production-grade prompt with boundary assertions and memory benchmarks.', gp: 'Write a few-shot prompt to parse unstructured laboratory sensor logs into JSON.', ind: 'Submit prompt portfolio solving 5 engineering challenges.', method: 'Live hands-on prompt laboratory' },
  ];

  const insertTopic = db.prepare(`
    INSERT INTO topics (
      id, subject_id, unit_name, topic_name, planned_hours, exam_scope_flag, approved_exam_scope,
      sequence, status, percentage_complete, planned_date, unit_weightage,
      learning_outcomes, prerequisite_knowledge, diagnostic_question, concept_explanation,
      worked_example, guided_practice, independent_application, teaching_method, readings_resources,
      equipment_safety_notes, formative_check, assignment_evidence, reflection_remediation,
      inclusive_options, faculty_notes, lesson_plan_status, version, source_document, page_reference
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  let topicSeq = 1;
  for (const t of topicData) {
    const topicId = `top-${t.subId}-${topicSeq++}`;
    insertTopic.run(
      topicId, t.subId, t.unit, t.name, t.hours, t.scope, t.scope,
      topicSeq, t.status, t.pct, t.date, 20.0,
      t.lo || `CO: Master key concepts in ${t.name}`,
      t.pre || 'Prerequisites reviewed in previous modules',
      t.diag || `Diagnostic check for ${t.name}`,
      t.exp || `Core conceptual exposition of ${t.name}`,
      t.ex || `Step-by-step worked demonstration for ${t.name}`,
      t.gp || `Guided in-class collaborative practice for ${t.name}`,
      t.ind || `Independent application homework for ${t.name}`,
      t.method || 'Interactive Lecture and Problem Solving',
      t.ref || 'Official course syllabus reference text',
      t.safety || 'Standard classroom/lab environment protocols',
      t.check || '2-minute exit question to check comprehension',
      t.evidence || 'Graded assignment / code submission',
      t.remed || 'Peer-assisted tutorial for struggling students',
      t.inclusive || 'Multi-modal explanation with visual diagrams and code walkthrough',
      t.facNotes || 'Pacing aligned with semester milestone',
      'DRAFT', 1,
      'CSE Stream AKTU UG BTech Course Structure Syllabus 2026–27',
      'Pages 2-55'
    );
  }
  console.log(`✔ Topics seeded: ${topicData.length} syllabus topics across subjects`);

  // 9. Timetables (Weekly classes with ZERO collisions)
  const timetables = [
    // Mirai Track Timetable (Room: Lab 101, Lab 102, Studio A)
    { id: 'tt-mon-1', batchId: 'batch-hitech-mirai', subjectId: 'sub-dsa', facultyId: 'usr-fac-sharma', day: 'Monday', start: '09:00', end: '10:30', room: 'Lab 101' },
    { id: 'tt-2', batchId: 'batch-hitech-mirai', subjectId: 'sub-mirai-web', facultyId: 'usr-fac-varun', day: 'Monday', start: '11:00', end: '12:30', room: 'Lab 102' },
    { id: 'tt-3', batchId: 'batch-hitech-mirai', subjectId: 'sub-mirai-prod', facultyId: 'usr-fac-sharma', day: 'Tuesday', start: '09:00', end: '10:30', room: 'Studio A' },
    { id: 'tt-4', batchId: 'batch-hitech-mirai', subjectId: 'sub-dsa', facultyId: 'usr-fac-sharma', day: 'Wednesday', start: '09:00', end: '10:30', room: 'Lab 101' },
    { id: 'tt-5', batchId: 'batch-hitech-mirai', subjectId: 'sub-mirai-web', facultyId: 'usr-fac-varun', day: 'Wednesday', start: '11:00', end: '12:30', room: 'Lab 102' },
    { id: 'tt-6', batchId: 'batch-hitech-mirai', subjectId: 'sub-mirai-prod', facultyId: 'usr-fac-sharma', day: 'Thursday', start: '09:00', end: '10:30', room: 'Studio A' },
    { id: 'tt-7', batchId: 'batch-hitech-mirai', subjectId: 'sub-dsa', facultyId: 'usr-fac-sharma', day: 'Friday', start: '09:00', end: '10:30', room: 'Lab 101' },
    { id: 'tt-8', batchId: 'batch-hitech-mirai', subjectId: 'sub-mirai-web', facultyId: 'usr-fac-varun', day: 'Friday', start: '11:00', end: '12:30', room: 'Lab 102' },
    { id: 'tt-9', batchId: 'batch-hitech-mirai', subjectId: 'sub-mirai-prod', facultyId: 'usr-fac-sharma', day: 'Saturday', start: '10:00', end: '12:00', room: 'Auditorium' },

    // AKTU Track Timetable (Room: Hall B, Physics Lab, EE Lab, Hall A, CAD Lab, CSE Lab)
    // Scheduled without any faculty, room, or batch collision
    { id: 'tt-10', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-programming', facultyId: 'usr-fac-sharma', day: 'Monday', start: '13:30', end: '15:00', room: 'CSE Lab' },
    { id: 'tt-11', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-math1', facultyId: 'usr-fac-gaurav', day: 'Tuesday', start: '11:00', end: '12:30', room: 'Hall B' },
    { id: 'tt-12', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-physics', facultyId: 'usr-fac-himanshu', day: 'Wednesday', start: '13:30', end: '15:00', room: 'Physics Lab' },
    { id: 'tt-13', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-electrical', facultyId: 'usr-fac-gupta', day: 'Thursday', start: '11:00', end: '12:30', room: 'EE Lab' },
    { id: 'tt-14', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-iks', facultyId: 'usr-fac-gaurav', day: 'Friday', start: '13:30', end: '15:00', room: 'Hall A' },
    { id: 'tt-15', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-prompt', facultyId: 'usr-fac-sharma', day: 'Tuesday', start: '13:30', end: '15:00', room: 'CSE Lab' },
    { id: 'tt-16', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-cad', facultyId: 'usr-fac-zakir', day: 'Friday', start: '10:00', end: '12:00', room: 'CAD Lab' },
    { id: 'tt-17', batchId: 'batch-hitech-aktu', subjectId: 'sub-aktu-langlab', facultyId: 'usr-fac-soniya', day: 'Thursday', start: '14:00', end: '15:30', room: 'Language Lab' },
  ];

  const insertTimetable = db.prepare(`
    INSERT INTO timetables (id, batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of timetables) {
    insertTimetable.run(t.id, t.batchId, t.subjectId, t.facultyId, t.day, t.start, t.end, t.room);
  }
  console.log(`✔ Timetables seeded: ${timetables.length} weekly recurring classes`);

  // 10. Sample Daily Logs
  const sampleLogs = [
    {
      id: 'log-1',
      date: '2026-10-14',
      ttId: 'tt-mon-1',
      facId: 'usr-fac-sharma',
      status: 'Completed',
      pct: 100,
      covered: 'Binary Trees, DFS & BFS Traversals',
      leftovers: 'None - complete implementation shown in C++',
      classwork: 'Completed',
      homework: 'Completed',
      carry: 'BST intro next class',
      notes: 'Active student participation in recursion trees.',
    },
    {
      id: 'log-2',
      date: '2026-10-15',
      ttId: 'tt-2',
      facId: 'usr-fac-gupta',
      status: 'In Progress',
      pct: 50,
      covered: 'React Foundations, JSX & Virtual DOM',
      leftovers: 'State management and props drilling',
      classwork: 'Completed',
      homework: 'Pending',
      carry: 'Props & state deep dive',
      notes: 'Need extra lab time for node environment setup.',
    },
    {
      id: 'log-3',
      date: '2026-10-16',
      ttId: 'tt-3',
      facId: 'usr-fac-sharma',
      status: 'Completed',
      pct: 100,
      covered: 'Information Architecture & Wireframing',
      leftovers: 'None - wireframes completed',
      classwork: 'Completed',
      homework: 'Completed',
      carry: 'Figma hands-on',
      notes: 'Pace is healthy and comfortably on track.',
    },
  ];

  const insertLog = db.prepare(`
    INSERT INTO daily_logs (id, session_date, timetable_id, faculty_id, status, percentage_complete, topics_covered, leftovers, notes, created_at, classwork_status, homework_status, carry_forward_topic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)
  `);
  for (const l of sampleLogs) {
    insertLog.run(l.id, l.date, l.ttId, l.facId, l.status, l.pct, l.covered, l.leftovers, l.notes, l.classwork, l.homework, l.carry);
  }

  // 11. Alerts (Faculty reminders & Campus Manager notifications)
  const sampleAlerts = [
    {
      id: 'alt-1',
      subjectId: 'sub-mirai-prod',
      userId: 'usr-mgr-hitech',
      type: 'CAMPUS_MANAGER_ESCALATION',
      title: 'Product Development pacing is ON TRACK',
      message: 'Product Development buffer ratio is in good standing (>1.15). On schedule for exam completion.',
      status: 'RESOLVED',
      date: '2026-10-18',
      channel: 'IN_APP',
      isEsc: 0,
    },
    {
      id: 'alt-2',
      subjectId: 'sub-dsa',
      userId: 'usr-fac-sharma',
      type: 'FACULTY_REMINDER',
      title: 'Pending class log for DSA in C++',
      message: 'Please submit your class progression log for the session scheduled on Friday.',
      status: 'PENDING',
      date: '2026-10-19',
      channel: 'EMAIL+IN_APP',
      isEsc: 0,
    },
    {
      id: 'alt-3',
      subjectId: 'sub-aktu-physics',
      userId: 'usr-mgr-hitech',
      type: 'CAMPUS_MANAGER_ESCALATION',
      title: '⚠️ 48-Hour Escalation: Unlogged Physics Session',
      message: 'Escalation: Faculty member Himanshu Sharma Kumar has not submitted the session log for Quantum Physics for over 48 hours.',
      status: 'PENDING',
      date: '2026-10-19',
      channel: 'IN_APP+EMAIL',
      isEsc: 1,
    },
  ];

  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, subject_id, recipient_user_id, type, title, message, status, scheduled_date, created_at, delivery_channel, is_escalated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
  `);
  for (const a of sampleAlerts) {
    insertAlert.run(a.id, a.subjectId, a.userId, a.type, a.title, a.message, a.status, a.date, a.channel, a.isEsc);
  }

  console.log('✔ Daily logs, audit history, and missed-session alerts seeded.');

  // 12. Stretch Features: Visiting Faculty Policy & Honorarium Report
  db.prepare(`
    INSERT INTO visiting_faculty_policies (
      id, campus_id, rate_per_lecture_hour, lab_multiplier, max_hours_per_month,
      conveyance_allowance, currency, effective_from, configured_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    'pol-camp-hitech',
    'camp-hitech',
    2500.0,
    1.0,
    40.0,
    1000.0,
    'INR',
    '2026-08-01',
    'Dr. Suresh Varma'
  );

  db.prepare(`
    INSERT INTO honorarium_reports (
      id, campus_id, month_year, faculty_id,
      planned_sessions_count, planned_hours,
      delivered_sessions_count, delivered_hours,
      rate_applied, total_amount, source_log_ids_json,
      status, approved_by, approved_at, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    'hon-hitech-zakir-2026-10',
    'camp-hitech',
    '2026-10',
    'usr-fac-zakir',
    12,
    18.0,
    8,
    12.0,
    2500.0,
    31000.0, // 12 hrs * 2500 + 1000 conveyance = 31000
    JSON.stringify(['log-demo-zakir-1', 'log-demo-zakir-2']),
    'SUBMITTED',
    null,
    null,
    'Submitted for October 2026 academic review. 100% syllabus alignment on Python & Prompt Engineering modules.'
  );

  // 13. Stretch Features: Proposed AI Draft Session Log (Ready for one-click confirmation)
  const sampleDraftPayload = {
    campusId: 'camp-hitech',
    campusName: 'HI-Tech',
    trackId: 'track-aktu',
    trackName: 'AKTU Track',
    batchId: 'batch-hitech-aktu',
    batchName: 'HI-Tech · CSE (AI/ML) · AKTU Track Batch',
    subjectId: 'sub-aktu-intro-prompt',
    subjectCode: 'AAI101',
    subjectName: 'Introduction to AI and Prompt Engineering',
    facultyId: 'usr-fac-zakir',
    facultyName: 'Zakir Husain Husain',
    timetableId: 'tt-prompt-eng',
    sessionDate: '2026-10-20',
    status: 'Completed',
    percentageComplete: 100,
    topicsCovered: 'Unit 2: In-Context Learning and Few-Shot Prompt Templates',
    leftovers: 'Advanced Chain-of-Thought reasoning exercises carried forward',
    carryForwardTopic: 'Advanced Chain-of-Thought reasoning exercises carried forward',
    classworkStatus: 'Completed',
    homeworkStatus: 'Given',
    notes: '[Parsed from WHATSAPP] Completed Unit 2 Few-Shot Prompt Templates with live exercises. Assigned 3 prompts as homework.',
  };

  db.prepare(`
    INSERT INTO ai_draft_logs (
      id, provider, sender_phone_or_id, faculty_id, raw_message_text,
      parsed_payload_json, confidence_score, needs_clarification,
      clarification_prompt, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 'PROPOSED', datetime('now'))
  `).run(
    'draft-whatsapp-zakir-01',
    'whatsapp',
    '9876543219',
    'usr-fac-zakir',
    'Hey Mirai Bot, just finished Prompt Eng lecture for AKTU batch today. Covered Unit 2 Few-Shot prompting 100%. Gave lab classwork and assigned few-shot homework. Leftover chain of thought for next session.',
    JSON.stringify(sampleDraftPayload),
    0.92
  );

  // 14. Stretch Features: Seed Calendar Sync Account
  db.prepare(`
    INSERT INTO calendar_sync_accounts (
      id, user_id, provider, scopes, external_account_id, calendar_id,
      sync_exam_dates, sync_extra_classes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONNECTED', datetime('now'), datetime('now'))
  `).run(
    'sync-acc-zakir',
    'usr-fac-zakir',
    'google',
    'https://www.googleapis.com/auth/calendar.events',
    'faculty.zakir@mirai.edu',
    'primary',
    1,
    1
  );

  db.prepare(`
    INSERT INTO calendar_synced_events (
      id, sync_account_id, event_type, source_id, external_event_id,
      event_summary, start_time, end_time, last_pushed_hash, external_etag,
      conflict_status, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_SYNC', datetime('now'))
  `).run(
    'sync-ev-midterm-hitech',
    'sync-acc-zakir',
    'EXAM',
    'exam-ex-hitech-midterm',
    'ext-google-exam-midterm-hitech',
    'MSOT Exam: Mid-Term Examination (Sem 1)',
    '2026-10-27T09:00:00Z',
    '2026-11-03T17:00:00Z',
    'hash-midterm-2026',
    'etag-demo-01'
  );

  console.log('✔ Visiting faculty honorarium, AI session draft logs, and calendar sync accounts seeded.');
  console.log('🎉 Database seeding complete! Ready for local development and testing.');
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  seedDatabase();
}
