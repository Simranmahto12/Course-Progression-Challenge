import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mirai_msot_progression_super_secret_jwt_key_2026';

describe('RBAC & Security Permission Tests', () => {
  const adminToken = jwt.sign(
    { id: 'admin-1', email: 'admin@mirai.edu.in', role: 'ADMIN', name: 'Admin' },
    JWT_SECRET
  );

  const faculty1Token = jwt.sign(
    { id: 'fac-1', email: 'faculty1@mirai.edu.in', role: 'FACULTY', name: 'Faculty 1', campusId: 'camp-1' },
    JWT_SECRET
  );

  const studentToken = jwt.sign(
    { id: 'stud-1', email: 'student@mirai.edu.in', role: 'STUDENT', name: 'Student 1', batchId: 'batch-1' },
    JWT_SECRET
  );

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/academic/campuses');
    expect(res.status).toBe(401);
  });

  it('prohibits students from creating subjects (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        code: 'CS999',
        name: 'Unauthorized Subject',
        campusId: 'camp-1',
        trackId: 'track-1',
        semesterId: 'sem-1',
        batchId: 'batch-1',
        targetFinishDate: '2026-11-30',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('prohibits students from modifying system settings (403 Forbidden)', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ onTrackThreshold: 2.0 });

    expect(res.status).toBe(403);
  });

  it('allows student read-only dashboard access', async () => {
    const res = await request(app)
      .get('/api/dashboard/student')
      .set('Authorization', `Bearer ${studentToken}`);

    // Since seeded batch exists, this should succeed or return student batch view
    expect([200, 404]).toContain(res.status);
  });

  it('allows admin full access to campuses', async () => {
    const res = await request(app)
      .get('/api/academic/campuses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.campuses)).toBe(true);
  });
});
