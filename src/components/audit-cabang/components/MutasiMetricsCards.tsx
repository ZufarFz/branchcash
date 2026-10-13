import React from 'react';
import { formatCurrency } from '../../../utils/formatters';
import { Send, CheckCircle2, Coins, Clock } from 'lucide-react';

interface MutasiMetricsCardsProps {
  mutasiMetrics: {
    modalConfirmed: number;
    modalPending: number;
    setorConfirmed: number;
    setorPending: number;
    netBandar: number;
  };
  pendingBranchTransfersCount: number;
}

export const MutasiMetricsCards: React.FC<MutasiMetricsCardsProps> = ({
  mutasiMetrics,
  pendingBranchTransfersCount
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1: Modal Diserahkan */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Modal Diserahkan</span>
          <div className="p-1 bg-amber-50 text-amber-600 rounded-md">
            <Send className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-amber-950">
          {formatCurrency(mutasiMetrics.modalConfirmed)}
        </div>
        {mutasiMetrics.modalPending > 0 && (
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
            +{formatCurrency(mutasiMetrics.modalPending)} pending
          </p>
        )}
      </div>

      {/* Card 2: Setoran Kasir */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Setoran Diterima</span>
          <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-emerald-950">
          {formatCurrency(mutasiMetrics.setorConfirmed)}
        </div>
        {mutasiMetrics.setorPending > 0 && (
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
            +{formatCurrency(mutasiMetrics.setorPending)} pending
          </p>
        )}
      </div>

      {/* Card 3: Net Kas Masuk */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Net Kas Masuk</span>
          <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
            <Coins className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-base sm:text-lg font-black font-mono ${
          mutasiMetrics.netBandar >= 0 ? 'text-indigo-950' : 'text-rose-700'
        }`}>
          {formatCurrency(mutasiMetrics.netBandar)}
        </div>
      </div>

      {/* Card 4: Antrean Konfirmasi */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Antrean Pending</span>
          <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono">
          {pendingBranchTransfersCount > 0 ? (
            <span className="text-amber-600">{pendingBranchTransfersCount} Transaksi</span>
          ) : (
            <span className="text-emerald-600">0 Pending</span>
          )}
        </div>
      </div>
    </div>
  );
};

