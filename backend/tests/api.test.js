import request from 'supertest';
import app from '../src/app.js';
import { db, initDatabase } from '../src/db.js';
import { seedDatabase } from '../src/seed.js';

describe('MSOT Course Progression Platform - SQLite Backend API & Engine Tests', () => {
  let adminToken;
  let facultyToken;
  let studentToken;

  beforeAll(() => {
    // Seed fresh SQLite database before testing
    seedDatabase();
  });

  describe('1. Authentication & RBAC', () => {
    it('authenticates admin and returns JWT with ADMIN role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@mirai.edu', password: 'mirai123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      adminToken = res.body.token;
    });

    it('authenticates faculty member', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'faculty.sharma@mirai.edu', password: 'mirai123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('FACULTY');
      facultyToken = res.body.token;
    });

    it('authenticates student with read-only batch role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student.aarav@mirai.edu', password: 'mirai123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('STUDENT');
      studentToken = res.body.token;
    });

    it('sends demo OTP for valid 10-digit phone number (POST /api/auth/send-otp)', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.demoOtp).toBe('123456');
    });

    it('rejects invalid phone number with 400 (POST /api/auth/send-otp)', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('verifies valid OTP 123456 and returns role (POST /api/auth/verify-otp)', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('mock-jwt-token-msot');
      expect(res.body.role).toBe('admin');
      expect(res.body.user.name).toBe('Dr. Suresh Varma');
    });

    it('rejects incorrect OTP (POST /api/auth/verify-otp)', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('requires compulsory mobile number for Google login (POST /api/auth/google)', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ email: 'prof.sharma@mirai.edu', name: 'Prof. Rajesh Sharma' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresPhone).toBe(true);
    });

    it('authenticates with Google email and compulsory mobile number (POST /api/auth/google)', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          email: 'prof.sharma@mirai.edu',
          name: 'Prof. Rajesh Sharma',
          phone: '9876543212',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresPhone).toBe(false);
      expect(res.body.role).toBe('faculty');
      expect(res.body.user.googleLinked).toBe(true);
    });
  });

  describe('2. Admin Semester Configuration & Calendar Rules', () => {
    it('allows Admin to configure a semester with Saturday rules and holidays (POST /api/admin/semesters)', async () => {
      const res = await request(app)
        .post('/api/admin/semesters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'sem-hitech-fall-2026',
          campus_id: 'camp-hitech',
          start_date: '2026-08-01',
          end_date: '2026-12-20',
          working_saturdays_rule: 'SECOND_FOURTH_SATURDAY',
          holidays_json: [
            { date: '2026-08-15', title: 'Independence Day' },
            { date: '2026-10-02', title: 'Gandhi Jayanti' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Semester configuration saved');
    });

    it('denies non-admin users from creating semester configurations', async () => {
      const res = await request(app)
        .post('/api/admin/semesters')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          campus_id: 'camp-hitech',
          start_date: '2026-08-01',
          end_date: '2026-12-20',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('3. Timetable Setup', () => {
    it('creates weekly timetable entries (POST /api/timetables)', async () => {
      const res = await request(app)
        .post('/api/timetables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          batch_id: 'batch-hitech-mirai',
          subject_id: 'sub-dsa',
          faculty_id: 'usr-fac-sharma',
          day_of_week: 'Thursday',
          start_time: '14:00',
          end_time: '15:30',
          room: 'Room 204',
        });

      expect(res.status).toBe(201);
      expect(res.body.slot).toBeDefined();
    });
  });

  describe('4. Faculty Logging (<60s Flow)', () => {
    it('pre-fills scheduled sessions for today (GET /api/logs/today)', async () => {
      const res = await request(app)
        .get('/api/logs/today')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeInstanceOf(Array);
    });

    it('submits a rapid daily session log (POST /api/logs)', async () => {
      const res = await request(app)
        .post('/api/logs')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          timetable_id: 'tt-mon-1',
          status: 'Completed',
          percentage_complete: 100,
          topics_covered: 'Binary Trees & Traversals',
          leftovers: 'None',
          notes: 'Class completed on schedule.',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('under 60 seconds');
    });
  });

  describe('5. Dashboards & Worst-Subject Rollup Engine', () => {
    it('calculates global dashboard with worst-subject bottleneck (GET /api/dashboards/global)', async () => {
      const res = await request(app)
        .get('/api/dashboards/global')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.programRollup).toBeDefined();
      expect(res.body.campusRollups).toBeInstanceOf(Array);
      expect(res.body.trackRollups).toBeInstanceOf(Array);
      expect(res.body.programRollup.bottleneckSubject).toBeDefined();
    });

    it('returns exam readiness across subjects and upcoming exams (GET /api/dashboards/exam-readiness)', async () => {
      const res = await request(app)
        .get('/api/dashboards/exam-readiness')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.exams).toBeInstanceOf(Array);
      expect(res.body.exams.length).toBeGreaterThan(0);
    });
  });

  describe('6. Student View', () => {
    it('provides student read-only batch view without staff notes (GET /api/dashboard/student)', async () => {
      const res = await request(app)
        .get('/api/dashboard/student')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.subjects).toBeInstanceOf(Array);
      expect(res.body.upcomingExams).toBeInstanceOf(Array);
    });
  });

  describe('7. Timetable Collision Prevention & Overlap Reporting', () => {
    it('prevents overlapping faculty session and returns HTTP 409 conflict', async () => {
      // tt-mon-1 is on Monday 09:00 - 10:30 with usr-fac-sharma
      const res = await request(app)
        .post('/api/timetables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          batch_id: 'batch-hitech-mirai',
          subject_id: 'sub-mirai-web',
          faculty_id: 'usr-fac-sharma', // Same faculty
          day_of_week: 'Monday',        // Same day
          start_time: '09:30',          // Overlaps 09:00 - 10:30
          end_time: '11:00',
          room: 'Room 999',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('collision detected');
      expect(res.body.collisions[0].type).toBe('FACULTY_COLLISION');
    });

    it('prevents overlapping room booking and returns HTTP 409 conflict', async () => {
      // tt-mon-1 is on Monday 09:00 - 10:30 in Lab 101
      const res = await request(app)
        .post('/api/timetables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          batch_id: 'batch-hitech-aktu',
          subject_id: 'sub-aktu-physics',
          faculty_id: 'usr-fac-himanshu',
          day_of_week: 'Monday',
          start_time: '10:00', // Overlaps
          end_time: '11:30',
          room: 'Lab 101',     // Same room
        });

      expect(res.status).toBe(409);
      expect(res.body.collisions.some((c) => c.type === 'ROOM_COLLISION')).toBe(true);
    });
  });

  describe('8. Course Alternatives Configuration & Audit Trail', () => {
    it('switches active course in an alternative group (POST /api/subjects/configure-alternatives)', async () => {
      const res = await request(app)
        .post('/api/subjects/configure-alternatives')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activateSubjectId: 'sub-aktu-chemistry',
          deactivateSubjectId: 'sub-aktu-physics',
          batchId: 'batch-hitech-aktu',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in subjects listing
      const subRes = await request(app)
        .get('/api/subjects?batchId=batch-hitech-aktu&includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      const chem = subRes.body.subjects.find((s) => s.id === 'sub-aktu-chemistry');
      const phys = subRes.body.subjects.find((s) => s.id === 'sub-aktu-physics');
      expect(chem.isActiveForBatch).toBe(true);
      expect(phys.isActiveForBatch).toBe(false);

      // Reset back for subsequent test consistency
      await request(app)
        .post('/api/subjects/configure-alternatives')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activateSubjectId: 'sub-aktu-physics',
          deactivateSubjectId: 'sub-aktu-chemistry',
          batchId: 'batch-hitech-aktu',
        });
    });
  });

  describe('9. Pedagogical Lesson-Plan Architecture & Version History', () => {
    it('retrieves detailed lesson plan for a topic (GET /api/subjects/topics/:id/lesson-plan)', async () => {
      const topicRes = await request(app)
        .get('/api/subjects?batchId=batch-hitech-aktu')
        .set('Authorization', `Bearer ${adminToken}`);

      const subWithTopics = topicRes.body.subjects.find((s) => s.topics && s.topics.length > 0);
      expect(subWithTopics).toBeDefined();
      const firstTopic = subWithTopics.topics[0];
      const res = await request(app)
        .get(`/api/subjects/topics/${firstTopic.id}/lesson-plan`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.topic).toBeDefined();
      expect(res.body.topic.learningOutcomes).toBeDefined();
      expect(res.body.topic.diagnosticQuestion).toBeDefined();
    });

    it('updates lesson plan, archives version, and supports admin review', async () => {
      const topicRes = await request(app)
        .get('/api/subjects?batchId=batch-hitech-aktu')
        .set('Authorization', `Bearer ${adminToken}`);

      const subWithTopics = topicRes.body.subjects.find((s) => s.topics && s.topics.length > 0);
      expect(subWithTopics).toBeDefined();
      const firstTopic = subWithTopics.topics[0];

      // Update lesson plan
      const updateRes = await request(app)
        .put(`/api/subjects/topics/${firstTopic.id}/lesson-plan`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          concept_explanation: 'Updated advanced conceptual explanation with worked example.',
          teaching_method: 'Flipped Classroom & Lab Simulation',
          lesson_plan_status: 'SUBMITTED',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.topic.version).toBeGreaterThan(firstTopic.version);

      // Admin review
      const reviewRes = await request(app)
        .post(`/api/subjects/topics/${firstTopic.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          reviewer_notes: 'Comprehensive lesson plan conforming to AKTU 2026-27 learning outcomes.',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.message).toContain('APPROVED');
    });
  });

  describe('10. Missed-Log Alerts & 48-Hour Escalation', () => {
    it('scans for unlogged sessions and generates alerts (POST /api/alerts/generate-missed-log-alerts)', async () => {
      const res = await request(app)
        .post('/api/alerts/generate-missed-log-alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('acknowledges an alert (POST /api/alerts/:id/acknowledge)', async () => {
      const alertList = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      if (alertList.body.alerts.length > 0) {
        const targetId = alertList.body.alerts[0].id;
        const ackRes = await request(app)
          .post(`/api/alerts/${targetId}/acknowledge`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(ackRes.status).toBe(200);
        expect(ackRes.body.success).toBe(true);
      }
    });
  });
});
