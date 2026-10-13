import React from 'react';
import { CashReport } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { StatusBadge } from '../../common/StatusBadge';
import { Lock, AlertCircle } from 'lucide-react';

interface CashierReportHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  activeReport: CashReport | null;
  activeSection: 'cash' | 'non-cash';
  isLocked: boolean;
  onOpenBatchModal: () => void;
}

export const CashierReportHeader: React.FC<CashierReportHeaderProps> = ({
  selectedDate,
  onDateChange,
  activeReport,
  activeSection,
  isLocked,
  onOpenBatchModal
}) => {
  return (
    <>
      <div className="px-4 py-3.5 sm:px-5 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {activeReport ? (
            <StatusBadge status={activeReport.status} size="md" />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Belum Ada Input</span>
            </span>
          )}

          {isLocked && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md">
              <Lock className="w-3.5 h-3.5" /> Terkunci
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeSection === 'cash' ? (
            <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-medium text-slate-600">Total Tunai:</span>
              <span className="text-xs sm:text-sm font-extrabold font-mono text-indigo-700">
                {formatCurrency(activeReport?.totalCash || 0)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-teal-50/80 border border-teal-100 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-medium text-slate-600">Total Non-Tunai:</span>
                <span className="text-xs sm:text-sm font-extrabold font-mono text-teal-700">
                  {formatCurrency(activeReport?.totalNonCash || 0)}
                </span>
              </div>
              {!isLocked && (
                <button
                  id="btn-open-batch-nc-modal"
                  type="button"
                  onClick={onOpenBatchModal}
                  className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Input Non-Tunai
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {activeReport?.status === 'REJECTED' && (
        <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Laporan Ditolak oleh Audit Cabang
            </h4>
            {activeReport.notes && (
              <p className="text-xs text-rose-800 mt-0.5">
                <strong>Alasan:</strong> "{activeReport.notes}"
              </p>
            )}
            <p className="text-[11px] text-rose-700 mt-0.5">
              Silakan perbaiki data lalu klik tombol minta cek kembali di bawah.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
