import React from 'react';
import { ParsedUserRow } from '../utils/userExcelHelper';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface BatchImportPreviewTableProps {
  parsedRows: ParsedUserRow[];
  validCount: number;
  errorCount: number;
  onReset: () => void;
}

export const BatchImportPreviewTable: React.FC<BatchImportPreviewTableProps> = ({
  parsedRows,
  validCount,
  errorCount,
  onReset,
}) => {
  if (parsedRows.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Validation Summary Chips */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            Total: {parsedRows.length} Baris
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Valid: {validCount}
          </span>
          {errorCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Error: {errorCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
        >
          Ganti File
        </button>
      </div>

      {/* Preview Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
            <tr>
              <th className="py-2 px-3">No</th>
              <th className="py-2 px-3">Nama</th>
              <th className="py-2 px-3">Username</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Cabang</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parsedRows.map((r) => (
              <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/40'}>
                <td className="py-2 px-3 text-slate-500 font-mono">{r.rowNumber}</td>
                <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                <td className="py-2 px-3 font-mono text-slate-600">@{r.username}</td>
                <td className="py-2 px-3 font-bold text-slate-700">{r.role}</td>
                <td className="py-2 px-3 text-slate-600">{r.branchName || r.branchCode || '-'}</td>
                <td className="py-2 px-3">
                  {r.isValid ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Valid
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800" title={r.errorMessage}>
                      {r.errorMessage}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
