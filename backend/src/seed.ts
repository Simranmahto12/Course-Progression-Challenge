import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';

export function seedDatabase() {
  console.log('🌱 Initializing SQLite Database and Seeding Sample Data for MSOT Course Progression Platform...');

  initDatabase();

  // Clean existing data for clean re-seed
  db.exec(`
    DELETE FROM daily_logs;
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

  // 1. Campuses
  const campuses = [
    { id: 'camp-hitech', name: 'HI-Tech' },
    { id: 'camp-ratnam', name: 'Ratnam' },
    { id: 'camp-rgib', name: 'RGIB' },
    { id: 'camp-juj', name: 'JUJ' },
  ];

  const insertCampus = db.prepare(`INSERT INTO campuses (id, name) VALUES (?, ?)`);
  for (const c of campuses) {
    insertCampus.run(c.id, c.name);
  }
  console.log('✔ Campuses seeded (HI-Tech, Ratnam, RGIB, JUJ)');

  // 2. Tracks
  const tracks = [
    { id: 'track-mirai', name: 'Mirai Track', description: 'Industry-integrated AI/ML hands-on curriculum' },
    { id: 'track-univ', name: 'University Track', description: 'Core academic syllabus' },
  ];

  const insertTrack = db.prepare(`INSERT INTO tracks (id, name, description) VALUES (?, ?, ?)`);
  for (const t of tracks) {
    insertTrack.run(t.id, t.name, t.description);
  }
  console.log('✔ Tracks seeded (Mirai Track, University Track)');

  // 3. Batches
  const batches = [
    { id: 'batch-hitech-mirai', campus_id: 'camp-hitech', track_id: 'track-mirai', name: 'HI-Tech AI/ML 2026 Batch A' },
    { id: 'batch-ratnam-mirai', campus_id: 'camp-ratnam', track_id: 'track-mirai', name: 'Ratnam AI/ML 2026 Batch A' },
    { id: 'batch-rgib-mirai', campus_id: 'camp-rgib', track_id: 'track-mirai', name: 'RGIB AI/ML 2026 Batch A' },
    { id: 'batch-juj-mirai', campus_id: 'camp-juj', track_id: 'track-mirai', name: 'JUJ AI/ML 2026 Batch A' },
  ];

  const insertBatch = db.prepare(`INSERT INTO batches (id, campus_id, track_id, name) VALUES (?, ?, ?, ?)`);
  for (const b of batches) {
    insertBatch.run(b.id, b.campus_id, b.track_id, b.name);
  }

  // 4. Users (All password: 'mirai123')
  const passwordHash = bcrypt.hashSync('mirai123', 10);
  const users = [
    {
      id: 'usr-admin',
      email: 'admin@mirai.edu',
      name: 'Dr. Suresh Varma',
      role: 'admin',
      campus_id: 'camp-hitech',
      batch_id: null,
    },
    {
      id: 'usr-mgr-hitech',
      email: 'manager.hitech@mirai.edu',
      name: 'Priya Nair',
      role: 'campus_manager',
      campus_id: 'camp-hitech',
      batch_id: null,
    },
    {
      id: 'usr-fac-sharma',
      email: 'faculty.sharma@mirai.edu',
      name: 'Prof. Rajesh Sharma',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
    },
    {
      id: 'usr-fac-gupta',
      email: 'faculty.gupta@mirai.edu',
      name: 'Dr. Ananya Gupta',
      role: 'faculty',
      campus_id: 'camp-hitech',
      batch_id: null,
    },
    {
      id: 'usr-stu-aarav',
      email: 'student.aarav@mirai.edu',
      name: 'Aarav Mehta',
      role: 'student',
      campus_id: 'camp-hitech',
      batch_id: 'batch-hitech-mirai',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, campus_id, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.email, passwordHash, u.name, u.role, u.campus_id, u.batch_id);
  }
  console.log('✔ Demo Users seeded (Admin, Campus Manager, Faculty, Student - Password: mirai123)');

  // 5. Semesters for each Campus
  const holidays = [
    { date: '2026-08-15', title: 'Independence Day' },
    { date: '2026-10-02', title: 'Gandhi Jayanti' },
    { date: '2026-10-20', title: 'Dussehra Break' },
    { date: '2026-11-09', title: 'Diwali Break' },
  ];
  const holidaysJson = JSON.stringify(holidays);

  const insertSemester = db.prepare(`
    INSERT INTO semesters (id, campus_id, start_date, end_date, working_saturdays_rule, holidays_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const c of campuses) {
    const semId = `sem-${c.id}`;
    insertSemester.run(semId, c.id, '2026-08-01', '2026-12-20', 'SECOND_FOURTH_SATURDAY', holidaysJson);

    // 6. Exams for each semester
    db.prepare(`
      INSERT INTO exams (id, semester_id, name, display_name, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`exam-mid-${c.id}`, semId, 'MID_TERM', 'Mid-Semester Examinations', '2026-10-27', '2026-11-03');

    db.prepare(`
      INSERT INTO exams (id, semester_id, name, display_name, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`exam-final-${c.id}`, semId, 'FINAL', 'End-Semester Final Examinations', '2026-12-10', '2026-12-20');
  }
  console.log('✔ Semesters, Saturday Rules, Holidays, and Exam Windows seeded');

  // 7. Subjects (HI-Tech Batch)
  const subjects = [
    {
      id: 'sub-dsa',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'CS301',
      name: 'Data Structures & Algorithms',
      target_finish_date: '2026-12-05',
      color: '#7b70e1',
    },
    {
      id: 'sub-dbms',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-gupta',
      code: 'CS302',
      name: 'Database Systems',
      target_finish_date: '2026-11-28', // Earlier target + fewer sessions = DANGER (demonstrates worst-subject bottleneck)
      color: '#e7a956',
    },
    {
      id: 'sub-cn',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'CS303',
      name: 'Computer Networks',
      target_finish_date: '2026-12-05',
      color: '#68a0df',
    },
    {
      id: 'sub-ml',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'AI301',
      name: 'Machine Learning',
      target_finish_date: '2026-12-05',
      color: '#68bd96',
    },
    {
      id: 'sub-os',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-gupta',
      code: 'CS304',
      name: 'Operating Systems',
      target_finish_date: '2026-12-05',
      color: '#e98783',
    },
    {
      id: 'sub-ai',
      batch_id: 'batch-hitech-mirai',
      faculty_id: 'usr-fac-sharma',
      code: 'AI302',
      name: 'Artificial Intelligence',
      target_finish_date: '2026-12-05',
      color: '#7daab0',
    },
  ];

  const insertSubject = db.prepare(`
    INSERT INTO subjects (id, batch_id, faculty_id, code, name, target_finish_date, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of subjects) {
    insertSubject.run(s.id, s.batch_id, s.faculty_id, s.code, s.name, s.target_finish_date, s.color);
  }
  console.log('✔ Subjects seeded with color coding and target finish dates');

  // 8. Topics for each subject
  const topicTemplates: Record<string, string[]> = {
    'sub-dsa': [
      'Asymptotic Notation & Time Complexity',
      'Arrays & Dynamic Memory Allocation',
      'Singly & Doubly Linked Lists',
      'Stacks, Queues & Circular Queues',
      'Binary Trees & Traversals',
      'Binary Search Trees (BST)',
      'AVL Trees & Rotations',
      'Heaps & Priority Queues',
      'Graph Representations & BFS/DFS',
      'Dijkstra Shortest Path Algorithm',
      'Minimum Spanning Trees (Kruskal/Prim)',
      'Dynamic Programming: Memoization',
      'Knapsack & Longest Common Subsequence',
      'B-Trees and Advanced Indexing',
    ],
    'sub-dbms': [
      'Relational Model & Relational Algebra',
      'Entity-Relationship (ER) Modeling',
      'Advanced SQL & Nested Queries',
      'Functional Dependencies & 1NF/2NF',
      '3NF and Boyce-Codd Normal Form (BCNF)',
      'Transaction Properties & ACID Rules',
      'Serializability & Concurrency Control',
      'Locking Protocols & Two-Phase Locking',
      'Deadlock Detection & Prevention',
      'B+ Tree Indexing in Relational Engines',
      'Query Execution & Cost Optimization',
      'Crash Recovery & Write-Ahead Logging (WAL)',
    ],
    'sub-cn': [
      'OSI vs TCP/IP Protocol Layers',
      'Physical Layer & Transmission Media',
      'Data Link Framing & Flow Control',
      'Error Detection: Parity & CRC',
      'Ethernet & MAC Sublayer',
      'IPv4 Addressing & Subnetting',
      'Routing Algorithms: Distance Vector & Link State',
      'OSPF & BGP Routing Protocols',
      'TCP 3-Way Handshake & Flow Control',
      'Congestion Control Algorithms',
      'DNS & HTTP/HTTPS Protocols',
      'Network Security: TLS & Firewalls',
    ],
    'sub-ml': [
      'Introduction to Machine Learning Paradigms',
      'Linear Regression & Gradient Descent',
      'Logistic Regression & Decision Boundaries',
      'Overfitting, Regularization (L1/L2)',
      'Support Vector Machines (SVM)',
      'Decision Trees & Information Gain',
      'Random Forests & Ensemble Bagging',
      'Gradient Boosting (XGBoost/LightGBM)',
      'K-Means Clustering & Hierarchical Clustering',
      'Principal Component Analysis (PCA)',
      'Neural Networks: Perceptrons & Backpropagation',
      'Evaluation Metrics: Precision, Recall, ROC-AUC',
    ],
    'sub-os': [
      'Operating System Architectures & System Calls',
      'Processes, Threads & Concurrency',
      'CPU Scheduling Algorithms',
      'Process Synchronization: Semaphores & Mutexes',
      'Classical Synchronization Problems',
      'Deadlocks: Avoidance with Banker Algorithm',
      'Memory Management: Paging & Segmentation',
      'Virtual Memory & Page Replacement',
      'File System Implementation & Inodes',
      'I/O Systems & Disk Scheduling',
    ],
    'sub-ai': [
      'Foundations of Artificial Intelligence',
      'State Space Search & Uninformed Search',
      'Informed Search: A* Algorithm & Heuristics',
      'Adversarial Search: Minimax & Alpha-Beta',
      'Constraint Satisfaction Problems (CSP)',
      'Knowledge Representation & First-Order Logic',
      'Probabilistic Reasoning & Bayesian Networks',
      'Markov Decision Processes (MDP)',
      'Reinforcement Learning: Q-Learning',
      'Introduction to Generative AI & Transformers',
    ],
  };

  const insertTopic = db.prepare(`
    INSERT INTO topics (id, subject_id, unit_name, topic_name, planned_hours, exam_scope_flag, sequence, status, percentage_complete, planned_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [subId, topicList] of Object.entries(topicTemplates)) {
    topicList.forEach((name, idx) => {
      const seq = idx + 1;
      const id = `top-${subId}-${seq}`;
      const unit = `Unit ${Math.ceil(seq / 3)}`;
      const plannedHours = 2.0;
      const examScope = seq <= 6 ? 'MID_TERM,FINAL' : 'FINAL';

      // Set initial status to demonstrate realistic progress:
      // DSA: 10 topics completed (~71% progress)
      // DBMS: 4 topics completed (~33% progress) -> Creates the DANGER state
      // ML: 6 topics completed (~50% progress) -> Creates TIGHT state
      let status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' = 'PENDING';
      let pct = 0;

      if (subId === 'sub-dsa') {
        if (seq <= 10) { status = 'COMPLETED'; pct = 100; }
        else if (seq === 11) { status = 'IN_PROGRESS'; pct = 50; }
      } else if (subId === 'sub-dbms') {
        if (seq <= 4) { status = 'COMPLETED'; pct = 100; }
        else if (seq === 5) { status = 'IN_PROGRESS'; pct = 25; }
      } else if (subId === 'sub-ml') {
        if (seq <= 6) { status = 'COMPLETED'; pct = 100; }
        else if (seq === 7) { status = 'IN_PROGRESS'; pct = 50; }
      } else if (subId === 'sub-cn') {
        if (seq <= 8) { status = 'COMPLETED'; pct = 100; }
      } else if (subId === 'sub-os') {
        if (seq <= 7) { status = 'COMPLETED'; pct = 100; }
      } else if (subId === 'sub-ai') {
        if (seq <= 7) { status = 'COMPLETED'; pct = 100; }
      }

      insertTopic.run(id, subId, unit, name, plannedHours, examScope, seq, status, pct, '2026-10-15');
    });
  }
  console.log('✔ Topics seeded across all units with planned hours and exam scope flags');

  // 9. Timetable Slots
  const timetableSlots = [
    // Monday
    { id: 'tt-mon-1', day: 'Monday', start: '09:00', end: '10:30', subId: 'sub-dsa', facId: 'usr-fac-sharma', room: 'Room 204' },
    { id: 'tt-mon-2', day: 'Monday', start: '11:00', end: '12:30', subId: 'sub-cn', facId: 'usr-fac-sharma', room: 'Room 108' },
    { id: 'tt-mon-3', day: 'Monday', start: '14:00', end: '15:30', subId: 'sub-ml', facId: 'usr-fac-sharma', room: 'Lab 03' },
    // Tuesday
    { id: 'tt-tue-1', day: 'Tuesday', start: '09:00', end: '10:30', subId: 'sub-dbms', facId: 'usr-fac-gupta', room: 'Room 105' },
    { id: 'tt-tue-2', day: 'Tuesday', start: '11:00', end: '12:30', subId: 'sub-os', facId: 'usr-fac-gupta', room: 'Room 204' },
    { id: 'tt-tue-3', day: 'Tuesday', start: '14:00', end: '15:30', subId: 'sub-ai', facId: 'usr-fac-sharma', room: 'Room 108' },
    // Wednesday
    { id: 'tt-wed-1', day: 'Wednesday', start: '09:00', end: '10:30', subId: 'sub-dsa', facId: 'usr-fac-sharma', room: 'Room 204' },
    { id: 'tt-wed-2', day: 'Wednesday', start: '11:00', end: '12:30', subId: 'sub-cn', facId: 'usr-fac-sharma', room: 'Room 108' },
    { id: 'tt-wed-3', day: 'Wednesday', start: '14:00', end: '15:30', subId: 'sub-ml', facId: 'usr-fac-sharma', room: 'Lab 03' },
    // Thursday
    { id: 'tt-thu-1', day: 'Thursday', start: '09:00', end: '10:30', subId: 'sub-dbms', facId: 'usr-fac-gupta', room: 'Room 105' },
    { id: 'tt-thu-2', day: 'Thursday', start: '11:00', end: '12:30', subId: 'sub-os', facId: 'usr-fac-gupta', room: 'Room 204' },
    { id: 'tt-thu-3', day: 'Thursday', start: '14:00', end: '15:30', subId: 'sub-ai', facId: 'usr-fac-sharma', room: 'Room 108' },
    // Friday
    { id: 'tt-fri-1', day: 'Friday', start: '09:00', end: '10:30', subId: 'sub-dsa', facId: 'usr-fac-sharma', room: 'Room 204' },
    { id: 'tt-fri-2', day: 'Friday', start: '11:00', end: '12:30', subId: 'sub-dbms', facId: 'usr-fac-gupta', room: 'Room 105' },
    { id: 'tt-fri-3', day: 'Friday', start: '14:00', end: '15:30', subId: 'sub-ml', facId: 'usr-fac-sharma', room: 'Lab 03' },
    // Working Saturday
    { id: 'tt-sat-1', day: 'Saturday', start: '10:00', end: '12:00', subId: 'sub-ai', facId: 'usr-fac-sharma', room: 'Auditorium' },
  ];

  const insertTimetable = db.prepare(`
    INSERT INTO timetables (id, batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const slot of timetableSlots) {
    insertTimetable.run(
      slot.id,
      'batch-hitech-mirai',
      slot.subId,
      slot.facId,
      slot.day,
      slot.start,
      slot.end,
      slot.room
    );
  }
  console.log('✔ Weekly Timetables seeded across Monday through Saturday');

  // 10. Sample Daily Logs
  const todayStr = new Date().toISOString().split('T')[0];
  const insertLog = db.prepare(`
    INSERT INTO daily_logs (id, session_date, timetable_id, faculty_id, status, percentage_complete, topics_covered, leftovers, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run(
    'log-sample-1',
    todayStr,
    'tt-mon-1',
    'usr-fac-sharma',
    'Completed',
    100,
    'Minimum Spanning Trees (Kruskal/Prim)',
    'None',
    'Class was engaged. Good participation on Kruskal algorithm complexity.',
    new Date().toISOString()
  );

  // 11. Alerts (Missed log alerts & escalations)
  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, subject_id, recipient_user_id, type, title, message, status, scheduled_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAlert.run(
    'alert-1',
    'sub-dbms',
    'usr-mgr-hitech',
    'CAMPUS_MANAGER_ESCALATION',
    'Database Systems is falling behind',
    'Buffer ratio has dropped below 1.00 (Critical Shortage). 3 buffer sessions need to be scheduled.',
    'PENDING',
    todayStr,
    new Date().toISOString()
  );

  insertAlert.run(
    'alert-2',
    'sub-cn',
    'usr-fac-sharma',
    'FACULTY_REMINDER',
    '1 session is waiting for a log',
    'Computer Networks session yesterday at 11:30 AM is waiting for confirmation.',
    'PENDING',
    todayStr,
    new Date().toISOString()
  );

  console.log('✔ Alerts and sample daily logs seeded.');
  console.log('🎉 Database seeding complete! Ready for local development and testing.');
}

seedDatabase();
