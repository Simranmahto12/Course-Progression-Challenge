import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';
import { CalendarEngine } from './services/calendarEngine.js';
import { SaturdayRule } from './types/index.js';

export async function seedCoreAcademicData() {
  console.log('🌱 Seeding institutional setup for Mirai School of Technology (MSOT)...');

  // 1. Campuses
  const campusesData = [
    { name: 'HI-Tech', code: 'HIT', city: 'Hyderabad' },
    { name: 'Ratnam', code: 'RAT', city: 'Nellore' },
    { name: 'RGIB', code: 'RGB', city: 'Bengaluru' },
    { name: 'JUJ', code: 'JUJ', city: 'Jaipur' },
  ];

  const campuses: Record<string, any> = {};
  for (const c of campusesData) {
    campuses[c.name] = await prisma.campus.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log('✔ Campuses seeded (HI-Tech, Ratnam, RGIB, JUJ)');

  // 2. Tracks
  const tracksData = [
    { name: 'Mirai Track', description: 'Industry-integrated applied AI/ML curriculum with intensive project labs' },
    { name: 'University Track', description: 'Standard university syllabus focused on core foundational computing' },
  ];

  const tracks: Record<string, any> = {};
  for (const t of tracksData) {
    tracks[t.name] = await prisma.track.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log('✔ Tracks seeded (Mirai Track, University Track)');

  // 3. Academic Year & Semester
  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2026-2027' },
    update: {},
    create: {
      name: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-20'),
      isCurrent: true,
    },
  });

  const semester = await prisma.semester.upsert({
    where: { id: 'sem-btech-cse-aiml-5' },
    update: {},
    create: {
      id: 'sem-btech-cse-aiml-5',
      name: 'BTech CSE (AI/ML) - Semester 5',
      academicYearId: academicYear.id,
      semesterNumber: 5,
      startDate: new Date('2026-08-03'),
      endDate: new Date('2026-12-15'),
      targetFinishDate: new Date('2026-11-30'),
      saturdayRule: 'SECOND_FOURTH_SATURDAY',
      isCurrent: true,
    },
  });
  console.log('✔ Academic Year (2026-2027) & Semester (Semester 5) seeded');

  // 4. Exam Windows
  const examWindowsData = [
    {
      semesterId: semester.id,
      name: 'SESSIONAL_1',
      displayName: 'Sessional Examination 1',
      startDate: new Date('2026-09-14'),
      endDate: new Date('2026-09-19'),
    },
    {
      semesterId: semester.id,
      name: 'MID_TERM',
      displayName: 'Mid-Term Examination',
      startDate: new Date('2026-10-19'),
      endDate: new Date('2026-10-24'),
    },
    {
      semesterId: semester.id,
      name: 'PUT',
      displayName: 'Pre-University Test (PUT)',
      startDate: new Date('2026-11-23'),
      endDate: new Date('2026-11-28'),
    },
    {
      semesterId: semester.id,
      name: 'END_TERM',
      displayName: 'End-Term Examination',
      startDate: new Date('2026-12-07'),
      endDate: new Date('2026-12-15'),
    },
  ];

  for (const ew of examWindowsData) {
    const existing = await prisma.examWindow.findFirst({
      where: { semesterId: ew.semesterId, name: ew.name },
    });
    if (!existing) {
      await prisma.examWindow.create({ data: ew });
    }
  }
  console.log('✔ Exam Windows seeded (SESSIONAL_1, MID_TERM, PUT, END_TERM)');

  // 5. Batches
  const batchesData = [
    {
      name: 'BTech CSE (AI/ML) - Batch A (HI-Tech)',
      campusId: campuses['HI-Tech'].id,
      trackId: tracks['Mirai Track'].id,
      semesterId: semester.id,
    },
    {
      name: 'BTech CSE (AI/ML) - Batch B (Ratnam)',
      campusId: campuses['Ratnam'].id,
      trackId: tracks['Mirai Track'].id,
      semesterId: semester.id,
    },
    {
      name: 'BTech CSE (AI/ML) - Batch C (RGIB)',
      campusId: campuses['RGIB'].id,
      trackId: tracks['University Track'].id,
      semesterId: semester.id,
    },
    {
      name: 'BTech CSE (AI/ML) - Batch D (JUJ)',
      campusId: campuses['JUJ'].id,
      trackId: tracks['University Track'].id,
      semesterId: semester.id,
    },
  ];

  const batches: Record<string, any> = {};
  for (const b of batchesData) {
    batches[b.name] = await prisma.batch.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    });
  }
  console.log('✔ Batches seeded across campuses and tracks');

  // 6. Users (Demo credentials with bcrypt 'mirai123')
  const defaultPasswordHash = await bcrypt.hash('mirai123', 10);

  const usersData = [
    {
      email: 'admin@mirai.edu.in',
      name: 'Dr. Suresh Varma (Program Director)',
      role: 'ADMIN',
      campusId: null,
      batchId: null,
    },
    {
      email: 'manager.hitech@mirai.edu.in',
      name: 'Kavita Reddy (Campus Manager HI-Tech)',
      role: 'CAMPUS_MANAGER',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'manager.ratnam@mirai.edu.in',
      name: 'Ramesh Naidu (Campus Manager Ratnam)',
      role: 'CAMPUS_MANAGER',
      campusId: campuses['Ratnam'].id,
      batchId: null,
    },
    {
      email: 'faculty1@mirai.edu.in',
      name: 'Vishal Rathee',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'faculty2@mirai.edu.in',
      name: 'Varun Kumar Sharma',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'aman.srivastava@mirai.edu.in',
      name: 'Aman Srivastava',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'himanshu.sharma@mirai.edu.in',
      name: 'Himanshu Sharma Kumar',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'gaurav.singh@mirai.edu.in',
      name: 'Gaurav Singh Singh',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'soniya.tyagi@mirai.edu.in',
      name: 'Soniya Tyagi',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'suman.rajput@mirai.edu.in',
      name: 'Dr Suman Rajput',
      role: 'FACULTY',
      campusId: campuses['HI-Tech'].id,
      batchId: null,
    },
    {
      email: 'faculty3@mirai.edu.in',
      name: 'Dr. Vikram Verma',
      role: 'FACULTY',
      campusId: campuses['Ratnam'].id,
      batchId: null,
    },
    {
      email: 'student@mirai.edu.in',
      name: 'Aarav Patel (Student BTech CSE AI/ML)',
      role: 'STUDENT',
      campusId: campuses['HI-Tech'].id,
      batchId: batches['BTech CSE (AI/ML) - Batch A (HI-Tech)'].id,
    },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        campusId: u.campusId,
        batchId: u.batchId,
      },
      create: {
        ...u,
        passwordHash: defaultPasswordHash,
      },
    });
  }
  console.log('✔ Demo Users seeded (Admin, Campus Managers, Faculty, Student) - password: "mirai123"');

  // 7. System Settings
  await prisma.systemSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      onTrackThreshold: 1.15,
      tightThreshold: 1.00,
      defaultSaturdayRule: 'SECOND_FOURTH_SATURDAY',
      academicYearName: '2026-2027',
    },
  });
  console.log('✔ System Settings seeded (On-Track: >= 1.15, Tight: >= 1.00, Saturday Rule: 2nd & 4th)');

  // 8. Holidays
  const holidaysData = [
    { date: new Date('2026-08-15'), title: 'Independence Day', type: 'HOLIDAY', isTeachingSuspended: true },
    { date: new Date('2026-09-07'), title: 'Ganesh Chaturthi', type: 'HOLIDAY', isTeachingSuspended: true },
    { date: new Date('2026-10-02'), title: 'Mahatma Gandhi Jayanti', type: 'HOLIDAY', isTeachingSuspended: true },
    { date: new Date('2026-10-20'), title: 'Dussehra / Vijaya Dashami', type: 'HOLIDAY', isTeachingSuspended: true },
    { date: new Date('2026-11-09'), title: 'Diwali Break Day 1', type: 'HOLIDAY', isTeachingSuspended: true },
    { date: new Date('2026-11-10'), title: 'Diwali Break Day 2', type: 'HOLIDAY', isTeachingSuspended: true },
    { date: new Date('2026-11-14'), title: 'Childrens Day Tech Fest', type: 'EVENT', isTeachingSuspended: false },
  ];

  for (const h of holidaysData) {
    const existing = await prisma.holidayCalendar.findFirst({
      where: { date: h.date, title: h.title },
    });
    if (!existing) {
      await prisma.holidayCalendar.create({ data: h });
    }
  }
  console.log('✔ Institutional Calendar & Holidays seeded');

  return { campuses, tracks, semester, batches, users };
}

