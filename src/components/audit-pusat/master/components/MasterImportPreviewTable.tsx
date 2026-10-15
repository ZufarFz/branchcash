import React from 'react';
import { MasterSubTab } from '../MasterDataView';
import { ParsedMasterRow } from '../utils/masterExcelHelper';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MasterImportPreviewTableProps {
  type: MasterSubTab;
  parsedRows: ParsedMasterRow[];
  validCount: number;
  errorCount: number;
  isSubmitting: boolean;
  onReset: () => void;
}

export const MasterImportPreviewTable: React.FC<MasterImportPreviewTableProps> = ({
  type,
  parsedRows,
  validCount,
  errorCount,
  isSubmitting,
  onReset,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
        <div className="flex items-center gap-2">
          <span>Pratinjau Data ({parsedRows.length} Baris):</span>
          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800">
            {validCount} Valid
          </span>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] bg-rose-100 text-rose-800">
              {errorCount} Error
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
        >
          Ganti File
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="py-2 px-3 w-16">Baris</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Ringkasan Data</th>
              <th className="py-2 px-3">Catatan / Validasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {parsedRows.map((r, idx) => (
              <tr key={idx} className={r.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/40'}>
                <td className="py-2 px-3 font-mono font-bold text-slate-500">{r.rowNumber}</td>
                <td className="py-2 px-3">
                  {r.isValid ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="w-3 h-3 text-rose-600" /> Error
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 font-semibold text-slate-900">
                  {type === 'branches' && `${r.data.code} - ${r.data.name} (${r.data.city || '-'})`}
                  {type === 'banks' && r.data.name}
                  {type === 'payment_methods' && r.data.name}
                  {type === 'denoms' && `${r.data.code} - ${r.data.label} [${r.data.type}]`}
                </td>
                <td className="py-2 px-3 text-[11px] text-slate-500">
                  {r.isValid ? 'Siap diimpor' : <span className="text-rose-600 font-semibold">{r.errorMessage}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
