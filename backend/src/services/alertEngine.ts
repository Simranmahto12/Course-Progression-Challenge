import prisma from '../lib/prisma.js';

export interface ScanAlertOptions {
  referenceDate?: Date;
}

export class AlertEngine {
  /**
   * Scan scheduled sessions for missing logs:
   * 1. Sessions on or before today without a log: trigger FACULTY_REMINDER
   * 2. Sessions > 48 hours past without a log: escalate to CAMPUS_MANAGER_ESCALATION
   * Prevents duplicates by querying existing alert records before creation.
   */
  public static async scanAndGenerateAlerts(options: ScanAlertOptions = {}) {
    const now = options.referenceDate || new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Find all scheduled sessions where sessionDate <= now and hasLog === false and status !== CANCELLED
    const unloggedSessions = await prisma.scheduledSession.findMany({
      where: {
        sessionDate: { lte: now },
        hasLog: false,
        status: { not: 'CANCELLED' },
      },
      include: {
        subject: true,
        faculty: true,
        campus: {
          include: {
            users: {
              where: { role: 'CAMPUS_MANAGER' },
            },
          },
        },
        alerts: true,
      },
    });

    const generatedAlerts: Array<{
      id: string;
      type: string;
      recipientEmail: string;
      subjectCode: string;
      sessionDate: Date;
    }> = [];

    for (const session of unloggedSessions) {
      const sessionDate = new Date(session.sessionDate);
      const isPast48Hours = sessionDate <= fortyEightHoursAgo;
      const hoursUnlogged = Math.max(
        0,
        Math.round(((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)) * 10) / 10
      );

      // Check for Stage 1: Faculty Reminder
      const existingFacultyAlert = session.alerts.find(
        (a) => a.type === 'FACULTY_REMINDER'
      );

      if (!existingFacultyAlert) {
        const facultyAlert = await prisma.alert.create({
          data: {
            scheduledSessionId: session.id,
            subjectId: session.subjectId,
            recipientUserId: session.facultyId,
            type: 'FACULTY_REMINDER',
            title: `Session Log Reminder: ${session.subject.code} (${session.startTime})`,
            message: `Please log today's session for ${session.subject.name} (${session.subject.code}) conducted on ${sessionDate.toISOString().slice(0, 10)}. Aim for quick mobile logging under 60 seconds.`,
            status: 'SENT',
            hoursUnlogged,
            scheduledDate: session.sessionDate,
            sentAt: now,
          },
        });

        // Record simulated delivery
        await prisma.notificationDeliveryLog.create({
          data: {
            alertId: facultyAlert.id,
            channel: 'IN_APP',
            recipientEmail: session.faculty.email,
            payload: JSON.stringify({
              subject: facultyAlert.title,
              recipient: session.faculty.name,
              sessionDate: session.sessionDate,
            }),
            sentAt: now,
          },
        });

        generatedAlerts.push({
          id: facultyAlert.id,
          type: 'FACULTY_REMINDER',
          recipientEmail: session.faculty.email,
          subjectCode: session.subject.code,
          sessionDate: session.sessionDate,
        });
      }

      // Check for Stage 2: Campus Manager Escalation (48h+)
      if (isPast48Hours) {
        const existingManagerAlert = session.alerts.find(
          (a) => a.type === 'CAMPUS_MANAGER_ESCALATION'
        );

        if (!existingManagerAlert && session.campus.users.length > 0) {
          // Send escalation to each campus manager
          for (const manager of session.campus.users) {
            const managerAlert = await prisma.alert.create({
              data: {
                scheduledSessionId: session.id,
                subjectId: session.subjectId,
                recipientUserId: manager.id,
                type: 'CAMPUS_MANAGER_ESCALATION',
                title: `ESCALATION: Missing Log > 48h - ${session.subject.code} (${session.faculty.name})`,
                message: `Class for ${session.subject.name} scheduled on ${sessionDate.toISOString().slice(0, 10)} by ${session.faculty.name} has not been logged for over 48 hours (${hoursUnlogged}h overdue). Campus intervention required.`,
                status: 'SENT',
                hoursUnlogged,
                scheduledDate: session.sessionDate,
                sentAt: now,
              },
            });

            await prisma.notificationDeliveryLog.create({
              data: {
                alertId: managerAlert.id,
                channel: 'EMAIL_SIMULATED',
                recipientEmail: manager.email,
                payload: JSON.stringify({
                  subject: managerAlert.title,
                  recipient: manager.name,
                  facultyName: session.faculty.name,
                  sessionDate: session.sessionDate,
                  hoursUnlogged,
                }),
                sentAt: now,
              },
            });

            generatedAlerts.push({
              id: managerAlert.id,
              type: 'CAMPUS_MANAGER_ESCALATION',
              recipientEmail: manager.email,
              subjectCode: session.subject.code,
              sessionDate: session.sessionDate,
            });
          }
        }
      }
    }

    return {
      scannedUnloggedSessions: unloggedSessions.length,
      newAlertsCount: generatedAlerts.length,
      alerts: generatedAlerts,
    };
  }

  /**
   * Mark an alert as acknowledged or resolved.
   */
  public static async acknowledgeAlert(alertId: string, userId: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        updatedAt: new Date(),
      },
    });
  }
}
