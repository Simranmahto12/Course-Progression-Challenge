import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma.js';

export interface RowValidationError {
  rowNumber: number;
  field: string;
  value: any;
  message: string;
}

export interface CSVPreviewResult {
  templateType: 'calendar' | 'timetable' | 'subjects' | 'lesson_plans';
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  previewRows: Record<string, any>[];
  errors: RowValidationError[];
  isValid: boolean;
}

export class CSVEngine {
  /**
   * Preview and validate CSV content based on template type.
   */
  public static previewAndValidate(
    fileContent: string,
    templateType: 'calendar' | 'timetable' | 'subjects' | 'lesson_plans'
  ): CSVPreviewResult {
    let records: Record<string, any>[] = [];

    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      return {
        templateType,
        totalRows: 0,
        validRowsCount: 0,
        errorRowsCount: 1,
        previewRows: [],
        errors: [
          {
            rowNumber: 1,
            field: 'file',
            value: '',
            message: `CSV parsing error: ${err.message}`,
          },
        ],
        isValid: false,
      };
    }

    const errors: RowValidationError[] = [];
    const validRows: Record<string, any>[] = [];

    records.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header line
      const rowErrors: RowValidationError[] = [];

      switch (templateType) {
        case 'calendar':
          if (!row.date || isNaN(Date.parse(row.date))) {
            rowErrors.push({
              rowNumber,
              field: 'date',
              value: row.date,
              message: 'Invalid or missing date (expected YYYY-MM-DD)',
            });
          }
          if (!row.title || row.title.trim().length === 0) {
            rowErrors.push({
              rowNumber,
              field: 'title',
              value: row.title,
              message: 'Title is required',
            });
          }
          break;

        case 'timetable':
          if (!row.subjectCode) {
            rowErrors.push({
              rowNumber,
              field: 'subjectCode',
              value: row.subjectCode,
              message: 'Subject code is required',
            });
          }
          if (!row.campus) {
            rowErrors.push({
              rowNumber,
              field: 'campus',
              value: row.campus,
              message: 'Campus is required',
            });
          }
          const validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', '1', '2', '3', '4', '5', '6'];
          if (!row.weekday || !validWeekdays.includes(row.weekday)) {
            rowErrors.push({
              rowNumber,
              field: 'weekday',
              value: row.weekday,
              message: `Invalid weekday: ${row.weekday}. Must be Monday-Saturday`,
            });
          }
          const duration = parseFloat(row.durationHours);
          if (isNaN(duration) || duration <= 0) {
            rowErrors.push({
              rowNumber,
              field: 'durationHours',
              value: row.durationHours,
              message: 'Duration must be a positive number',
            });
          }
          break;

        case 'subjects':
          if (!row.code || row.code.trim().length === 0) {
            rowErrors.push({
              rowNumber,
              field: 'code',
              value: row.code,
              message: 'Subject code is required',
            });
          }
          if (!row.name || row.name.trim().length === 0) {
            rowErrors.push({
              rowNumber,
              field: 'name',
              value: row.name,
              message: 'Subject name is required',
            });
          }
          const plannedHrs = parseFloat(row.plannedHours);
          if (isNaN(plannedHrs) || plannedHrs <= 0) {
            rowErrors.push({
              rowNumber,
              field: 'plannedHours',
              value: row.plannedHours,
              message: 'Planned hours must be greater than 0',
            });
          }
          break;

        case 'lesson_plans':
          if (!row.subjectCode) {
            rowErrors.push({
              rowNumber,
              field: 'subjectCode',
              value: row.subjectCode,
              message: 'Subject code is required',
            });
          }
          if (!row.unit) {
            rowErrors.push({
              rowNumber,
              field: 'unit',
              value: row.unit,
              message: 'Unit is required (e.g., Unit 1)',
            });
          }
          const seq = parseInt(row.sequence, 10);
          if (isNaN(seq) || seq <= 0) {
            rowErrors.push({
              rowNumber,
              field: 'sequence',
              value: row.sequence,
              message: 'Sequence must be a positive integer',
            });
          }
          if (!row.topicName || row.topicName.trim().length === 0) {
            rowErrors.push({
              rowNumber,
              field: 'topicName',
              value: row.topicName,
              message: 'Topic name is required',
            });
          }
          const topicHrs = parseFloat(row.plannedHours);
          if (isNaN(topicHrs) || topicHrs <= 0) {
            rowErrors.push({
              rowNumber,
              field: 'plannedHours',
              value: row.plannedHours,
              message: 'Planned hours must be a positive number',
            });
          }
          break;
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push(row);
      }
    });

    return {
      templateType,
      totalRows: records.length,
      validRowsCount: validRows.length,
      errorRowsCount: errors.length,
      previewRows: records.slice(0, 20),
      errors,
      isValid: errors.length === 0,
    };
  }

  /**
   * Import validated rows into the database using transactions.
   */
  public static async importCalendarRows(rows: Record<string, any>[]) {
    return prisma.$transaction(async (tx) => {
      let imported = 0;
      for (const row of rows) {
        let campusId: string | null = null;
        if (row.applicableCampus && row.applicableCampus !== 'ALL') {
          const campus = await tx.campus.findFirst({
            where: { name: row.applicableCampus },
          });
          if (campus) campusId = campus.id;
        }

        let batchId: string | null = null;
        if (row.applicableBatch && row.applicableBatch !== 'ALL') {
          const batch = await tx.batch.findFirst({
            where: { name: row.applicableBatch },
          });
          if (batch) batchId = batch.id;
        }

        await tx.holidayCalendar.create({
          data: {
            date: new Date(row.date),
            title: row.title,
            type: row.type || 'HOLIDAY',
            campusId,
            batchId,
            isTeachingSuspended: row.isTeachingSuspended !== 'false',
          },
        });
        imported++;
      }
      return { importedCount: imported };
    });
  }

  public static async importLessonPlans(rows: Record<string, any>[]) {
    return prisma.$transaction(async (tx) => {
      let imported = 0;
      for (const row of rows) {
        // Find subject by code
        const subject = await tx.subject.findFirst({
          where: { code: row.subjectCode },
        });

        if (!subject) {
          throw new Error(`Subject with code "${row.subjectCode}" not found in database.`);
        }

        const seq = parseInt(row.sequence, 10);
        const plannedHours = parseFloat(row.plannedHours);

        // Check if topic exists in this subject
        const existing = await tx.topic.findFirst({
          where: {
            subjectId: subject.id,
            sequence: seq,
          },
        });

        if (existing) {
          await tx.topic.update({
            where: { id: existing.id },
            data: {
              unit: row.unit,
              name: row.topicName,
              description: row.description || null,
              plannedHours,
              examScopes: row.examScopes || 'MID_TERM,END_TERM',
              prerequisites: row.prerequisites || null,
            },
          });
        } else {
          await tx.topic.create({
            data: {
              subjectId: subject.id,
              unit: row.unit,
              sequence: seq,
              name: row.topicName,
              description: row.description || null,
              plannedHours,
              examScopes: row.examScopes || 'MID_TERM,END_TERM',
              prerequisites: row.prerequisites || null,
              status: 'PENDING',
              completionPercentage: 0,
              coveredHours: 0,
            },
          });
        }
        imported++;
      }
      return { importedCount: imported };
    });
  }
}
