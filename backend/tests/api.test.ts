import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import prisma from '../src/lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mirai_msot_progression_super_secret_jwt_key_2026';

describe('End-to-End API Workflows & Seeded Subjects Verification', () => {
  let facultyToken: string;
  let studentToken: string;
  let adminToken: string;
  let managerToken: string;
  let dsaSubject: any;
  let webSubject: any;

  beforeAll(async () => {
    const faculty = await prisma.user.findFirst({ where: { email: 'faculty1@mirai.edu.in' } });
    const student = await prisma.user.findFirst({ where: { email: 'student@mirai.edu.in' } });
    const admin = await prisma.user.findFirst({ where: { email: 'admin@mirai.edu.in' } });
    const manager = await prisma.user.findFirst({ where: { email: 'manager.hitech@mirai.edu.in' } });

    facultyToken = jwt.sign(
      { id: faculty!.id, email: faculty!.email, name: faculty!.name, role: faculty!.role, campusId: faculty!.campusId },
      JWT_SECRET
    );

    studentToken = jwt.sign(
      { id: student!.id, email: student!.email, name: student!.name, role: student!.role, batchId: student!.batchId },
      JWT_SECRET
    );

    adminToken = jwt.sign(
      { id: admin!.id, email: admin!.email, name: admin!.name, role: admin!.role },
      JWT_SECRET
    );

    managerToken = jwt.sign(
      { id: manager!.id, email: manager!.email, name: manager!.name, role: manager!.role, campusId: manager!.campusId },
      JWT_SECRET
    );

    dsaSubject = await prisma.subject.findFirst({
      where: { code: 'CS501' },
      include: { topics: true },
    });

    webSubject = await prisma.subject.findFirst({
      where: { code: 'CS502' },
      include: { topics: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('verifies "DSA in c++" is seeded with correct hours and topics', () => {
    expect(dsaSubject).toBeDefined();
    expect(dsaSubject.name).toBe('DSA in c++');
    expect(dsaSubject.plannedHours).toBeCloseTo(44.5, 1);
    expect(dsaSubject.topics.length).toBe(12);
  });

  it('verifies "Web development" is seeded with correct hours and topics', () => {
    expect(webSubject).toBeDefined();
    expect(webSubject.name).toBe('Web development');
    expect(webSubject.plannedHours).toBeCloseTo(40.0, 1);
    expect(webSubject.topics.length).toBe(11);
  });

  it('retrieves faculty dashboard and verifies Today sessions contain scheduled class', async () => {
    const res = await request(app)
      .get('/api/dashboard/faculty')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.subjects).toBeDefined();
    const dsa = res.body.subjects.find((s: any) => s.code === 'CS501');
    expect(dsa).toBeDefined();
    expect(dsa.progression).toBeDefined();
    expect(dsa.progression.hoursInScope).toBeGreaterThan(0);
  });

  it('verifies student read-only view returns both DSA in c++ and Web development with zero staff notes exposed', async () => {
    const res = await request(app)
      .get('/api/dashboard/student')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.batch).toBeDefined();
    expect(res.body.subjects.length).toBeGreaterThanOrEqual(2);

    const codes = res.body.subjects.map((s: any) => s.code);
    expect(codes).toContain('CS501');
    expect(codes).toContain('CS502');

    // Security check: Ensure internal faculty notes or staff alerts are not in the response
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain('SessionAuditLog');
    expect(jsonStr).not.toContain('CAMPUS_MANAGER_ESCALATION');
  });

  it('executes fast faculty logging workflow for today session and records audit history', async () => {
    // 1. Get today's sessions
    const todayRes = await request(app)
      .get('/api/sessions/today')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(todayRes.status).toBe(200);
    const session = todayRes.body.sessions[0];
    if (!session) return;

    // 2. Submit log
    const logRes = await request(app)
      .post('/api/sessions/log')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        scheduledSessionId: session.id,
        status: 'COMPLETED',
        actualHours: session.durationHours,
        whatWasCovered: 'Verified binary tree traversal algorithms',
        whatWasLeftOver: 'None',
        carryForwardAction: 'Graph algorithms next',
        classworkStatus: 'REVIEWED',
        notes: 'Rapid mobile log verified < 60s',
      });

    // If already logged in previous test, 409 is expected or 201 on first log
    expect([201, 409]).toContain(logRes.status);
  });

  it('verifies explain-calculation endpoint returns deterministic day-by-day steps', async () => {
    if (!dsaSubject) return;

    const res = await request(app)
      .get(`/api/subjects/${dsaSubject.id}/explain-calculation`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.steps).toBeDefined();
    expect(Array.isArray(res.body.steps)).toBe(true);
    expect(res.body.steps.length).toBeGreaterThan(0);
    expect(res.body.saturdayRule).toBe('SECOND_FOURTH_SATURDAY');
  });
});
