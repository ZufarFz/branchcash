import React from 'react';
import { CashReport } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { VarianceBadge } from '../../common/VarianceBadge';
import { ReceiptText, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

interface CashierBottomSummaryProps {
  activeReport: CashReport | null;
  onResubmitRevision: () => void;
  isSubmittingRevision: boolean;
}

export const CashierBottomSummary: React.FC<CashierBottomSummaryProps> = ({
  activeReport,
  onResubmitRevision,
  isSubmittingRevision
}) => {
  return (
    <div className="lg:col-span-12 flex justify-end">
      <div className="w-full max-w-[340px] sm:max-w-[360px] p-3 rounded-xl border border-slate-200/90 bg-white space-y-2.5 shadow-2xs">
        <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
          <ReceiptText className="w-3.5 h-3.5 text-indigo-600" />
          Ringkasan Laporan Kasir
        </h4>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-medium">Total Tunai Fisik</span>
            <span className="font-mono font-semibold text-slate-800">
              {formatCurrency(activeReport?.totalCash || 0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="font-medium">Total Non-Tunai</span>
            <span className="font-mono font-semibold text-slate-800">
              {formatCurrency(activeReport?.totalNonCash || 0)}
            </span>
          </div>

          <div className="pl-3 border-l-2 border-indigo-200/80 space-y-1.5 pt-1 mt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Total Fisik Kasir</span>
              <span className="font-mono font-extrabold text-indigo-700 text-xs">
                {formatCurrency(activeReport?.totalPhysical || 0)}
              </span>
            </div>

            {activeReport?.status === 'APPROVED' && (
              <>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Computer Cash (POS)</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">
                    {activeReport.computerCashTotal !== null ? (
                      formatCurrency(activeReport.computerCashTotal)
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">-</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-medium">Selisih Fisik vs POS</span>
                  <div className="font-mono">
                    {activeReport?.variance !== null && activeReport?.variance !== undefined ? (
                      <VarianceBadge variance={activeReport.variance} size="sm" />
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">-</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {activeReport?.status === 'REJECTED' && (
          <div className="pt-2 border-t border-rose-200/80 space-y-1.5 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200 mt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-rose-900 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Laporan ditolak oleh Audit.</span>
            </div>
            <button
              type="button"
              onClick={onResubmitRevision}
              disabled={isSubmittingRevision}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              {isSubmittingRevision ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Minta Cek Kembali</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
