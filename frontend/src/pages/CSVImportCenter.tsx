import React, { useState } from 'react';
import {
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../services/api';

export const CSVImportCenter: React.FC = () => {
  const [templateType, setTemplateType] = useState<'calendar' | 'timetable' | 'subjects' | 'lesson_plans'>('calendar');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = (type: string) => {
    window.open(`/api/csv/template/${type}`, '_blank');
  };

  const handleExportData = (type: string) => {
    window.open(`/api/csv/export/${type}`, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewData(null);
      setImportResult(null);
      setError(null);
      await runPreview(selected, templateType);
    }
  };

  const runPreview = async (uploadFile: File, type: string) => {
    setValidating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await apiRequest(`/csv/preview/${type}`, {
        method: 'POST',
        body: formData,
      });

      setPreviewData(res);
    } catch (err: any) {
      setError(err.message || 'CSV preview failed');
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || !previewData.previewRows) return;
    setImporting(true);
    setError(null);

    try {
      const res = await apiRequest(`/csv/import/${templateType}`, {
        method: 'POST',
        body: JSON.stringify({ rows: previewData.previewRows }),
      });

      setImportResult(res);
      setPreviewData(null);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Import execution failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">CSV Import & Export Center</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Download standardized templates, validate files with row-level error reporting, and import data safely.
        </p>
      </div>

      {/* Template Download & Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { type: 'calendar', name: 'Institutional Calendar', desc: 'Holidays & Class Closures' },
          { type: 'timetable', name: 'Timetable Slots', desc: 'Faculty, Weekday & Times' },
          { type: 'subjects', name: 'Subjects Master', desc: 'Course Codes & Planned Hours' },
          { type: 'lesson_plans', name: 'Lesson Plans', desc: 'Units, Topics & Exam Scopes' },
        ].map((item) => (
          <div
            key={item.type}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-xs">{item.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => handleDownloadTemplate(item.type)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Template
              </button>
              {(item.type === 'lesson_plans' || item.type === 'subjects') && (
                <button
                  onClick={() => handleExportData(item.type)}
                  className="text-slate-600 hover:text-slate-900 font-medium"
                >
                  Export Data
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload & Validation Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-indigo-600" />
          <span>Upload CSV for Pre-Validation</span>
        </h2>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {importResult && (
          <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Import Succeeded! Imported {importResult.importedCount} records into the database.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Data Type to Import
            </label>
            <select
              value={templateType}
              onChange={(e) => {
                setTemplateType(e.target.value as any);
                setPreviewData(null);
                setFile(null);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="calendar">Institutional Calendar & Holidays</option>
              <option value="timetable">Timetable Weekly Schedule</option>
              <option value="subjects">Subjects Master List</option>
              <option value="lesson_plans">Lesson Plans (Topics Breakdown)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Choose CSV File {file && <span className="text-indigo-600 font-mono">({file.name})</span>}
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
        </div>

        {validating && (
          <div className="py-8 text-center text-slate-500 text-xs">
            <Clock className="w-6 h-6 mx-auto animate-spin text-indigo-600 mb-1" />
            Validating row-level constraints and header columns...
          </div>
        )}

        {/* Validation Summary & Preview */}
        {previewData && (
          <div className="mt-6 space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-900">Total Rows: {previewData.totalRows}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">
                  Valid Rows: {previewData.validRowsCount}
                </span>
                <span>•</span>
                <span
                  className={
                    previewData.errorRowsCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'
                  }
                >
                  Errors: {previewData.errorRowsCount}
                </span>
              </div>

              {previewData.isValid ? (
                <button
                  onClick={handleExecuteImport}
                  disabled={importing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {importing ? <Clock className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Commit Transactional Import</span>
                </button>
              ) : (
                <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Fix row errors before importing
                </span>
              )}
            </div>

            {/* Row Errors Table */}
            {previewData.errors.length > 0 && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="font-bold text-rose-900 text-xs mb-2">
                  Validation Errors Found ({previewData.errors.length})
                </div>
                <div className="space-y-1 text-xs">
                  {previewData.errors.map((err: any, idx: number) => (
                    <div key={idx} className="text-rose-800 flex items-center gap-2">
                      <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                        Row {err.rowNumber}
                      </span>
                      <span className="font-semibold text-rose-900">[{err.field}]</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Data Table */}
            {previewData.previewRows.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Preview Data Rows (Top {previewData.previewRows.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        {Object.keys(previewData.previewRows[0] || {}).map((col) => (
                          <th key={col} className="py-2 px-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.previewRows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {Object.values(row).map((val: any, cIdx: number) => (
                            <td key={cIdx} className="py-1.5 px-3 truncate max-w-xs text-slate-700">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