export async function seedSubjectsAndProgress(academicData: any) {
  console.log('\n📚 Seeding BTech CSE (AI/ML) subjects and assigning faculty...');
  const { campuses, tracks, semester, batches, users } = academicData;

  const batchA = batches['BTech CSE (AI/ML) - Batch A (HI-Tech)'];
  const faculty1 = users['faculty1@mirai.edu.in']; // Dr. Rajesh Kumar
  const faculty2 = users['faculty2@mirai.edu.in']; // Prof. Anita Sharma

  // 1. Subject 1: DSA in c++
  const dsaSubject = await prisma.subject.upsert({
    where: {
      code_campusId_batchId: {
        code: 'CS501',
        campusId: campuses['HI-Tech'].id,
        batchId: batchA.id,
      },
    },
    update: {
      name: 'DSA in c++',
      trackId: tracks['Mirai Track'].id,
      plannedHours: 44.5,
      facultyId: faculty1.id,
    },
    create: {
      code: 'CS501',
      name: 'DSA in c++',
      campusId: campuses['HI-Tech'].id,
      trackId: tracks['Mirai Track'].id,
      semesterId: semester.id,
      batchId: batchA.id,
      facultyId: faculty1.id,
      plannedHours: 44.5,
      targetFinishDate: new Date('2026-11-30'),
      color: '#4f46e5',
    },
  });

  // 2. Subject 2: Web development
  const webSubject = await prisma.subject.upsert({
    where: {
      code_campusId_batchId: {
        code: 'CS502',
        campusId: campuses['HI-Tech'].id,
        batchId: batchA.id,
      },
    },
    update: {
      name: 'Web development',
      trackId: tracks['Mirai Track'].id,
      plannedHours: 40.0,
      facultyId: faculty2.id,
    },
    create: {
      code: 'CS502',
      name: 'Web development',
      campusId: campuses['HI-Tech'].id,
      trackId: tracks['Mirai Track'].id,
      semesterId: semester.id,
      batchId: batchA.id,
      facultyId: faculty2.id,
      plannedHours: 40.0,
      targetFinishDate: new Date('2026-11-30'),
      color: '#0891b2',
    },
  });

  const universitySubjects = [
    { code: 'CS503', name: 'IKS', faculty: users['gaurav.singh@mirai.edu.in'] },
    { code: 'EE101', name: 'Fundamentals of Electrical Engg.', faculty: users['aman.srivastava@mirai.edu.in'] },
    { code: 'PHY101', name: 'Physics', faculty: users['himanshu.sharma@mirai.edu.in'] },
    { code: 'WEB101', name: 'Internet & Web Basics', faculty: faculty2 },
    { code: 'CS504', name: 'Introduction to prompt Eng', faculty: faculty1 },
    { code: 'LAN101', name: 'Language lab', faculty: users['soniya.tyagi@mirai.edu.in'] },
    { code: 'PHY102', name: 'Physics Lab', faculty: users['suman.rajput@mirai.edu.in'] },
    { code: 'MAT101', name: 'Mathematics-I', faculty: users['gaurav.singh@mirai.edu.in'] },
    { code: 'CS505', name: 'Programming language', faculty: faculty1 },
  ];

  for (const subject of universitySubjects) {
    await prisma.subject.upsert({
      where: {
        code_campusId_batchId: {
          code: subject.code,
          campusId: campuses['HI-Tech'].id,
          batchId: batchA.id,
        },
      },
      update: {
        name: subject.name,
        trackId: tracks['University Track'].id,
        facultyId: subject.faculty.id,
      },
      create: {
        code: subject.code,
        name: subject.name,
        campusId: campuses['HI-Tech'].id,
        trackId: tracks['University Track'].id,
        semesterId: semester.id,
        batchId: batchA.id,
        facultyId: subject.faculty.id,
        plannedHours: 0,
        targetFinishDate: semester.targetFinishDate,
        color: '#2563eb',
      },
    });
  }

  console.log('✔ Subjects seeded: DSA and Web development (Mirai Track); nine other subjects (University Track)');

  // 3. Lesson Plans for DSA in c++
  const dsaTopics = [
    { unit: 'Unit 1: Foundations & STL', sequence: 1, name: 'C++ STL Containers (vector, list, deque) & Iterators', plannedHours: 3.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 3.0 },
    { unit: 'Unit 1: Foundations & STL', sequence: 2, name: 'Asymptotic Complexity & Big-O Analysis in C++', plannedHours: 2.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 2.0 },
    { unit: 'Unit 1: Foundations & STL', sequence: 3, name: 'STL Algorithms, Sorts & Lambda Expressions', plannedHours: 3.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 3.0 },
    { unit: 'Unit 2: Linear Structures', sequence: 4, name: 'Singly and Doubly Linked Lists with Smart Pointers', plannedHours: 4.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 4.0 },
    { unit: 'Unit 2: Linear Structures', sequence: 5, name: 'Stacks, Queues & Monotonic Queue Optimization', plannedHours: 3.5, examScopes: 'MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 3.5 },
    { unit: 'Unit 2: Linear Structures', sequence: 6, name: 'Hash Tables, Collisions & unordered_map Internals', plannedHours: 3.5, examScopes: 'MID_TERM,PUT,END_TERM', status: 'IN_PROGRESS', completionPercentage: 60, coveredHours: 2.1 },
    { unit: 'Unit 3: Hierarchical Structures', sequence: 7, name: 'Binary Trees, BST Traversals & Morris Traversal', plannedHours: 5.0, examScopes: 'MID_TERM,PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 3: Hierarchical Structures', sequence: 8, name: 'Balanced Search Trees (AVL & Red-Black Trees)', plannedHours: 4.5, examScopes: 'PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 3: Hierarchical Structures', sequence: 9, name: 'Priority Queues, Binary Heaps & HeapSort', plannedHours: 3.5, examScopes: 'PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 4: Graphs & Optimization', sequence: 10, name: 'Graph Representations, BFS & DFS in C++', plannedHours: 4.0, examScopes: 'PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 4: Graphs & Optimization', sequence: 11, name: 'Shortest Paths (Dijkstra, Bellman-Ford) & MST', plannedHours: 4.5, examScopes: 'END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 4: Graphs & Optimization', sequence: 12, name: 'Dynamic Programming & Memoization on Graphs', plannedHours: 4.0, examScopes: 'END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
  ];

  await prisma.topic.deleteMany({ where: { subjectId: dsaSubject.id } });
  for (const t of dsaTopics) {
    await prisma.topic.create({
      data: {
        subjectId: dsaSubject.id,
        unit: t.unit,
        sequence: t.sequence,
        name: t.name,
        plannedHours: t.plannedHours,
        examScopes: t.examScopes,
        status: t.status,
        completionPercentage: t.completionPercentage,
        coveredHours: t.coveredHours,
      },
    });
  }
  console.log(`✔ DSA in c++: ${dsaTopics.length} syllabus topics created`);

  // 4. Lesson Plans for Web development
  const webTopics = [
    { unit: 'Unit 1: Modern Frontend', sequence: 1, name: 'Semantic HTML5, CSS Grid, Flexbox & Responsive Layouts', plannedHours: 3.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 3.0 },
    { unit: 'Unit 1: Modern Frontend', sequence: 2, name: 'Modern JavaScript (ES6+, Async/Await, Closures, DOM API)', plannedHours: 4.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 4.0 },
    { unit: 'Unit 1: Modern Frontend', sequence: 3, name: 'TypeScript Foundations & Type Safety in Web Apps', plannedHours: 3.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 3.0 },
    { unit: 'Unit 2: React & Components', sequence: 4, name: 'React Components, Props, JSX & Virtual DOM', plannedHours: 4.0, examScopes: 'SESSIONAL_1,MID_TERM,PUT,END_TERM', status: 'COMPLETED', completionPercentage: 100, coveredHours: 4.0 },
    { unit: 'Unit 2: React & Components', sequence: 5, name: 'React Hooks (useState, useEffect, useMemo, custom hooks)', plannedHours: 4.5, examScopes: 'MID_TERM,PUT,END_TERM', status: 'IN_PROGRESS', completionPercentage: 50, coveredHours: 2.25 },
    { unit: 'Unit 2: React & Components', sequence: 6, name: 'State Management & Client-Side Routing', plannedHours: 3.5, examScopes: 'MID_TERM,PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 3: Full-Stack APIs', sequence: 7, name: 'REST API Design, Node.js & Express Server Architecture', plannedHours: 4.0, examScopes: 'MID_TERM,PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 3: Full-Stack APIs', sequence: 8, name: 'Relational Database Modeling, SQL & Prisma ORM', plannedHours: 4.5, examScopes: 'PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 3: Full-Stack APIs', sequence: 9, name: 'Authentication & Security (JWT, bcrypt, CORS, OWASP)', plannedHours: 3.5, examScopes: 'PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 4: Testing & Deployment', sequence: 10, name: 'Frontend & Backend Automated Testing (Jest, Supertest)', plannedHours: 3.0, examScopes: 'PUT,END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
    { unit: 'Unit 4: Testing & Deployment', sequence: 11, name: 'Web Performance Optimization & Core Web Vitals', plannedHours: 3.0, examScopes: 'END_TERM', status: 'PENDING', completionPercentage: 0, coveredHours: 0.0 },
  ];

  await prisma.topic.deleteMany({ where: { subjectId: webSubject.id } });
  for (const t of webTopics) {
    await prisma.topic.create({
      data: {
        subjectId: webSubject.id,
        unit: t.unit,
        sequence: t.sequence,
        name: t.name,
        plannedHours: t.plannedHours,
        examScopes: t.examScopes,
        status: t.status,
        completionPercentage: t.completionPercentage,
        coveredHours: t.coveredHours,
      },
    });
  }
  console.log(`✔ Web development: ${webTopics.length} syllabus topics created`);

  // 5. Timetable Entries
  // DSA in c++: Mon 09:00-10:30 (1.5h), Wed 09:00-10:30 (1.5h), Fri 14:00-16:00 (2.0h) -> 5.0h/week
  await prisma.timetableEntry.deleteMany({ where: { subjectId: dsaSubject.id } });
  await prisma.timetableEntry.createMany({
    data: [
      { campusId: campuses['HI-Tech'].id, batchId: batchA.id, subjectId: dsaSubject.id, facultyId: faculty1.id, weekday: 1, startTime: '09:00', endTime: '10:30', durationHours: 1.5, roomNumber: 'LH-101' },
      { campusId: campuses['HI-Tech'].id, batchId: batchA.id, subjectId: dsaSubject.id, facultyId: faculty1.id, weekday: 3, startTime: '09:00', endTime: '10:30', durationHours: 1.5, roomNumber: 'LH-101' },
      { campusId: campuses['HI-Tech'].id, batchId: batchA.id, subjectId: dsaSubject.id, facultyId: faculty1.id, weekday: 5, startTime: '14:00', endTime: '16:00', durationHours: 2.0, roomNumber: 'Lab-3 (AI/ML)' },
    ],
  });

  // Web development: Tue 10:00-11:30 (1.5h), Thu 10:00-11:30 (1.5h), Fri 10:00-12:00 (2.0h) -> 5.0h/week
  await prisma.timetableEntry.deleteMany({ where: { subjectId: webSubject.id } });
  await prisma.timetableEntry.createMany({
    data: [
      { campusId: campuses['HI-Tech'].id, batchId: batchA.id, subjectId: webSubject.id, facultyId: faculty2.id, weekday: 2, startTime: '10:00', endTime: '11:30', durationHours: 1.5, roomNumber: 'LH-102' },
      { campusId: campuses['HI-Tech'].id, batchId: batchA.id, subjectId: webSubject.id, facultyId: faculty2.id, weekday: 4, startTime: '10:00', endTime: '11:30', durationHours: 1.5, roomNumber: 'LH-102' },
      { campusId: campuses['HI-Tech'].id, batchId: batchA.id, subjectId: webSubject.id, facultyId: faculty2.id, weekday: 5, startTime: '10:00', endTime: '12:00', durationHours: 2.0, roomNumber: 'Web-Lab' },
    ],
  });
  console.log('✔ Timetable entries created for DSA in c++ and Web development (5.0h/week each)');

  // 6. Calculate & Store Planned Dates via CalendarEngine
  const holidays = await prisma.holidayCalendar.findMany();
  const rule = (semester.saturdayRule as SaturdayRule) || 'SECOND_FOURTH_SATURDAY';

  for (const sub of [dsaSubject, webSubject]) {
    const slots = await prisma.timetableEntry.findMany({ where: { subjectId: sub.id } });
    const timetableSlots = slots.map((s) => ({ weekday: s.weekday, durationHours: s.durationHours }));
    const topicsList = await prisma.topic.findMany({ where: { subjectId: sub.id }, orderBy: { sequence: 'asc' } });

    const calc = CalendarEngine.calculatePlannedTopicDates(
      semester.startDate,
      semester.endDate,
      rule,
      timetableSlots,
      topicsList,
      holidays,
      sub.campusId,
      sub.batchId
    );

    for (const [topId, dateStr] of calc.topicPlannedDates.entries()) {
      await prisma.topic.update({
        where: { id: topId },
        data: { plannedDate: new Date(dateStr) },
      });
    }
  }
  console.log('✔ Deterministic planned dates calculated and assigned for all syllabus topics');

  // 7. Seed Scheduled Sessions & Today Sessions for Demo
  const today = new Date();
  const todayDateStr = CalendarEngine.formatDateOnly(today);
  const todayWeekday = today.getDay(); // 0-6

  // Generate a scheduled session for today for faculty1
  const todayDsaSlot = await prisma.timetableEntry.findFirst({
    where: { subjectId: dsaSubject.id },
  });

  if (todayDsaSlot) {
    const todaySession = await prisma.scheduledSession.upsert({
      where: {
        subjectId_sessionDate_startTime: {
          subjectId: dsaSubject.id,
          sessionDate: new Date(`${todayDateStr}T00:00:00.000Z`),
          startTime: todayDsaSlot.startTime,
        },
      },
      update: {},
      create: {
        timetableEntryId: todayDsaSlot.id,
        subjectId: dsaSubject.id,
        facultyId: faculty1.id,
        batchId: batchA.id,
        campusId: campuses['HI-Tech'].id,
        sessionDate: new Date(`${todayDateStr}T00:00:00.000Z`),
        startTime: todayDsaSlot.startTime,
        endTime: todayDsaSlot.endTime,
        durationHours: todayDsaSlot.durationHours,
        status: 'SCHEDULED',
        hasLog: false,
      },
    });
    console.log(`✔ Today scheduled session created for DSA in c++ (${todayDsaSlot.startTime})`);
  }

  // Also seed past logged sessions to show audit history and realistic progress logs
  const pastSessionDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const pastSessionDateStr = CalendarEngine.formatDateOnly(pastSessionDate);

  const pastSession = await prisma.scheduledSession.upsert({
    where: {
      subjectId_sessionDate_startTime: {
        subjectId: dsaSubject.id,
        sessionDate: new Date(`${pastSessionDateStr}T00:00:00.000Z`),
        startTime: '09:00',
      },
    },
    update: {},
    create: {
      subjectId: dsaSubject.id,
      facultyId: faculty1.id,
      batchId: batchA.id,
      campusId: campuses['HI-Tech'].id,
      sessionDate: new Date(`${pastSessionDateStr}T00:00:00.000Z`),
      startTime: '09:00',
      endTime: '10:30',
      durationHours: 1.5,
      status: 'COMPLETED',
      hasLog: true,
    },
  });

  const existingLog = await prisma.sessionLog.findFirst({
    where: { scheduledSessionId: pastSession.id },
  });

  if (!existingLog) {
    const log = await prisma.sessionLog.create({
      data: {
        scheduledSessionId: pastSession.id,
        subjectId: dsaSubject.id,
        facultyId: faculty1.id,
        date: pastSession.sessionDate,
        status: 'COMPLETED',
        actualHours: 1.5,
        topicsCovered: JSON.stringify([{ topicName: 'C++ STL Containers (vector, list, deque)', completionPercentage: 100 }]),
        whatWasCovered: 'Vector amortized doubling, iterator invalidation rules, std::deque block structure',
        whatWasLeftOver: 'Custom allocator examples left for practical lab',
        carryForwardAction: 'Review Big-O analysis next class',
        classworkStatus: 'GIVEN',
        notes: 'Students demonstrated strong grasp of iterator category hierarchy.',
      },
    });

    await prisma.sessionAuditLog.create({
      data: {
        sessionLogId: log.id,
        changedByUserId: faculty1.id,
        action: 'CREATE',
        newState: JSON.stringify(log),
        reason: 'Initial session log recorded in under 60 seconds',
      },
    });
    console.log('✔ Sample session log & audit trail recorded for DSA in c++');
  }

  // Also seed one unlogged session > 48h to demonstrate the 48-hour alert escalation!
  const unloggedOldDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const unloggedOldDateStr = CalendarEngine.formatDateOnly(unloggedOldDate);

  const escalatedSession = await prisma.scheduledSession.upsert({
    where: {
      subjectId_sessionDate_startTime: {
        subjectId: webSubject.id,
        sessionDate: new Date(`${unloggedOldDateStr}T00:00:00.000Z`),
        startTime: '10:00',
      },
    },
    update: {},
    create: {
      subjectId: webSubject.id,
      facultyId: faculty2.id,
      batchId: batchA.id,
      campusId: campuses['HI-Tech'].id,
      sessionDate: new Date(`${unloggedOldDateStr}T00:00:00.000Z`),
      startTime: '10:00',
      endTime: '11:30',
      durationHours: 1.5,
      status: 'SCHEDULED',
      hasLog: false,
    },
  });

  // Create escalated alert for this session
  await prisma.alert.upsert({
    where: {
      scheduledSessionId_type: {
        scheduledSessionId: escalatedSession.id,
        type: 'CAMPUS_MANAGER_ESCALATION',
      },
    },
    update: {},
    create: {
      scheduledSessionId: escalatedSession.id,
      subjectId: webSubject.id,
      recipientUserId: users['manager.hitech@mirai.edu.in'].id,
      type: 'CAMPUS_MANAGER_ESCALATION',
      title: 'ESCALATION: Missing Log > 48h - CS502 Web development',
      message: 'Class for Web development scheduled on ' + unloggedOldDateStr + ' by Varun Kumar Sharma has not been logged for over 48 hours. Campus manager intervention required.',
      status: 'SENT',
      hoursUnlogged: 96.0,
      scheduledDate: escalatedSession.sessionDate,
      sentAt: new Date(),
    },
  });
  console.log('✔ Escalated alert created for unlogged Web development session (>48h)');

  console.log('\n🎉 All subject progression, lesson plans, timetables, and demo data seeded successfully!');
}

async function main() {
  const academicData = await seedCoreAcademicData();
  await seedSubjectsAndProgress(academicData);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
