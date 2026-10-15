import React, { useState, useRef } from 'react';
import { Branch, User } from '../../../../types';
import {
  generateUserImportTemplate,
  parseUserImportExcel,
  toAdminCreateParams,
  ParsedUserRow,
} from '../utils/userExcelHelper';
import {
  adminAccountActionService,
  AdminBatchResultItem,
} from '../../../../services/supabase/adminAccountActionService';
import { BatchImportPreviewTable } from '../components/BatchImportPreviewTable';
import { BatchImportResultsList } from '../components/BatchImportResultsList';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface BatchImportUsersModalProps {
  isOpen: boolean;
  branches: Branch[];
  existingUsers: User[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const BatchImportUsersModal: React.FC<BatchImportUsersModalProps> = ({
  isOpen,
  branches,
  existingUsers,
  onClose,
  onSuccess,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<AdminBatchResultItem[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    generateUserImportTemplate(branches);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setBatchResults(null);
    setFileName(file.name);
    setIsParsing(true);

    try {
      const rows = await parseUserImportExcel(file, branches, existingUsers);
      if (rows.length === 0) {
        setParseError('File Excel kosong atau format header tidak sesuai template.');
      }
      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err?.message || 'Gagal membaca file Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  const handleExecuteImport = async () => {
    const validParams = toAdminCreateParams(parsedRows);
    if (validParams.length === 0) return;

    setIsSubmitting(true);
    setProgress({ done: 0, total: validParams.length });

    try {
      const { successCount, failCount, results } = await adminAccountActionService.batchCreateUsers(
        validParams,
        (done, total) => setProgress({ done, total })
      );

      setBatchResults(results);
      onSuccess(`Import batch selesai: ${successCount} berhasil, ${failCount} gagal.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName(null);
    setBatchResults(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Batch Pendaftaran Pengguna (Excel .xlsx)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Unggah file Excel multi-sheet untuk mendaftarkan akun sekaligus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Action Bar: Download Template */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">Langkah 1: Unduh Format Template</span>
              <span className="text-[11px] text-slate-500">File berisi Sheet Contoh Template, Master Role, dan Master Cabang</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Template Excel</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-5 text-center transition-colors bg-white">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              disabled={isSubmitting || isParsing}
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <UploadCloud className="w-8 h-8 text-indigo-500" />
              <div>
                <span className="font-bold text-slate-800">
                  {fileName ? `File terpilih: ${fileName}` : 'Pilih atau Tarik File Excel (.xlsx) ke sini'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Pastikan format kolom sesuai dengan Sheet 1 Template
                </span>
              </div>
            </label>
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Table Subcomponent */}
          {!batchResults && (
            <BatchImportPreviewTable
              parsedRows={parsedRows}
              validCount={validCount}
              errorCount={errorCount}
              onReset={handleReset}
            />
          )}

          {/* Submitting Progress Bar */}
          {isSubmitting && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-indigo-900 font-bold text-xs">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Mendaftarkan akun ke database...
                </span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-200"
                  style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Batch Results View Subcomponent */}
          {batchResults && <BatchImportResultsList batchResults={batchResults} />}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          {batchResults ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Selesai & Tutup
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting || validCount === 0}
                onClick={handleExecuteImport}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import {validCount} Pengguna Valid</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
