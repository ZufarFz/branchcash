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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Modal Diserahkan Bandar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">1. Modal Bandar (Sah)</span>
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-amber-950">
          {formatCurrency(mutasiMetrics.modalConfirmed)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {mutasiMetrics.modalPending > 0 ? (
            <span className="text-amber-600 font-semibold">
              +{formatCurrency(mutasiMetrics.modalPending)} pending
            </span>
          ) : (
            'Seluruh modal telah dikonfirmasi'
          )}
        </p>
      </div>

      {/* Card 2: Total Setoran Kasir ke Bandar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">2. Setoran Kasir (Sah)</span>
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-emerald-950">
          {formatCurrency(mutasiMetrics.setorConfirmed)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {mutasiMetrics.setorPending > 0 ? (
            <span className="text-amber-600 font-semibold">
              +{formatCurrency(mutasiMetrics.setorPending)} pending
            </span>
          ) : (
            'Seluruh setoran telah dikonfirmasi'
          )}
        </p>
      </div>

      {/* Card 3: Saldo Kas Masuk Bersih Bandar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">3. Net Kas Masuk Bandar</span>
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-lg font-black font-mono ${
          mutasiMetrics.netBandar >= 0 ? 'text-indigo-950' : 'text-rose-700'
        }`}>
          {formatCurrency(mutasiMetrics.netBandar)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Total Setoran Diterima minus Modal Diserahkan
        </p>
      </div>

      {/* Card 4: Status Antrean */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">4. Antrean Konfirmasi</span>
          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-slate-900">
          {pendingBranchTransfersCount > 0 ? (
            <span className="text-amber-600">{pendingBranchTransfersCount} Transaksi</span>
          ) : (
            <span className="text-emerald-600">Selesai (0 Pending)</span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Menunggu serah-terima fisik kasir lawan
        </p>
      </div>
    </div>
  );
};
