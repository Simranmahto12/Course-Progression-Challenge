/**
 * MIRAI SCHOOL OF TECHNOLOGY (MSOT) — COURSE PROGRESSION PLATFORM
 * Core Application Engine (Vanilla ES6 Modules)
 * Handles: State management, DOM manipulation, Calculation Engine, API Sync, Chart.js
 */

const API_BASE = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
  ? `${window.location.origin}/api`
  : 'http://localhost:5001/api';

// Initial Mock & Demo Data Store
const INITIAL_DATA = {
  campuses: [
    { id: 'camp-hitech', name: 'HI-Tech', city: 'Hyderabad' },
    { id: 'camp-ratnam', name: 'Ratnam', city: 'Nellore' },
    { id: 'camp-rgib', name: 'RGIB', city: 'Bengaluru' },
    { id: 'camp-juj', name: 'JUJ', city: 'Jaipur' },
  ],
  tracks: [
    { id: 'track-mirai', name: 'Mirai Track', description: 'Industry-integrated AI/ML curriculum' },
    { id: 'track-univ', name: 'University Track', description: 'Core foundational university syllabus' },
  ],
  batches: [
    { id: 'batch-hitech-mirai', campusId: 'camp-hitech', trackId: 'track-mirai', name: 'HI-Tech AI/ML 2026 Batch A' },
    { id: 'batch-ratnam-mirai', campusId: 'camp-ratnam', trackId: 'track-mirai', name: 'Ratnam AI/ML 2026 Batch A' },
    { id: 'batch-rgib-mirai', campusId: 'camp-rgib', trackId: 'track-mirai', name: 'RGIB AI/ML 2026 Batch A' },
    { id: 'batch-juj-mirai', campusId: 'camp-juj', trackId: 'track-mirai', name: 'JUJ AI/ML 2026 Batch A' },
  ],
  users: {
    admin: {
      id: 'usr-admin',
      name: 'Dr. Suresh Varma',
      email: 'admin@mirai.edu',
      role: 'ADMIN',
      initials: 'SV',
      campusName: 'All Campuses (Global)',
    },
    campus_manager: {
      id: 'usr-mgr-hitech',
      name: 'Priya Nair',
      email: 'manager.hitech@mirai.edu',
      role: 'CAMPUS_MANAGER',
      initials: 'PN',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech Campus',
    },
    faculty: {
      id: 'usr-fac-sharma',
      name: 'Prof. Rajesh Sharma',
      email: 'faculty.sharma@mirai.edu',
      role: 'FACULTY',
      initials: 'RS',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech Campus',
    },
    student: {
      id: 'usr-stu-aarav',
      name: 'Aarav Mehta',
      email: 'student.aarav@mirai.edu',
      role: 'STUDENT',
      initials: 'AM',
      campusId: 'camp-hitech',
      batchId: 'batch-hitech-mirai',
      batchName: 'HI-Tech AI/ML 2026 Batch A',
    },
  },
  semester: {
    id: 'sem-2026-fall',
    name: 'BTech CSE (AI/ML) · Fall 2026',
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    workingSaturdaysRule: 'SECOND_FOURTH_SATURDAY', // 'ALL_SATURDAYS', 'NO_SATURDAYS', 'SECOND_FOURTH_SATURDAY'
    holidays: [
      { date: '2026-08-15', title: 'Independence Day' },
      { date: '2026-10-02', title: 'Gandhi Jayanti' },
      { date: '2026-10-20', title: 'Dussehra Break' },
      { date: '2026-11-09', title: 'Diwali Break' },
    ],
  },
  exams: [
    {
      id: 'exam-mid',
      name: 'MID_TERM',
      displayName: 'Mid-Semester Examinations',
      startDate: '2026-10-27',
      endDate: '2026-11-03',
    },
    {
      id: 'exam-final',
      name: 'FINAL',
      displayName: 'End-Semester Final Examinations',
      startDate: '2026-12-10',
      endDate: '2026-12-20',
    },
  ],
  subjects: [
    {
      id: 'sub-dsa',
      code: 'CS301',
      name: 'Data Structures & Algorithms',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech',
      trackName: 'Mirai Track',
      batchId: 'batch-hitech-mirai',
      facultyId: 'usr-fac-sharma',
      facultyName: 'Prof. Rajesh Sharma',
      targetFinishDate: '2026-12-05',
      color: '#7b70e1',
      topics: [
        { id: 'top-dsa-1', unit: 'Unit 1', sequence: 1, name: 'Asymptotic Notation & Time Complexity', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-dsa-2', unit: 'Unit 1', sequence: 2, name: 'Arrays & Dynamic Memory Allocation', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-dsa-3', unit: 'Unit 1', sequence: 3, name: 'Singly & Doubly Linked Lists', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-dsa-4', unit: 'Unit 2', sequence: 4, name: 'Stacks, Queues & Circular Queues', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-dsa-5', unit: 'Unit 2', sequence: 5, name: 'Binary Trees & Traversals', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-dsa-6', unit: 'Unit 2', sequence: 6, name: 'Binary Search Trees (BST)', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-dsa-7', unit: 'Unit 3', sequence: 7, name: 'AVL Trees & Rotations', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-dsa-8', unit: 'Unit 3', sequence: 8, name: 'Heaps & Priority Queues', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-dsa-9', unit: 'Unit 3', sequence: 9, name: 'Graph Representations & BFS/DFS', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-dsa-10', unit: 'Unit 4', sequence: 10, name: 'Dijkstra Shortest Path Algorithm', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-dsa-11', unit: 'Unit 4', sequence: 11, name: 'Minimum Spanning Trees (Kruskal/Prim)', plannedHours: 2.0, status: 'IN_PROGRESS', percentageComplete: 50, examScope: 'FINAL' },
        { id: 'top-dsa-12', unit: 'Unit 4', sequence: 12, name: 'Dynamic Programming: Memoization', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-dsa-13', unit: 'Unit 4', sequence: 13, name: 'Knapsack & LCS', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
      ],
    },
    {
      id: 'sub-dbms',
      code: 'CS302',
      name: 'Database Systems',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech',
      trackName: 'Mirai Track',
      batchId: 'batch-hitech-mirai',
      facultyId: 'usr-fac-gupta',
      facultyName: 'Dr. Ananya Gupta',
      targetFinishDate: '2026-11-28', // Earlier target + slower pace = DANGER (demonstrates worst-subject bottleneck)
      color: '#e7a956',
      topics: [
        { id: 'top-db-1', unit: 'Unit 1', sequence: 1, name: 'Relational Model & Relational Algebra', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-db-2', unit: 'Unit 1', sequence: 2, name: 'Entity-Relationship (ER) Modeling', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-db-3', unit: 'Unit 1', sequence: 3, name: 'Advanced SQL & Nested Queries', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-db-4', unit: 'Unit 2', sequence: 4, name: 'Functional Dependencies & 1NF/2NF', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-db-5', unit: 'Unit 2', sequence: 5, name: '3NF and BCNF Normalization', plannedHours: 2.0, status: 'IN_PROGRESS', percentageComplete: 30, examScope: 'MID_TERM,FINAL' },
        { id: 'top-db-6', unit: 'Unit 2', sequence: 6, name: 'Transaction Properties & ACID Rules', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'MID_TERM,FINAL' },
        { id: 'top-db-7', unit: 'Unit 3', sequence: 7, name: 'Concurrency Control & Locking Protocols', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-db-8', unit: 'Unit 3', sequence: 8, name: 'Deadlock Detection & Recovery', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-db-9', unit: 'Unit 3', sequence: 9, name: 'B+ Tree Indexing in Relational Engines', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-db-10', unit: 'Unit 4', sequence: 10, name: 'Query Optimization & Cost Estimation', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-db-11', unit: 'Unit 4', sequence: 11, name: 'Crash Recovery & Write-Ahead Logging', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
      ],
    },
    {
      id: 'sub-cn',
      code: 'CS303',
      name: 'Computer Networks',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech',
      trackName: 'Mirai Track',
      batchId: 'batch-hitech-mirai',
      facultyId: 'usr-fac-sharma',
      facultyName: 'Prof. Rajesh Sharma',
      targetFinishDate: '2026-12-05',
      color: '#68a0df',
      topics: [
        { id: 'top-cn-1', unit: 'Unit 1', sequence: 1, name: 'OSI vs TCP/IP Protocol Layers', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-cn-2', unit: 'Unit 1', sequence: 2, name: 'Physical Layer & Transmission Media', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-cn-3', unit: 'Unit 1', sequence: 3, name: 'Data Link Framing & Flow Control', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-cn-4', unit: 'Unit 2', sequence: 4, name: 'Error Detection: Parity & CRC', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-cn-5', unit: 'Unit 2', sequence: 5, name: 'IPv4 Addressing & Subnetting', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-cn-6', unit: 'Unit 2', sequence: 6, name: 'Routing: Distance Vector & Link State', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-cn-7', unit: 'Unit 3', sequence: 7, name: 'TCP 3-Way Handshake & Flow Control', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-cn-8', unit: 'Unit 3', sequence: 8, name: 'Congestion Control Algorithms', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-cn-9', unit: 'Unit 4', sequence: 9, name: 'DNS, HTTP/2 & Web Sockets', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-cn-10', unit: 'Unit 4', sequence: 10, name: 'TLS Handshake & Cryptographic Security', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
      ],
    },
    {
      id: 'sub-ml',
      code: 'AI301',
      name: 'Machine Learning',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech',
      trackName: 'Mirai Track',
      batchId: 'batch-hitech-mirai',
      facultyId: 'usr-fac-sharma',
      facultyName: 'Prof. Rajesh Sharma',
      targetFinishDate: '2026-12-05',
      color: '#68bd96',
      topics: [
        { id: 'top-ml-1', unit: 'Unit 1', sequence: 1, name: 'Introduction to Supervised Learning', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ml-2', unit: 'Unit 1', sequence: 2, name: 'Linear Regression & Gradient Descent', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ml-3', unit: 'Unit 1', sequence: 3, name: 'Logistic Regression & Decision Boundaries', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ml-4', unit: 'Unit 2', sequence: 4, name: 'Overfitting, Regularization (L1/L2)', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ml-5', unit: 'Unit 2', sequence: 5, name: 'Support Vector Machines (SVM)', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ml-6', unit: 'Unit 2', sequence: 6, name: 'Decision Trees & Information Gain', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ml-7', unit: 'Unit 3', sequence: 7, name: 'Random Forests & Ensemble Bagging', plannedHours: 2.0, status: 'IN_PROGRESS', percentageComplete: 50, examScope: 'FINAL' },
        { id: 'top-ml-8', unit: 'Unit 3', sequence: 8, name: 'Gradient Boosting (XGBoost)', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-ml-9', unit: 'Unit 3', sequence: 9, name: 'K-Means & Hierarchical Clustering', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-ml-10', unit: 'Unit 4', sequence: 10, name: 'Principal Component Analysis (PCA)', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
        { id: 'top-ml-11', unit: 'Unit 4', sequence: 11, name: 'Neural Networks: Backpropagation', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
      ],
    },
    {
      id: 'sub-os',
      code: 'CS304',
      name: 'Operating Systems',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech',
      trackName: 'Mirai Track',
      batchId: 'batch-hitech-mirai',
      facultyId: 'usr-fac-gupta',
      facultyName: 'Dr. Ananya Gupta',
      targetFinishDate: '2026-12-05',
      color: '#e98783',
      topics: [
        { id: 'top-os-1', unit: 'Unit 1', sequence: 1, name: 'OS Architectures & System Calls', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-os-2', unit: 'Unit 1', sequence: 2, name: 'Processes, Threads & Concurrency', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-os-3', unit: 'Unit 1', sequence: 3, name: 'CPU Scheduling Algorithms', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-os-4', unit: 'Unit 2', sequence: 4, name: 'Semaphores & Mutex Locks', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-os-5', unit: 'Unit 2', sequence: 5, name: 'Banker Algorithm & Deadlock Avoidance', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-os-6', unit: 'Unit 3', sequence: 6, name: 'Virtual Memory & Page Replacement', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-os-7', unit: 'Unit 3', sequence: 7, name: 'File Systems & Inode Structure', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-os-8', unit: 'Unit 4', sequence: 8, name: 'Disk Scheduling & SSD Architectures', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
      ],
    },
    {
      id: 'sub-ai',
      code: 'AI302',
      name: 'Artificial Intelligence',
      campusId: 'camp-hitech',
      campusName: 'HI-Tech',
      trackName: 'Mirai Track',
      batchId: 'batch-hitech-mirai',
      facultyId: 'usr-fac-sharma',
      facultyName: 'Prof. Rajesh Sharma',
      targetFinishDate: '2026-12-05',
      color: '#7daab0',
      topics: [
        { id: 'top-ai-1', unit: 'Unit 1', sequence: 1, name: 'Foundations & State Space Search', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ai-2', unit: 'Unit 1', sequence: 2, name: 'Informed Search: A* & Heuristics', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ai-3', unit: 'Unit 1', sequence: 3, name: 'Adversarial Search & Alpha-Beta', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ai-4', unit: 'Unit 2', sequence: 4, name: 'Constraint Satisfaction Problems', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ai-5', unit: 'Unit 2', sequence: 5, name: 'Knowledge Representation & First-Order Logic', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'MID_TERM,FINAL' },
        { id: 'top-ai-6', unit: 'Unit 3', sequence: 6, name: 'Bayesian Networks & Probabilistic Inference', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-ai-7', unit: 'Unit 3', sequence: 7, name: 'Markov Decision Processes (MDP)', plannedHours: 2.0, status: 'COMPLETED', percentageComplete: 100, examScope: 'FINAL' },
        { id: 'top-ai-8', unit: 'Unit 4', sequence: 8, name: 'Reinforcement Learning: Q-Learning', plannedHours: 2.0, status: 'PENDING', percentageComplete: 0, examScope: 'FINAL' },
      ],
    },
  ],
  timetables: [
    { id: 'tt-1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:30', subjectId: 'sub-dsa', facultyId: 'usr-fac-sharma', room: 'Room 204' },
    { id: 'tt-2', dayOfWeek: 'Monday', startTime: '11:00', endTime: '12:30', subjectId: 'sub-cn', facultyId: 'usr-fac-sharma', room: 'Room 108' },
    { id: 'tt-3', dayOfWeek: 'Monday', startTime: '14:00', endTime: '15:30', subjectId: 'sub-ml', facultyId: 'usr-fac-sharma', room: 'Lab 03' },
    { id: 'tt-4', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:30', subjectId: 'sub-dbms', facultyId: 'usr-fac-gupta', room: 'Room 105' },
    { id: 'tt-5', dayOfWeek: 'Tuesday', startTime: '11:00', endTime: '12:30', subjectId: 'sub-os', facultyId: 'usr-fac-gupta', room: 'Room 204' },
    { id: 'tt-6', dayOfWeek: 'Tuesday', startTime: '14:00', endTime: '15:30', subjectId: 'sub-ai', facultyId: 'usr-fac-sharma', room: 'Room 108' },
    { id: 'tt-7', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:30', subjectId: 'sub-dsa', facultyId: 'usr-fac-sharma', room: 'Room 204' },
    { id: 'tt-8', dayOfWeek: 'Wednesday', startTime: '11:00', endTime: '12:30', subjectId: 'sub-cn', facultyId: 'usr-fac-sharma', room: 'Room 108' },
    { id: 'tt-9', dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '15:30', subjectId: 'sub-ml', facultyId: 'usr-fac-sharma', room: 'Lab 03' },
    { id: 'tt-10', dayOfWeek: 'Thursday', startTime: '09:00', endTime: '10:30', subjectId: 'sub-dbms', facultyId: 'usr-fac-gupta', room: 'Room 105' },
    { id: 'tt-11', dayOfWeek: 'Thursday', startTime: '11:00', endTime: '12:30', subjectId: 'sub-os', facultyId: 'usr-fac-gupta', room: 'Room 204' },
    { id: 'tt-12', dayOfWeek: 'Thursday', startTime: '14:00', endTime: '15:30', subjectId: 'sub-ai', facultyId: 'usr-fac-sharma', room: 'Room 108' },
    { id: 'tt-13', dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:30', subjectId: 'sub-dsa', facultyId: 'usr-fac-sharma', room: 'Room 204' },
    { id: 'tt-14', dayOfWeek: 'Friday', startTime: '11:00', endTime: '12:30', subjectId: 'sub-dbms', facultyId: 'usr-fac-gupta', room: 'Room 105' },
    { id: 'tt-15', dayOfWeek: 'Friday', startTime: '14:00', endTime: '15:30', subjectId: 'sub-ml', facultyId: 'usr-fac-sharma', room: 'Lab 03' },
    { id: 'tt-16', dayOfWeek: 'Saturday', startTime: '10:00', endTime: '12:00', subjectId: 'sub-ai', facultyId: 'usr-fac-sharma', room: 'Auditorium' },
  ],
  alerts: [
    {
      id: 'alt-1',
      type: 'CAMPUS_MANAGER_ESCALATION',
      title: 'Database Systems is falling behind',
      message: 'Buffer ratio has dropped below 1.00 (Critical Shortage). 3 buffer sessions need to be scheduled.',
      time: '2 hours ago',
      level: 'danger',
    },
    {
      id: 'alt-2',
      type: 'FACULTY_REMINDER',
      title: '1 session is waiting for confirmation',
      message: 'Computer Networks session yesterday at 11:30 AM is waiting for confirmation.',
      time: 'Yesterday',
      level: 'warning',
    },
  ],
  dailyLogs: [],
};

// ==========================================================================
// CALCULATION ENGINE (Strict MSOT Academic Standards)
// ==========================================================================
class CalculationEngine {
  static timeToHours(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  }

  static calculateTopicCoveredHours(topic) {
    if (topic.status === 'SKIPPED') return 0;
    if (topic.status === 'COMPLETED') return topic.plannedHours;
    if (topic.status === 'IN_PROGRESS') {
      const pct = Math.max(0, Math.min(100, topic.percentageComplete || 0));
      return Math.round(topic.plannedHours * (pct / 100) * 100) / 100;
    }
    return 0;
  }

  static isWorkingDay(date, saturdayRule, holidays = []) {
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0) return false;

    const dateStr = date.toISOString().split('T')[0];
    if (holidays.some((h) => (typeof h === 'string' ? h : h.date) === dateStr)) {
      return false;
    }

    if (day >= 1 && day <= 5) return true;

    if (day === 6) {
      if (saturdayRule === 'ALL_SATURDAYS') return true;
      if (saturdayRule === 'NO_SATURDAYS') return false;
      if (saturdayRule === 'SECOND_FOURTH_SATURDAY') {
        const satIndex = Math.floor((date.getDate() - 1) / 7) + 1;
        return satIndex !== 2 && satIndex !== 4;
      }
    }
    return true;
  }

  static calculateAvailableHours(startDate, endDate, saturdayRule, timetableSlots, holidays = [], cancelledDates = []) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let totalHours = 0;

    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);

    const finish = new Date(endDate);
    finish.setHours(23, 59, 59, 999);

    if (cur > finish) return 0;

    while (cur <= finish) {
      const dateStr = cur.toISOString().split('T')[0];
      const isWorking = this.isWorkingDay(cur, saturdayRule, holidays);

      if (isWorking && !cancelledDates.includes(dateStr)) {
        const dayName = dayNames[cur.getDay()];
        const matchingSlots = timetableSlots.filter((slot) => slot.dayOfWeek === dayName);

        for (const slot of matchingSlots) {
          const duration = this.timeToHours(slot.endTime) - this.timeToHours(slot.startTime);
          if (duration > 0) totalHours += duration;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    return Math.round(totalHours * 10) / 10;
  }

  static calculateSubject(subject, semester, timetables, referenceDate = new Date()) {
    const todayStr = referenceDate.toISOString().split('T')[0];
    let hoursInScope = 0;
    let coveredHours = 0;
    let plannedHoursToDate = 0;
    const overdueTopics = [];

    const nonSkippedTopics = subject.topics.filter((t) => t.status !== 'SKIPPED');

    for (const t of nonSkippedTopics) {
      hoursInScope += t.plannedHours;
      const covered = this.calculateTopicCoveredHours(t);
      coveredHours += covered;

      if (t.plannedDate) {
        if (t.plannedDate <= todayStr) {
          plannedHoursToDate += t.plannedHours;
          if (t.status !== 'COMPLETED' && t.percentageComplete < 100 && t.plannedDate < todayStr) {
            overdueTopics.push(t);
          }
        }
      }
    }

    const remainingHours = Math.max(0, hoursInScope - coveredHours);
    const coveragePct = hoursInScope > 0 ? (coveredHours / hoursInScope) * 100 : 0;

    // Available teaching hours
    const subTimetables = timetables.filter((slot) => slot.subjectId === subject.id);
    const availableHours = this.calculateAvailableHours(
      referenceDate,
      new Date(subject.targetFinishDate),
      semester.workingSaturdaysRule,
      subTimetables,
      semester.holidays
    );

    // Buffer ratio
    let bufferRatio = 0;
    let status = 'ON TRACK';

    if (remainingHours <= 0.001) {
      bufferRatio = 999.9;
      status = 'COMPLETE';
    } else {
      bufferRatio = Math.round((availableHours / remainingHours) * 100) / 100;
      if (bufferRatio >= 1.15) status = 'ON TRACK';
      else if (bufferRatio >= 1.00) status = 'TIGHT';
      else status = 'DANGER';
    }

    const paceVsPlan = Math.round((coveredHours - plannedHoursToDate) * 10) / 10;

    return {
      subjectId: subject.id,
      code: subject.code,
      name: subject.name,
      color: subject.color,
      campusName: subject.campusName,
      trackName: subject.trackName,
      facultyName: subject.facultyName,
      targetFinishDate: subject.targetFinishDate,
      hoursInScope: Math.round(hoursInScope * 10) / 10,
      coveredHours: Math.round(coveredHours * 10) / 10,
      coveragePercentage: Math.round(coveragePct * 10) / 10,
      remainingHours: Math.round(remainingHours * 10) / 10,
      availableHours: Math.round(availableHours * 10) / 10,
      bufferRatio,
      status,
      paceVsPlan,
      overdueTopics,
    };
  }

  /**
   * Worst-Subject Rollup: Minimum Buffer Ratio Rule
   */
  static calculateRollup(entityId, entityName, type, calculatedSubjects) {
    if (!calculatedSubjects || calculatedSubjects.length === 0) {
      return {
        entityId,
        entityName,
        type,
        worstStatus: 'COMPLETE',
        bottleneckSubject: null,
        totalSubjects: 0,
        averageCoverage: 0,
        totalPlannedHours: 0,
        totalCoveredHours: 0,
      };
    }

    const severities = { DANGER: 4, TIGHT: 3, 'ON TRACK': 2, COMPLETE: 1 };
    let worst = calculatedSubjects[0];
    let totalPlanned = 0;
    let totalCovered = 0;
    let totalPct = 0;

    for (const sub of calculatedSubjects) {
      totalPlanned += sub.hoursInScope;
      totalCovered += sub.coveredHours;
      totalPct += sub.coveragePercentage;

      const currentSev = severities[sub.status] || 0;
      const worstSev = severities[worst.status] || 0;

      if (currentSev > worstSev) {
        worst = sub;
      } else if (currentSev === worstSev && sub.bufferRatio < worst.bufferRatio) {
        worst = sub;
      }
    }

    return {
      entityId,
      entityName,
      type,
      worstStatus: worst.status,
      bottleneckSubject: worst,
      totalSubjects: calculatedSubjects.length,
      averageCoverage: Math.round((totalPct / calculatedSubjects.length) * 10) / 10,
      totalPlannedHours: Math.round(totalPlanned * 10) / 10,
      totalCoveredHours: Math.round(totalCovered * 10) / 10,
    };
  }

  static calculateExamReadiness(subject, exam, semester, timetables, referenceDate = new Date()) {
    const examKeyword = exam.name.toUpperCase();
    const inScopeTopics = subject.topics.filter((t) => {
      if (t.status === 'SKIPPED') return false;
      const scopeFlags = (t.examScope || '').toUpperCase().split(',');
      return scopeFlags.some((s) => s.trim().includes(examKeyword) || examKeyword.includes(s.trim()));
    });

    let inScopePlanned = 0;
    let covered = 0;

    for (const t of inScopeTopics) {
      inScopePlanned += t.plannedHours;
      covered += this.calculateTopicCoveredHours(t);
    }

    const remaining = Math.max(0, inScopePlanned - covered);
    const coveragePct = inScopePlanned > 0 ? (covered / inScopePlanned) * 100 : 0;

    const subTimetables = timetables.filter((s) => s.subjectId === subject.id);
    const availableHours = this.calculateAvailableHours(
      referenceDate,
      new Date(exam.startDate),
      semester.workingSaturdaysRule,
      subTimetables,
      semester.holidays
    );

    // Days remaining to exam
    const diffTime = new Date(exam.startDate).getTime() - referenceDate.getTime();
    const daysAway = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let status = 'ON TRACK';
    if (remaining <= 0.001) status = 'COMPLETE';
    else {
      const buffer = remaining > 0 ? availableHours / remaining : 999;
      if (buffer >= 1.15) status = 'ON TRACK';
      else if (buffer >= 1.00) status = 'TIGHT';
      else status = 'DANGER';
    }

    return {
      examId: exam.id,
      examName: exam.name,
      displayName: exam.displayName,
      startDate: exam.startDate,
      daysAway,
      inScopeTopicsCount: inScopeTopics.length,
      inScopePlannedHours: Math.round(inScopePlanned * 10) / 10,
      coveredHours: Math.round(covered * 10) / 10,
      remainingHours: Math.round(remaining * 10) / 10,
      coveragePercentage: Math.round(coveragePct * 10) / 10,
      availableHoursBeforeExam: Math.round(availableHours * 10) / 10,
      status,
      inScopeTopics,
    };
  }
}

// ==========================================================================
// APPLICATION STORE & CONTROLLER
// ==========================================================================
class AppStore {
  constructor() {
    this.state = this.loadState();
    this.currentRole = 'faculty';
    this.currentTab = 'dashboard';
    this.isBackendConnected = false;
    this.charts = {};
    this.auth = {
      phone: '',
      demoOtp: '123456',
      token: (typeof localStorage !== 'undefined' ? localStorage.getItem('msot_auth_token') : null) || null,
      user: (typeof localStorage !== 'undefined' && localStorage.getItem('msot_user'))
        ? JSON.parse(localStorage.getItem('msot_user'))
        : null,
      googleProfile: null,
      googleClientId: '601818746857-dh3skj3lmbnpn6hpmu6dg40r9hnpodh0.apps.googleusercontent.com',
      resendTimer: null,
      resendTimeLeft: 30,
    };
  }

  loadState() {
    const saved = localStorage.getItem('msot_app_state_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse cached state, resetting.', e);
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveState() {
    localStorage.setItem('msot_app_state_v1', JSON.stringify(this.state));
  }

  async checkBackendConnection() {
    const pill = document.getElementById('backendStatusPill');
    const text = document.getElementById('backendStatusText');

    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      if (res.ok) {
        this.isBackendConnected = true;
        if (pill) pill.classList.add('connected');
        if (text) text.textContent = 'API Live (Port 5001)';
        return true;
      }
    } catch (e) {
      // Local fallback mode
      this.isBackendConnected = false;
    }

    if (pill) pill.classList.remove('connected');
    if (text) text.textContent = 'Local Engine Active';
    return false;
  }

  switchRole(role) {
    this.currentRole = role;
    const user = this.state.users[role];

    // Update avatar and name in topbar
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const badge = document.getElementById('userRoleBadge');
    const select = document.getElementById('roleSelect');

    if (avatar) avatar.textContent = user.initials;
    if (name) name.textContent = user.name;
    if (badge) badge.textContent = user.role.replace('_', ' ');
    // Sync all role selects
    if (select) select.value = role;
    const profileSelect = document.getElementById('profileRoleSelect');
    if (profileSelect) profileSelect.value = role;

    // Show/hide Quick Log button based on role
    const quickLogBtn = document.getElementById('quickLogBtn');
    if (quickLogBtn) {
      quickLogBtn.style.display = (role === 'faculty' || role === 'admin') ? 'inline-flex' : 'none';
    }

    this.updateNavAuthState();

    this.showToast(`Switched view to ${user.name} (${user.role})`);
    this.render();
  }

  setTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    this.render();
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>💬</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  toggleNotificationsDrawer(forceState) {
    const drawer = document.getElementById('notifDrawer');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    const shouldOpen = forceState !== undefined ? forceState : !isOpen;

    drawer.classList.toggle('open', shouldOpen);

    if (shouldOpen) {
      const container = document.getElementById('notifListContainer');
      container.innerHTML = this.state.alerts.map((a) => `
        <div class="notif-item ${a.level === 'danger' ? 'notif-danger' : 'notif-warning'}">
          <div class="notif-title">${a.title}</div>
          <div class="notif-msg">${a.message}</div>
          <div class="notif-time">${a.time}</div>
        </div>
      `).join('');
    }
  }

  // ==========================================================================
  // FACULTY LOGGING MODAL LOGIC (<60s)
  // ==========================================================================
  openQuickLogModal(slotId) {
    // If slotId not provided, default to first slot of current faculty
    const facultyId = this.state.users[this.currentRole]?.id || 'usr-fac-sharma';
    const facultySlots = this.state.timetables.filter((t) => t.facultyId === facultyId || this.currentRole === 'admin');
    const targetSlot = slotId ? this.state.timetables.find((t) => t.id === slotId) : (facultySlots[0] || this.state.timetables[0]);

    if (!targetSlot) {
      this.showToast('No scheduled sessions found to log.', 'warning');
      return;
    }

    const subject = this.state.subjects.find((s) => s.id === targetSlot.subjectId);
    const nextTopic = subject?.topics.find((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED') || subject?.topics[0];

    document.getElementById('logTimetableId').value = targetSlot.id;
    document.getElementById('logSubjectCode').textContent = subject.code;
    document.getElementById('logSubjectName').textContent = subject.name;
    document.getElementById('logScheduleMeta').textContent = `${targetSlot.dayOfWeek} · ${targetSlot.startTime} - ${targetSlot.endTime} · ${targetSlot.room}`;

    document.getElementById('logExpectedTopic').textContent = nextTopic ? nextTopic.name : 'All syllabus topics completed';
    document.getElementById('logExpectedTopicUnit').textContent = nextTopic ? `${nextTopic.unit} • ${nextTopic.plannedHours} planned hours • Sequence #${nextTopic.sequence}` : '';

    document.getElementById('logTopicsCovered').value = nextTopic ? nextTopic.name : '';
    document.getElementById('logLeftovers').value = '';
    document.getElementById('logNotes').value = '';

    // Reset status to Completed, 100%
    this.setStatusChip('Completed');
    this.updateSliderValue(100);
    this.setCwChip('None');

    this.openModal('sessionLogModal');
  }

  setStatusChip(status) {
    document.getElementById('logStatusInput').value = status;
    document.querySelectorAll('.chip-status').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.status === status);
    });

    const sliderGroup = document.getElementById('completionSliderGroup');
    if (status === 'Completed') {
      this.updateSliderValue(100);
      sliderGroup.style.display = 'none';
    } else if (status === 'In Progress') {
      sliderGroup.style.display = 'block';
      this.updateSliderValue(50);
    } else {
      sliderGroup.style.display = 'none';
      this.updateSliderValue(0);
    }
  }

  updateSliderValue(val) {
    document.getElementById('completionSlider').value = val;
    document.getElementById('completionValBadge').textContent = `${val}%`;

    document.querySelectorAll('.preset-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.textContent.includes(`${val}%`));
    });
  }

  setCwChip(cw) {
    document.getElementById('logCwInput').value = cw;
    document.querySelectorAll('.chip-cw').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cw === cw);
    });
  }

  async handleSessionLogSubmit(e) {
    e.preventDefault();
    const timetableId = document.getElementById('logTimetableId').value;
    const status = document.getElementById('logStatusInput').value;
    const pct = Number(document.getElementById('completionSlider').value);
    const topicsCovered = document.getElementById('logTopicsCovered').value;
    const leftovers = document.getElementById('logLeftovers').value;
    const notes = document.getElementById('logNotes').value;

    const slot = this.state.timetables.find((t) => t.id === timetableId);
    if (!slot) return;

    const subject = this.state.subjects.find((s) => s.id === slot.subjectId);
    if (!subject) return;

    // 1. Update topic in subject
    const nextTopic = subject.topics.find((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
    if (nextTopic) {
      if (status === 'Completed') {
        nextTopic.status = 'COMPLETED';
        nextTopic.percentageComplete = 100;
      } else if (status === 'In Progress') {
        nextTopic.status = 'IN_PROGRESS';
        nextTopic.percentageComplete = pct;
      } else if (status === 'Skipped') {
        nextTopic.status = 'SKIPPED';
      }
    }

    // 2. Save log entry
    const newLog = {
      id: `log-${Date.now()}`,
      timetableId,
      subjectId: subject.id,
      status,
      percentageComplete: pct,
      topicsCovered,
      leftovers,
      notes,
      timestamp: new Date().toISOString(),
    };
    this.state.dailyLogs.push(newLog);

    // If online, optionally sync to backend
    if (this.isBackendConnected) {
      fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetable_id: timetableId,
          status,
          percentage_complete: pct,
          topics_covered: topicsCovered,
          leftovers,
          notes,
        }),
      }).catch((err) => console.warn('Background sync failed:', err));
    }

    this.saveState();
    this.closeModal('sessionLogModal');
    this.showToast(`Logged session for ${subject.code} in under 60 seconds!`);
    this.render();
  }

  // ==========================================================================
  // EXPLAIN CALCULATION AUDIT MODAL
  // ==========================================================================
  openExplainModal(subjectId) {
    const subject = this.state.subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    const res = CalculationEngine.calculateSubject(subject, this.state.semester, this.state.timetables);
    document.getElementById('explainSubjectTitle').textContent = `Calculation Audit: ${res.code} - ${res.name}`;

    const body = document.getElementById('explainModalBody');
    body.innerHTML = `
      <div class="derivation-box">
        <h4 style="margin-bottom: 0.75rem; color: var(--color-navy); font-weight: 800;">Step-by-Step Mathematical Derivation</h4>
        <div class="derivation-row">
          <span>Hours in Scope (Non-skipped syllabus topics)</span>
          <span class="derivation-val">${res.hoursInScope} hrs</span>
        </div>
        <div class="derivation-row">
          <span>Covered Hours (Completed + Proportional In-Progress)</span>
          <span class="derivation-val" style="color: var(--color-success);">${res.coveredHours} hrs (${res.coveragePercentage}%)</span>
        </div>
        <div class="derivation-row">
          <span>Remaining Hours Required (Scope - Covered)</span>
          <span class="derivation-val">${res.remainingHours} hrs</span>
        </div>
        <div class="derivation-row">
          <span>Available Calendar Teaching Hours (to ${res.targetFinishDate})</span>
          <span class="derivation-val">${res.availableHours} hrs</span>
        </div>
        <div class="derivation-row" style="background: rgba(67, 97, 238, 0.06); padding: 0.65rem 0.5rem; margin: 0.5rem 0; border-radius: 6px;">
          <strong style="color: var(--color-accent);">Buffer Ratio Formula</strong>
          <span class="derivation-val" style="color: var(--color-accent); font-size: 1rem;">${res.availableHours}h ÷ ${res.remainingHours}h = ${res.bufferRatio}×</span>
        </div>
        <div class="derivation-row">
          <span>Status Evaluation Tier</span>
          <span><span class="badge ${this.getStatusBadgeClass(res.status)}">${res.status}</span></span>
        </div>
      </div>

      <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--color-text-secondary); line-height: 1.5;">
        <strong>Calendar Engine Verification:</strong> Saturday Rule active: <code>${this.state.semester.workingSaturdaysRule}</code> (2nd & 4th Saturdays suspended).
        Institutional holidays excluded: <code>${this.state.semester.holidays.map((h) => h.title).join(', ')}</code>.
      </div>
    `;

    this.openModal('explainModal');
  }

  getStatusBadgeClass(status) {
    if (status === 'ON TRACK' || status === 'COMPLETE') return 'badge-on-track';
    if (status === 'TIGHT') return 'badge-tight';
    return 'badge-danger';
  }

  // ==========================================================================
  // VIEW RENDERERS
  // ==========================================================================
  render() {
    const container = document.getElementById('viewContainer');
    if (!container) return;

    // Destroy prior Chart.js instances to avoid canvas reuse memory leaks
    Object.values(this.charts).forEach((c) => c?.destroy && c.destroy());
    this.charts = {};

    switch (this.currentTab) {
      case 'dashboard':
        if (this.currentRole === 'admin') this.renderAdminDashboard(container);
        else if (this.currentRole === 'campus_manager') this.renderCampusManagerDashboard(container);
        else if (this.currentRole === 'faculty') this.renderFacultyDashboard(container);
        else this.renderStudentDashboard(container);
        break;
      case 'subjects':
        this.renderSubjectsView(container);
        break;
      case 'timetable':
        this.renderTimetableView(container);
        break;
      case 'exams':
        this.renderExamReadinessView(container);
        break;
      case 'auditor':
        this.renderAuditorView(container);
        break;
      default:
        this.renderAdminDashboard(container);
    }
  }

  // 1. ADMIN / PROGRAM MANAGER DASHBOARD
  renderAdminDashboard(container) {
    const calculatedSubjects = this.state.subjects.map((s) =>
      CalculationEngine.calculateSubject(s, this.state.semester, this.state.timetables)
    );

    const programRollup = CalculationEngine.calculateRollup('global', 'Mirai School of Technology', 'CAMPUS', calculatedSubjects);

    // Rollup by Campus
    const campusCardsHtml = this.state.campuses.map((campus) => {
      const campusSubs = calculatedSubjects.filter((s) => s.campusName === campus.name);
      const rollup = CalculationEngine.calculateRollup(campus.id, campus.name, 'CAMPUS', campusSubs);
      return `
        <div class="card">
          <div class="stat-header">
            <span class="stat-label">${campus.name} Campus</span>
            <span class="badge ${this.getStatusBadgeClass(rollup.worstStatus)}">${rollup.worstStatus}</span>
          </div>
          <div class="stat-value">${rollup.averageCoverage}%</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill fill-${rollup.worstStatus === 'DANGER' ? 'red' : 'green'}" style="width: ${rollup.averageCoverage}%"></div>
          </div>
          <div class="stat-footer">
            <span>Bottleneck: <strong>${rollup.bottleneckSubject ? rollup.bottleneckSubject.name : 'None'}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Program-Wide Attention Banner (Worst-Subject Rule) -->
      ${programRollup.worstStatus === 'DANGER' ? `
        <div class="alert-banner">
          <div class="alert-banner-content">
            <div class="alert-icon-wrap">!</div>
            <div>
              <div class="alert-title">Worst-Subject Alert: Bottleneck Identified</div>
              <div class="alert-desc">
                Program health reflects the worst-performing subject: <strong>${programRollup.bottleneckSubject.name}</strong> 
                (Buffer: <strong>${programRollup.bottleneckSubject.bufferRatio}×</strong> &lt; 1.00 Danger).
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.openExplainModal('${programRollup.bottleneckSubject.subjectId}')">Audit Breakdown</button>
        </div>
      ` : ''}

      <!-- Top Stats Row -->
      <div class="grid-4">
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">Program Coverage</span><span class="stat-icon">◉</span></div>
          <div class="stat-value">${programRollup.averageCoverage}%</div>
          <div class="stat-footer"><span>Syllabus completed across 4 campuses</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">Worst Subject Ratio</span><span class="stat-icon">⚠</span></div>
          <div class="stat-value" style="color: var(--color-danger);">${programRollup.bottleneckSubject.bufferRatio}×</div>
          <div class="stat-footer"><span>${programRollup.bottleneckSubject.code} (${programRollup.bottleneckSubject.name})</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">Active Campuses</span><span class="stat-icon">🏛</span></div>
          <div class="stat-value">4 / 4</div>
          <div class="stat-footer"><span>HI-Tech, Ratnam, RGIB, JUJ</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">Next Exam Window</span><span class="stat-icon">🎯</span></div>
          <div class="stat-value">Oct 27</div>
          <div class="stat-footer"><span>Mid-Semester Exams (All Batches)</span></div>
        </div>
      </div>

      <!-- Campus Grid -->
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 0.85rem; color: var(--color-navy);">Campus Health Roll-Ups (Worst Subject Rule)</h3>
      <div class="grid-4" style="margin-bottom: 1.5rem;">
        ${campusCardsHtml}
      </div>

      <!-- Main Two Column Grid: Table + Chart -->
      <div class="grid-2">
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1rem; font-weight: 800;">Curriculum Delivery Progress by Subject</h3>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Real-Time Buffer Evaluation</span>
          </div>
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Coverage</th>
                  <th>Available / Remaining</th>
                  <th>Buffer</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${calculatedSubjects.map((s) => `
                  <tr>
                    <td>
                      <div class="subject-name-cell">
                        <span class="subject-color-dot" style="background: ${s.color};"></span>
                        <div>
                          <strong>${s.name}</strong>
                          <div style="font-size: 0.72rem; color: var(--color-text-muted);">${s.code} • ${s.facultyName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div><strong>${s.coveragePercentage}%</strong></div>
                      <div class="progress-bar-wrap" style="width: 80px;">
                        <div class="progress-bar-fill fill-${s.status === 'DANGER' ? 'red' : 'green'}" style="width: ${s.coveragePercentage}%"></div>
                      </div>
                    </td>
                    <td><strong>${s.availableHours}h</strong> / ${s.remainingHours}h</td>
                    <td><strong style="font-family: var(--font-mono);">${s.bufferRatio}×</strong></td>
                    <td><span class="badge ${this.getStatusBadgeClass(s.status)}">${s.status}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="app.openExplainModal('${s.subjectId}')">Explain</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Visual Analytics Chart -->
        <div class="card">
          <h3 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.85rem;">Buffer Ratio Comparison</h3>
          <canvas id="bufferChart" height="260"></canvas>
        </div>
      </div>
    `;

    // Render Chart.js
    setTimeout(() => {
      const ctx = document.getElementById('bufferChart');
      if (ctx) {
        this.charts.bufferChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: calculatedSubjects.map((s) => s.code),
            datasets: [{
              label: 'Buffer Ratio (x)',
              data: calculatedSubjects.map((s) => s.bufferRatio),
              backgroundColor: calculatedSubjects.map((s) => s.status === 'DANGER' ? '#ef4444' : (s.status === 'TIGHT' ? '#f59e0b' : '#4361ee')),
              borderRadius: 6,
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Buffer Ratio: ${ctx.parsed.y}x`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }
    }, 50);
  }

  // 2. CAMPUS MANAGER DASHBOARD
  renderCampusManagerDashboard(container) {
    const campusSubjects = this.state.subjects.filter((s) => s.campusId === 'camp-hitech');
    const calculated = campusSubjects.map((s) =>
      CalculationEngine.calculateSubject(s, this.state.semester, this.state.timetables)
    );
    const rollup = CalculationEngine.calculateRollup('camp-hitech', 'HI-Tech Campus', 'CAMPUS', calculated);

    container.innerHTML = `
      <!-- Escalation Alerts Box (48h unlogged classes) -->
      <div class="alert-banner">
        <div class="alert-banner-content">
          <div class="alert-icon-wrap">⚡</div>
          <div>
            <div class="alert-title">48-Hour Unlogged Session Escalation</div>
            <div class="alert-desc">
              1 session for <strong>Computer Networks</strong> conducted yesterday has not been verified. Automated reminder dispatched to Prof. Rajesh Sharma.
            </div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="app.showToast('Escalation reminder resent.')">Resend Reminder</button>
      </div>

      <!-- Campus KPI row -->
      <div class="grid-3">
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">HI-Tech Campus Health</span><span class="badge ${this.getStatusBadgeClass(rollup.worstStatus)}">${rollup.worstStatus}</span></div>
          <div class="stat-value">${rollup.averageCoverage}%</div>
          <div class="stat-footer"><span>Worst subject: ${rollup.bottleneckSubject ? rollup.bottleneckSubject.name : 'None'}</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">Scheduled Weekly Hours</span><span class="stat-icon">📅</span></div>
          <div class="stat-value">26.5 hrs</div>
          <div class="stat-footer"><span>Distributed across Mon-Sat timetable</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-header"><span class="stat-label">Saturday Policy</span><span class="stat-icon">⚙</span></div>
          <div class="stat-value" style="font-size: 1.15rem; font-family: inherit;">2nd & 4th Off</div>
          <div class="stat-footer"><span>Working on 1st, 3rd, 5th Saturdays</span></div>
        </div>
      </div>

      <!-- Campus Subjects Table -->
      <div class="card">
        <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 1rem;">Campus Subjects & Early Warnings</h3>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Faculty</th>
                <th>Syllabus Coverage</th>
                <th>Target Finish</th>
                <th>Buffer Ratio</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${calculated.map((s) => `
                <tr>
                  <td><strong>${s.code}</strong> • ${s.name}</td>
                  <td>${s.facultyName}</td>
                  <td>${s.coveragePercentage}% (${s.coveredHours} / ${s.hoursInScope} hrs)</td>
                  <td>${s.targetFinishDate}</td>
                  <td><strong style="font-family: var(--font-mono);">${s.bufferRatio}×</strong></td>
                  <td><span class="badge ${this.getStatusBadgeClass(s.status)}">${s.status}</span></td>
                  <td><button class="btn btn-secondary btn-sm" onclick="app.openExplainModal('${s.subjectId}')">Explain</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. FACULTY MOBILE-FIRST LOGGING DASHBOARD
  renderFacultyDashboard(container) {
    const facultyId = this.state.users.faculty.id;
    const mySubjects = this.state.subjects.filter((s) => s.facultyId === facultyId);
    const calculated = mySubjects.map((s) =>
      CalculationEngine.calculateSubject(s, this.state.semester, this.state.timetables)
    );

    // Filter today's timetable sessions (e.g. Monday slots)
    const todaySlots = this.state.timetables.filter((t) => t.facultyId === facultyId && t.dayOfWeek === 'Monday');

    container.innerHTML = `
      <!-- Heading & Quick Action -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-navy);">Today's Teaching Schedule</h2>
          <p style="font-size: 0.82rem; color: var(--color-text-secondary);">Single-tap logging pre-filled from your academic timetable.</p>
        </div>
        <button class="btn btn-primary" onclick="app.openQuickLogModal()">
          <span>＋</span> Log Next Session
        </button>
      </div>

      <!-- Today's Schedule Card Deck (<60s touch triggers) -->
      <div class="session-deck">
        ${todaySlots.map((slot) => {
          const sub = this.state.subjects.find((s) => s.id === slot.subjectId);
          const nextTopic = sub?.topics.find((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
          return `
            <div class="session-deck-card">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="subject-code-tag">${sub.code}</span>
                  <strong style="font-size: 1rem; color: var(--color-navy);">${sub.name}</strong>
                </div>
                <div class="session-meta-line">
                  <span>⏰ ${slot.startTime} - ${slot.endTime}</span>
                  <span>📍 ${slot.room}</span>
                  <span>👥 BTech CSE (AI/ML)</span>
                </div>
                ${nextTopic ? `<div class="next-topic-pill">🎯 Next: ${nextTopic.name} (${nextTopic.plannedHours}h)</div>` : ''}
              </div>
              <button class="btn btn-primary btn-sm" onclick="app.openQuickLogModal('${slot.id}')">
                Log Now →
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Assigned Subjects Progress -->
      <h3 style="font-size: 1.1rem; font-weight: 800; margin: 1.5rem 0 0.85rem; color: var(--color-navy);">My Assigned Subjects & Buffer Ratios</h3>
      <div class="grid-3">
        ${calculated.map((s) => `
          <div class="card">
            <div class="stat-header">
              <span class="stat-label">${s.code}</span>
              <span class="badge ${this.getStatusBadgeClass(s.status)}">${s.status}</span>
            </div>
            <strong style="font-size: 1.05rem; display: block; margin-bottom: 0.4rem; color: var(--color-navy);">${s.name}</strong>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-bottom: 0.4rem;">
              Coverage: <strong>${s.coveredHours}</strong> / ${s.hoursInScope} hrs (${s.coveragePercentage}%)
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill fill-${s.status === 'DANGER' ? 'red' : 'green'}" style="width: ${s.coveragePercentage}%"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.65rem; font-size: 0.78rem;">
              <span>Buffer: <strong>${s.bufferRatio}×</strong></span>
              <button class="btn btn-secondary btn-sm" onclick="app.openExplainModal('${s.subjectId}')">Explain</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 4. STUDENT DASHBOARD (Read-Only)
  renderStudentDashboard(container) {
    const batchSubjects = this.state.subjects.filter((s) => s.batchId === 'batch-hitech-mirai');
    const calculated = batchSubjects.map((s) =>
      CalculationEngine.calculateSubject(s, this.state.semester, this.state.timetables)
    );

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <span class="modal-eyebrow">STUDENT PORTAL · READ-ONLY</span>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-navy);">BTech CSE (AI/ML) · Semester 5 Progress</h2>
        <p style="font-size: 0.82rem; color: var(--color-text-secondary);">Real-time syllabus completion roadmap and upcoming exam scopes.</p>
      </div>

      <!-- Upcoming Exam Windows -->
      <div class="grid-2" style="margin-bottom: 1.5rem;">
        <div class="card" style="background: var(--color-navy); color: #fff;">
          <div style="font-size: 0.72rem; font-weight: 800; color: var(--color-accent); letter-spacing: 0.05em;">UPCOMING EXAMINATION</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.35rem 0;">Mid-Semester Examinations</h3>
          <p style="font-size: 0.82rem; color: rgba(255,255,255,0.75);">October 27 – November 03, 2026 • In-Scope: Units 1 & 2 for all subjects.</p>
          <div style="margin-top: 0.85rem; font-size: 0.82rem; font-weight: 700; color: #fff;">
            ⏳ 8 calendar days remaining
          </div>
        </div>

        <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-accent-border);">
          <div style="font-size: 0.72rem; font-weight: 800; color: var(--color-text-muted); letter-spacing: 0.05em;">FINAL EXAMINATIONS</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.35rem 0; color: var(--color-navy);">End-Semester Finals</h3>
          <p style="font-size: 0.82rem; color: var(--color-text-secondary);">December 10 – December 20, 2026 • Full Semester Syllabus.</p>
          <div style="margin-top: 0.85rem; font-size: 0.82rem; font-weight: 700; color: var(--color-accent);">
            ⏳ 52 calendar days remaining
          </div>
        </div>
      </div>

      <!-- Subjects Roadmap -->
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 0.85rem; color: var(--color-navy);">Subject Completion Roadmap</h3>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Name</th>
              <th>Faculty</th>
              <th>Syllabus Covered</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${calculated.map((s) => `
              <tr>
                <td><span class="subject-code-tag">${s.code}</span></td>
                <td><strong>${s.name}</strong></td>
                <td>${s.facultyName}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="progress-bar-wrap" style="width: 120px;">
                      <div class="progress-bar-fill fill-${s.status === 'DANGER' ? 'red' : 'green'}" style="width: ${s.coveragePercentage}%"></div>
                    </div>
                    <span><strong>${s.coveragePercentage}%</strong></span>
                  </div>
                </td>
                <td><span class="badge ${this.getStatusBadgeClass(s.status)}">${s.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // 5. SUBJECTS & SYLLABUS DETAIL VIEW
  renderSubjectsView(container) {
    const calculated = this.state.subjects.map((s) =>
      CalculationEngine.calculateSubject(s, this.state.semester, this.state.timetables)
    );

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-navy);">Subjects & Lesson Plans</h2>
          <p style="font-size: 0.82rem; color: var(--color-text-secondary);">Unit breakdown, topic planned hours, and exam scope flags.</p>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${this.state.subjects.map((sub) => {
          const metrics = calculated.find((c) => c.subjectId === sub.id);
          return `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <span class="subject-color-dot" style="background: ${sub.color}; width: 14px; height: 14px;"></span>
                  <div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-navy);">${sub.code} • ${sub.name}</h3>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                      Faculty: ${sub.facultyName} • Campus: ${sub.campusName} • Target: ${sub.targetFinishDate}
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="badge ${this.getStatusBadgeClass(metrics.status)}">${metrics.status}</span>
                  <button class="btn btn-secondary btn-sm" onclick="app.openExplainModal('${sub.id}')">Audit Formula</button>
                </div>
              </div>

              <!-- Topic List Accordion -->
              <div class="table-responsive">
                <table class="custom-table">
                  <thead>
                    <tr>
                      <th style="width: 60px;">Seq</th>
                      <th>Unit</th>
                      <th>Topic Name</th>
                      <th>Planned</th>
                      <th>Exam Scope</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sub.topics.map((t) => `
                      <tr>
                        <td>#${t.sequence}</td>
                        <td><span style="font-weight: 700; color: var(--color-navy);">${t.unit}</span></td>
                        <td><strong>${t.name}</strong></td>
                        <td>${t.plannedHours} hrs</td>
                        <td><code style="font-size: 0.72rem; background: var(--color-surface-subtle); padding: 0.15rem 0.35rem; border-radius: 4px;">${t.examScope}</code></td>
                        <td>
                          <span style="font-size: 0.78rem; font-weight: 700; color: ${t.status === 'COMPLETED' ? 'var(--color-success)' : (t.status === 'IN_PROGRESS' ? 'var(--color-accent)' : 'var(--color-text-muted)')};">
                            ${t.status === 'COMPLETED' ? '✓ Completed' : (t.status === 'IN_PROGRESS' ? `In Progress (${t.percentageComplete}%)` : 'Pending')}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 6. TIMETABLE VIEW
  renderTimetableView(container) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-navy);">Weekly Timetable Schedule</h2>
        <p style="font-size: 0.82rem; color: var(--color-text-secondary);">Interactive weekly grid across Monday to Saturday.</p>
      </div>

      <div class="grid-3">
        ${days.map((day) => {
          const slots = this.state.timetables.filter((t) => t.dayOfWeek === day);
          return `
            <div class="card" style="padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
                <strong style="color: var(--color-navy); font-size: 0.95rem;">${day}</strong>
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">${slots.length} Classes</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${slots.map((s) => {
                  const sub = this.state.subjects.find((item) => item.id === s.subjectId);
                  return `
                    <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-left: 4px solid ${sub?.color || '#4361ee'}; border-radius: 6px; padding: 0.65rem 0.75rem;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 0.82rem; color: var(--color-navy);">${sub?.code}</strong>
                        <span style="font-size: 0.72rem; font-weight: 700; color: var(--color-text-secondary);">${s.startTime} - ${s.endTime}</span>
                      </div>
                      <div style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-primary); margin: 0.15rem 0;">${sub?.name}</div>
                      <div style="font-size: 0.72rem; color: var(--color-text-muted);">📍 ${s.room}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 7. EXAM READINESS VIEW
  renderExamReadinessView(container) {
    const examMid = this.state.exams[0];
    const examFinal = this.state.exams[1];

    const midReadiness = this.state.subjects.map((s) =>
      CalculationEngine.calculateExamReadiness(s, examMid, this.state.semester, this.state.timetables)
    );

    const finalReadiness = this.state.subjects.map((s) =>
      CalculationEngine.calculateExamReadiness(s, examFinal, this.state.semester, this.state.timetables)
    );

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-navy);">Exam Readiness & Early Warnings</h2>
        <p style="font-size: 0.82rem; color: var(--color-text-secondary);">Tracking syllabus completion strictly against scheduled exam windows.</p>
      </div>

      <!-- Mid-Sem Exam Section -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-navy);">${examMid.displayName}</h3>
            <span style="font-size: 0.78rem; color: var(--color-text-muted);">Commencing ${examMid.startDate} • <strong>${midReadiness[0].daysAway} calendar days away</strong></span>
          </div>
          <span class="badge badge-on-track">Target Window</span>
        </div>

        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>In-Scope Topics</th>
                <th>Required Hours</th>
                <th>Covered So Far</th>
                <th>Available Before Exam</th>
                <th>Exam Status</th>
              </tr>
            </thead>
            <tbody>
              ${midReadiness.map((r, i) => {
                const sub = this.state.subjects[i];
                return `
                  <tr>
                    <td><strong>${sub.code}</strong> • ${sub.name}</td>
                    <td>${r.inScopeTopicsCount} topics</td>
                    <td>${r.inScopePlannedHours} hrs</td>
                    <td>${r.coveredHours} hrs (${r.coveragePercentage}%)</td>
                    <td><strong>${r.availableHoursBeforeExam} hrs</strong> available</td>
                    <td><span class="badge ${this.getStatusBadgeClass(r.status)}">${r.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. CALCULATION AUDITOR
  renderAuditorView(container) {
    const subjects = this.state.subjects;
    const firstSubject = subjects[0];
    const res = CalculationEngine.calculateSubject(firstSubject, this.state.semester, this.state.timetables);

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-navy);">Interactive Calculation Auditor</h2>
        <p style="font-size: 0.82rem; color: var(--color-text-secondary);">Select any course to inspect its step-by-step mathematical progress derivation.</p>
      </div>

      <div class="card" style="max-width: 760px; margin: 0 auto;">
        <div class="form-group" style="margin-bottom: 1.25rem;">
          <label class="field-label">Select Subject to Audit:</label>
          <select class="form-input" onchange="app.auditSubjectChange(this.value)">
            ${subjects.map((s) => `<option value="${s.id}">${s.code} • ${s.name} (${s.facultyName})</option>`).join('')}
          </select>
        </div>

        <div id="auditorResultBox">
          <div class="derivation-box">
            <h4 style="margin-bottom: 0.75rem; color: var(--color-navy); font-weight: 800;">Mathematical Breakdown for ${res.code}</h4>
            <div class="derivation-row">
              <span>Planned Hours in Scope</span>
              <span class="derivation-val">${res.hoursInScope} hrs</span>
            </div>
            <div class="derivation-row">
              <span>Covered Hours to Date</span>
              <span class="derivation-val" style="color: var(--color-success);">${res.coveredHours} hrs (${res.coveragePercentage}%)</span>
            </div>
            <div class="derivation-row">
              <span>Remaining Syllabus Hours</span>
              <span class="derivation-val">${res.remainingHours} hrs</span>
            </div>
            <div class="derivation-row">
              <span>Available Calendar Hours (working days to ${res.targetFinishDate})</span>
              <span class="derivation-val">${res.availableHours} hrs</span>
            </div>
            <div class="derivation-row" style="background: rgba(67, 97, 238, 0.08); padding: 0.75rem; border-radius: 6px; margin: 0.5rem 0;">
              <strong style="color: var(--color-accent);">Buffer Ratio = Available Hours ÷ Remaining Hours</strong>
              <span class="derivation-val" style="font-size: 1.05rem; color: var(--color-accent);">${res.bufferRatio}×</span>
            </div>
            <div class="derivation-row">
              <span>Status Tier Result</span>
              <span><span class="badge ${this.getStatusBadgeClass(res.status)}">${res.status}</span></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  auditSubjectChange(subjectId) {
    const sub = this.state.subjects.find((s) => s.id === subjectId);
    if (!sub) return;

    const res = CalculationEngine.calculateSubject(sub, this.state.semester, this.state.timetables);
    const box = document.getElementById('auditorResultBox');
    if (box) {
      box.innerHTML = `
        <div class="derivation-box">
          <h4 style="margin-bottom: 0.75rem; color: var(--color-navy); font-weight: 800;">Mathematical Breakdown for ${res.code}</h4>
          <div class="derivation-row">
            <span>Planned Hours in Scope</span>
            <span class="derivation-val">${res.hoursInScope} hrs</span>
          </div>
          <div class="derivation-row">
            <span>Covered Hours to Date</span>
            <span class="derivation-val" style="color: var(--color-success);">${res.coveredHours} hrs (${res.coveragePercentage}%)</span>
          </div>
          <div class="derivation-row">
            <span>Remaining Syllabus Hours</span>
            <span class="derivation-val">${res.remainingHours} hrs</span>
          </div>
          <div class="derivation-row">
            <span>Available Calendar Hours (working days to ${res.targetFinishDate})</span>
            <span class="derivation-val">${res.availableHours} hrs</span>
          </div>
          <div class="derivation-row" style="background: rgba(67, 97, 238, 0.08); padding: 0.75rem; border-radius: 6px; margin: 0.5rem 0;">
            <strong style="color: var(--color-accent);">Buffer Ratio = Available Hours ÷ Remaining Hours</strong>
            <span class="derivation-val" style="font-size: 1.05rem; color: var(--color-accent);">${res.bufferRatio}×</span>
          </div>
          <div class="derivation-row">
            <span>Status Tier Result</span>
            <span><span class="badge ${this.getStatusBadgeClass(res.status)}">${res.status}</span></span>
          </div>
        </div>
      `;
    }
  }

  showProfileMenu() {
    this.toggleProfileDropdown();
  }

  toggleProfileDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const menu = document.getElementById('profileDropdownMenu');
    if (!menu) return;

    const isActive = menu.classList.contains('active');
    if (!isActive) {
      // Refresh current user info in dropdown
      const user = this.auth.user || this.state.users[this.currentRole];
      const nameEl = document.getElementById('profileDropName');
      const phoneEl = document.getElementById('profileDropPhone');
      const emailEl = document.getElementById('profileDropEmail');
      const avatarEl = document.getElementById('profileDropAvatar');
      const selectEl = document.getElementById('profileRoleSelect');

      if (nameEl) nameEl.textContent = user.name;
      if (phoneEl) phoneEl.textContent = user.phone ? `📱 +91 ${user.phone}` : '📱 Registered Mobile';
      if (emailEl) emailEl.textContent = user.email ? `✉️ ${user.email}` : '✉️ Institutional Email';
      if (avatarEl) avatarEl.textContent = user.initials || user.name.slice(0, 2).toUpperCase();
      if (selectEl) selectEl.value = (user.role || this.currentRole).toLowerCase();

      menu.classList.add('active');
    } else {
      menu.classList.remove('active');
    }
  }

  updateNavAuthState() {
    const isAuth = Boolean(this.auth.token);
    document.body.classList.toggle('is-authenticated', isAuth);

    const user = this.auth.user || this.state.users[this.currentRole];
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const badge = document.getElementById('userRoleBadge');

    if (avatar) avatar.textContent = user.initials || (user.name ? user.name.slice(0, 2).toUpperCase() : 'MU');
    if (name) name.textContent = user.name;
    if (badge) badge.textContent = (user.roleDisplay || user.role || this.currentRole).replace('_', ' ');

    // Hide or show action buttons
    const quickLogBtn = document.getElementById('quickLogBtn');
    if (quickLogBtn) {
      const role = (user.role || this.currentRole).toLowerCase();
      quickLogBtn.style.display = (isAuth && (role === 'faculty' || role === 'admin')) ? 'inline-flex' : 'none';
    }
  }

  // ========================================================================
  // MOBILE NUMBER + OTP AUTHENTICATION & GOOGLE OAUTH MODULE
  // ========================================================================

  initAuth() {
    // Digit boxes keyboard interaction
    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach((box, idx) => {
      box.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';
        if (e.target.value) {
          e.target.classList.add('filled');
          if (idx < boxes.length - 1) {
            boxes[idx + 1].focus();
            boxes[idx + 1].select();
          } else {
            document.getElementById('btnVerifyOtp')?.focus();
          }
        } else {
          e.target.classList.remove('filled');
        }
      });

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
          boxes[idx - 1].focus();
          boxes[idx - 1].value = '';
          boxes[idx - 1].classList.remove('filled');
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          boxes[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      });

      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text') || '';
        const digits = text.replace(/\D/g, '').slice(0, 6);
        if (digits) {
          for (let i = 0; i < 6; i++) {
            if (boxes[i]) {
              boxes[i].value = digits[i] || '';
              if (digits[i]) boxes[i].classList.add('filled');
              else boxes[i].classList.remove('filled');
            }
          }
          if (digits.length === 6) {
            document.getElementById('btnVerifyOtp')?.focus();
          } else if (boxes[digits.length]) {
            boxes[digits.length].focus();
          }
        }
      });
    });

    // Close profile dropdown on outside click
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('userChipWrap');
      if (wrap && !wrap.contains(e.target)) {
        document.getElementById('profileDropdownMenu')?.classList.remove('active');
      }
    });

    // Initialize Google Identity Services
    this.initGoogleAuth();

    // Check saved session
    if (this.auth.user && this.auth.user.role) {
      this.switchRole(this.auth.user.role.toLowerCase());
    } else {
      this.updateNavAuthState();
    }
  }

  initGoogleAuth() {
    const clientId = this.auth.googleClientId;

    const setupGsi = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (res) => this.handleGoogleCredential(res),
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const slot = document.getElementById('googleGsiButton');
          if (slot) {
            window.google.accounts.id.renderButton(slot, {
              theme: 'outline',
              size: 'large',
              width: 380,
              text: 'continue_with',
              shape: 'rectangular',
            });
          }
        } catch (err) {
          console.warn('Google GSI button notice:', err);
        }
      }
    };

    if (window.google && window.google.accounts) {
      setupGsi();
    } else {
      window.addEventListener('load', setupGsi);
      setTimeout(setupGsi, 1200);
    }
  }

  signInWithGoogle() {
    // If official Google prompt is ready, trigger it
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            this.showGoogleSimulatedPicker();
          }
        });
        return;
      } catch {
        // Fallback to simulated account selection
      }
    }
    this.showGoogleSimulatedPicker();
  }

  showGoogleSimulatedPicker() {
    // Elegant fallback simulated Google Account chooser for offline / non-SSL environments
    const mockGoogleEmails = [
      { name: 'Prof. Rajesh Sharma', email: 'faculty.sharma@mirai.edu' },
      { name: 'Dr. Suresh Varma', email: 'admin@mirai.edu' },
      { name: 'Priya Nair', email: 'manager.hitech@mirai.edu' },
      { name: 'Aarav Mehta', email: 'student.aarav@mirai.edu' },
    ];

    const chosen = prompt(
      'Google Sign-In (Optional Email):\nEnter Google email (or click OK for default):',
      mockGoogleEmails[0].email
    );

    if (chosen) {
      const match = mockGoogleEmails.find((m) => m.email.toLowerCase() === chosen.trim().toLowerCase()) || {
        name: chosen.split('@')[0],
        email: chosen.trim(),
      };

      this.handleGoogleCredential({
        simulated: true,
        email: match.email,
        name: match.name,
      });
    }
  }

  handleGoogleCredential(response) {
    let email = response.email;
    let name = response.name;
    let picture = response.picture;

    if (response.credential && typeof response.credential === 'string') {
      try {
        const parts = response.credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          email = payload.email || email;
          name = payload.name || name;
          picture = payload.picture || picture;
        }
      } catch (e) {
        console.warn('Failed to parse Google JWT credential', e);
      }
    }

    if (!email) {
      this.showToast('Could not retrieve Google account details.', 'error');
      return;
    }

    this.auth.googleProfile = { email, name, picture };

    // Update UI linked badge
    const statusBox = document.getElementById('googleLinkedStatus');
    const textEl = document.getElementById('googleLinkedEmailText');
    const customBtn = document.getElementById('customGoogleBtn');

    if (textEl) textEl.textContent = email;
    if (statusBox) statusBox.style.display = 'flex';
    if (customBtn) customBtn.style.display = 'none';

    // REMIND USER: Number login is compulsory
    const phoneInput = document.getElementById('phoneInput');
    const rawVal = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';

    if (!rawVal || rawVal.length !== 10) {
      this.showToast(`Google account linked (${email})! Mobile number is compulsory — please enter your 10-digit number.`, 'info');
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.parentElement.style.animation = 'shake 0.4s ease';
        setTimeout(() => (phoneInput.parentElement.style.animation = ''), 400);
      }
    } else {
      this.showToast(`Google account linked (${email}). Click "Get OTP" to verify your compulsory mobile number.`, 'info');
      document.getElementById('btnGetOtp')?.focus();
    }
  }

  unlinkGoogle() {
    this.auth.googleProfile = null;
    const statusBox = document.getElementById('googleLinkedStatus');
    const customBtn = document.getElementById('customGoogleBtn');
    if (statusBox) statusBox.style.display = 'none';
    if (customBtn) customBtn.style.display = 'flex';
    this.showToast('Google account unlinked.');
  }

  openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('active');
      this.editPhoneStep();
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
  }

  fillDemoPhone(phone, roleName) {
    const input = document.getElementById('phoneInput');
    if (input) {
      input.value = phone;
      input.focus();
    }
    this.showToast(`Selected Demo ${roleName} (${phone})`);
  }

  async sendOtp() {
    const input = document.getElementById('phoneInput');
    const btn = document.getElementById('btnGetOtp');
    const rawVal = input ? input.value : '';
    const digitsOnly = rawVal.replace(/\D/g, '');
    const phone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (!phone || phone.length !== 10) {
      this.showToast('Mobile number is compulsory. Please enter a valid 10-digit number.', 'error');
      if (input) {
        input.focus();
        input.parentElement.style.borderColor = '#dc2626';
        setTimeout(() => (input.parentElement.style.borderColor = ''), 1500);
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-text">Sending OTP...</span>`;
    }

    try {
      let data = null;
      try {
        const res = await fetch(`${API_BASE}/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        data = await res.json();
      } catch (e) {
        console.warn('Backend endpoint unavailable, falling back to local mock OTP', e);
        data = { success: true, phone, demoOtp: '123456' };
      }

      if (data && data.success) {
        this.auth.phone = phone;
        this.auth.demoOtp = data.demoOtp || '123456';

        // Switch to Step 2
        const step1 = document.getElementById('authStepPhone');
        const step2 = document.getElementById('authStepOtp');
        const displayPhone = document.getElementById('displayOtpPhone');

        if (displayPhone) displayPhone.textContent = `${phone.slice(0, 5)} ${phone.slice(5)}`;
        if (step1) step1.style.display = 'none';
        if (step2) {
          step2.style.display = 'block';
          step2.classList.add('active');
        }

        // Reset and focus first box
        document.querySelectorAll('.otp-box').forEach((box) => {
          box.value = '';
          box.classList.remove('filled');
        });
        setTimeout(() => document.getElementById('otpBox0')?.focus(), 100);

        this.startResendTimer();
        this.showToast(`Passcode sent! (Demo Mode: Your OTP is ${this.auth.demoOtp})`);
      } else {
        this.showToast(data?.error || 'Failed to send OTP. Try again.', 'error');
      }
    } catch (err) {
      this.showToast('Error communicating with authentication service.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span class="btn-text">Get OTP (Compulsory Mobile Step)</span><span class="btn-arrow">→</span>`;
      }
    }
  }

  autoFillDemoOtp() {
    const demo = '123456';
    for (let i = 0; i < 6; i++) {
      const box = document.getElementById(`otpBox${i}`);
      if (box) {
        box.value = demo[i];
        box.classList.add('filled');
      }
    }
    document.getElementById('btnVerifyOtp')?.focus();
    this.showToast('Auto-filled Demo OTP: 123456');
  }

  getEnteredOtp() {
    let otp = '';
    for (let i = 0; i < 6; i++) {
      const box = document.getElementById(`otpBox${i}`);
      otp += box ? box.value : '';
    }
    return otp.trim();
  }

  async verifyOtp() {
    const enteredOtp = this.getEnteredOtp();
    const btn = document.getElementById('btnVerifyOtp');

    if (!enteredOtp || enteredOtp.length !== 6) {
      this.showToast('Please enter all 6 digits of the OTP.', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-text">Verifying...</span>`;
    }

    try {
      let data = null;
      try {
        const res = await fetch(`${API_BASE}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: this.auth.phone, otp: enteredOtp }),
        });
        data = await res.json();
      } catch (e) {
        console.warn('Backend verify endpoint unavailable, using local mock verification', e);
        if (enteredOtp === '123456') {
          const roleMap = {
            '9876543210': 'admin',
            '9876543211': 'campus_manager',
            '9876543212': 'faculty',
            '9876543213': 'student',
          };
          const role = roleMap[this.auth.phone] || 'faculty';
          const userObj = this.state.users[role] || this.state.users.faculty;
          data = {
            success: true,
            token: 'mock-jwt-token-msot',
            role,
            user: { ...userObj, phone: this.auth.phone, roleDisplay: role.toUpperCase() },
          };
        } else {
          data = { success: false, error: 'Invalid OTP. Please enter 123456.' };
        }
      }

      if (data && data.success) {
        // If Google profile was linked, merge it into session user
        if (this.auth.googleProfile) {
          data.user.email = this.auth.googleProfile.email;
          data.user.googleLinked = true;
          if (this.auth.googleProfile.name) {
            data.user.name = this.auth.googleProfile.name;
          }
        }

        this.auth.token = data.token;
        this.auth.user = data.user;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('msot_auth_token', data.token);
          localStorage.setItem('msot_user', JSON.stringify(data.user));
        }

        const role = (data.role || 'faculty').toLowerCase();
        this.switchRole(role);
        this.updateNavAuthState();
        this.closeAuthModal();

        const googleNote = data.user.googleLinked ? ` (Google: ${data.user.email})` : '';
        this.showToast(`Verified! Welcome ${data.user.name} [${data.user.roleDisplay || role.toUpperCase()}]${googleNote}`);
      } else {
        this.showToast(data?.error || 'Invalid OTP. Please enter 123456.', 'error');
        const container = document.getElementById('otpDigitsContainer');
        if (container) {
          container.style.animation = 'shake 0.4s ease';
          setTimeout(() => (container.style.animation = ''), 400);
        }
      }
    } catch (err) {
      this.showToast('Verification failed. Try again.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span class="btn-text">Verify & Login</span><span class="btn-check">✓</span>`;
      }
    }
  }

  startResendTimer() {
    if (this.auth.resendTimer) clearInterval(this.auth.resendTimer);
    this.auth.resendTimeLeft = 30;
    const timerEl = document.getElementById('resendTimer');
    const btnResend = document.getElementById('btnResendOtp');
    const countdownWrap = document.getElementById('resendCountdownText');

    if (btnResend) btnResend.disabled = true;
    if (countdownWrap) countdownWrap.style.display = 'inline';
    if (timerEl) timerEl.textContent = '30s';

    this.auth.resendTimer = setInterval(() => {
      this.auth.resendTimeLeft--;
      if (timerEl) timerEl.textContent = `${this.auth.resendTimeLeft}s`;

      if (this.auth.resendTimeLeft <= 0) {
        clearInterval(this.auth.resendTimer);
        this.auth.resendTimer = null;
        if (btnResend) btnResend.disabled = false;
        if (countdownWrap) countdownWrap.style.display = 'none';
      }
    }, 1000);
  }

  resendOtp() {
    this.startResendTimer();
    this.showToast(`Passcode resent! (Demo OTP: ${this.auth.demoOtp})`);
  }

  editPhoneStep() {
    const step1 = document.getElementById('authStepPhone');
    const step2 = document.getElementById('authStepOtp');
    if (step2) step2.style.display = 'none';
    if (step1) {
      step1.style.display = 'block';
      step1.classList.add('active');
    }
    setTimeout(() => document.getElementById('phoneInput')?.focus(), 50);
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('msot_auth_token');
      localStorage.removeItem('msot_user');
    }
    this.auth.token = null;
    this.auth.user = null;
    this.auth.googleProfile = null;
    this.updateNavAuthState();
    this.showToast('Logged out of session.');
    this.openAuthModal();
  }
}

// Global App Instance
window.app = new AppStore();

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.checkBackendConnection();
  window.app.initAuth();

  // If saved session exists, switch to saved user; otherwise open auth card
  if (window.app.auth.user && window.app.auth.user.role) {
    window.app.switchRole(window.app.auth.user.role.toLowerCase());
  } else {
    window.app.switchRole('faculty');
    // Open auth card on fresh visit for evaluator testing
    window.app.openAuthModal();
  }
});


