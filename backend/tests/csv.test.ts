import { CSVEngine } from '../src/services/csvEngine.js';

describe('CSVEngine - Validation & Row Error Reporting', () => {
  it('validates correct calendar CSV rows', () => {
    const csvContent = `date,title,type,applicableCampus,applicableBatch,isTeachingSuspended
2026-08-15,Independence Day,HOLIDAY,ALL,ALL,true
2026-10-02,Mahatma Gandhi Jayanti,HOLIDAY,ALL,ALL,true`;

    const result = CSVEngine.previewAndValidate(csvContent, 'calendar');
    expect(result.isValid).toBe(true);
    expect(result.totalRows).toBe(2);
    expect(result.validRowsCount).toBe(2);
    expect(result.errorRowsCount).toBe(0);
  });

  it('detects malformed calendar date rows and flags row number', () => {
    const malformedCsv = `date,title,type,applicableCampus,applicableBatch,isTeachingSuspended
invalid-date,Corrupt Holiday,HOLIDAY,ALL,ALL,true
2026-10-02,Mahatma Gandhi Jayanti,HOLIDAY,ALL,ALL,true`;

    const result = CSVEngine.previewAndValidate(malformedCsv, 'calendar');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].rowNumber).toBe(2);
    expect(result.errors[0].field).toBe('date');
    expect(result.validRowsCount).toBe(1);
    expect(result.errorRowsCount).toBe(1);
  });

  it('validates lesson plans CSV and flags negative or non-numeric planned hours', () => {
    const invalidLessonPlan = `subjectCode,unit,sequence,topicName,description,plannedHours,examScopes,prerequisites
CS501,Unit 1,1,Valid Topic,Description,3.5,MID_TERM,None
CS501,Unit 1,2,Negative Hours Topic,Description,-2.0,MID_TERM,None
CS501,Unit 2,3,Bad String Hours,Description,not-a-number,END_TERM,None`;

    const result = CSVEngine.previewAndValidate(invalidLessonPlan, 'lesson_plans');
    expect(result.isValid).toBe(false);
    expect(result.validRowsCount).toBe(1);
    expect(result.errorRowsCount).toBe(2);

    const row3Error = result.errors.find((e) => e.rowNumber === 3);
    expect(row3Error?.field).toBe('plannedHours');

    const row4Error = result.errors.find((e) => e.rowNumber === 4);
    expect(row4Error?.field).toBe('plannedHours');
  });

  it('validates timetable CSV and rejects invalid weekdays', () => {
    const invalidTimetable = `campus,batch,subjectCode,facultyEmail,weekday,startTime,endTime,durationHours,roomNumber
HI-Tech,Batch A,CS501,faculty@mirai.edu.in,Funday,09:00,10:00,1.0,LH-101`;

    const result = CSVEngine.previewAndValidate(invalidTimetable, 'timetable');
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('weekday');
    expect(result.errors[0].message).toContain('Funday');
  });
});
