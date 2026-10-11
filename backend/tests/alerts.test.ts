import prisma from '../src/lib/prisma.js';
import { AlertEngine } from '../src/services/alertEngine.js';

describe('AlertEngine - Missing Log Notifications & 48h Escalation', () => {
  let testCampusId: string;
  let testFacultyId: string;
  let testManagerId: string;
  let testBatchId: string;
  let testSubjectId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Look up seeded demo data
    const campus = await prisma.campus.findFirst();
    const faculty = await prisma.user.findFirst({ where: { role: 'FACULTY' } });
    const manager = await prisma.user.findFirst({ where: { role: 'CAMPUS_MANAGER' } });
    const batch = await prisma.batch.findFirst();
    const semester = await prisma.semester.findFirst();
    const track = await prisma.track.findFirst();

    if (campus && faculty && manager && batch && semester && track) {
      testCampusId = campus.id;
      testFacultyId = faculty.id;
      testManagerId = manager.id;
      testBatchId = batch.id;

      // Create a test subject for alert testing
      const subject = await prisma.subject.create({
        data: {
          code: 'TEST-ALERT-101',
          name: 'Alert Verification Course',
          campusId: testCampusId,
          trackId: track.id,
          semesterId: semester.id,
          batchId: testBatchId,
          facultyId: testFacultyId,
          plannedHours: 30,
          targetFinishDate: new Date('2026-11-30'),
        },
      });
      testSubjectId = subject.id;

      // Create an unlogged scheduled session scheduled 3 days ago (past 48h)
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const session = await prisma.scheduledSession.create({
        data: {
          subjectId: testSubjectId,
          facultyId: testFacultyId,
          batchId: testBatchId,
          campusId: testCampusId,
          sessionDate: threeDaysAgo,
          startTime: '10:00',
          endTime: '11:00',
          durationHours: 1.0,
          status: 'SCHEDULED',
          hasLog: false,
        },
      });
      testSessionId = session.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testSessionId) {
      await prisma.notificationDeliveryLog.deleteMany({
        where: { alert: { scheduledSessionId: testSessionId } },
      });
      await prisma.alert.deleteMany({ where: { scheduledSessionId: testSessionId } });
      await prisma.scheduledSession.deleteMany({ where: { id: testSessionId } });
    }
    if (testSubjectId) {
      await prisma.subject.deleteMany({ where: { id: testSubjectId } });
    }
    await prisma.$disconnect();
  });

  it('scans and generates faculty reminder AND 48h campus manager escalation', async () => {
    if (!testSessionId) return;

    const res = await AlertEngine.scanAndGenerateAlerts();
    expect(res.newAlertsCount).toBeGreaterThanOrEqual(2);

    const alerts = await prisma.alert.findMany({
      where: { scheduledSessionId: testSessionId },
    });

    const reminder = alerts.find((a) => a.type === 'FACULTY_REMINDER');
    const escalation = alerts.find((a) => a.type === 'CAMPUS_MANAGER_ESCALATION');

    expect(reminder).toBeDefined();
    expect(escalation).toBeDefined();
    expect(reminder?.recipientUserId).toBe(testFacultyId);
  });

  it('prevents duplicate alerts on consecutive scan runs', async () => {
    if (!testSessionId) return;

    const secondScan = await AlertEngine.scanAndGenerateAlerts();

    const alertsAfter = await prisma.alert.findMany({
      where: { scheduledSessionId: testSessionId },
    });

    // Count of alerts for this session should still be exactly 2 (no duplicate created!)
    const sessionAlerts = alertsAfter.filter((a) => a.scheduledSessionId === testSessionId);
    expect(sessionAlerts.length).toBe(2);
  });
});
