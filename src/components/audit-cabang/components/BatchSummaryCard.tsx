import React from 'react';
import { Calculator } from 'lucide-react';
import { CashReport } from '../../../types';

interface BatchSummaryCardProps {
  reports: CashReport[];
  batchInputData: Record<string, { tunai: string; nonTunai: string; notes?: string; status?: any }>;
}

export const BatchSummaryCard: React.FC<BatchSummaryCardProps> = ({
  reports,
  batchInputData
}) => {
  if (reports.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white rounded-xl p-3 space-y-2 text-xs shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-purple-400" />
          Ringkasan Hasil Akhir Per Kasir
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {reports.length} Kasir
        </span>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
        {reports.map((rep) => {
          const data = batchInputData[rep.id] || { tunai: '', nonTunai: '', status: rep.status };
          const numTunai = parseFloat(data.tunai.replace(/[^0-9]/g, '')) || 0;
          const numNonTunai = parseFloat(data.nonTunai.replace(/[^0-9]/g, '')) || 0;
          const totalComputer = numTunai + numNonTunai;
          const totalFisik = rep.totalPhysical;
          const selisihFinal = totalFisik - totalComputer;
          const st = data.status || rep.status;

          return (
            <div
              key={`sum-${rep.id}`}
              className="bg-slate-800/90 rounded-lg p-2.5 flex items-center justify-between gap-2 text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                  st === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : st === 'REJECTED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {st === 'APPROVED' ? 'A' : st === 'REJECTED' ? 'R' : 'D'}
                </span>
                <span className="font-bold text-slate-100 truncate">{rep.cashierName}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px]">Fisik</span>
                  <span className="text-slate-200 font-medium">Rp {totalFisik.toLocaleString('id-ID')}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px]">Computer</span>
                  <span className="text-purple-300 font-medium">Rp {totalComputer.toLocaleString('id-ID')}</span>
                </div>
                <div className="text-right min-w-[75px]">
                  <span className="text-slate-400 block text-[9px]">Selisih Akhir</span>
                  {selisihFinal === 0 ? (
                    <span className="text-emerald-400 font-bold">Rp 0</span>
                  ) : selisihFinal > 0 ? (
                    <span className="text-blue-400 font-bold">+Rp {selisihFinal.toLocaleString('id-ID')}</span>
                  ) : (
                    <span className="text-rose-400 font-bold">-Rp {Math.abs(selisihFinal).toLocaleString('id-ID')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
