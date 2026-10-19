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
});
