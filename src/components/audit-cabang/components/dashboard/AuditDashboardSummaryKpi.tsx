import React from 'react';
import { formatCurrency } from '../../../../utils/formatters';
import { Coins, Monitor, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AuditDashboardSummaryKpiProps {
  totalPhysical: number;
  totalPos: number;
  variance: number | null;
  reportsCount: number;
  balancedCount: number;
  unbalancedCount: number;
}

export const AuditDashboardSummaryKpi: React.FC<AuditDashboardSummaryKpiProps> = ({
  totalPhysical,
  totalPos,
  variance,
  reportsCount,
  balancedCount,
  unbalancedCount,
}) => {
  const isKlop = variance === 0;
  const isMinus = variance !== null && variance < 0;
  const isPlus = variance !== null && variance > 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Kas Fisik */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider">Total Kas Fisik</span>
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Coins className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
          {formatCurrency(totalPhysical)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Dari <span className="font-semibold text-slate-700">{reportsCount}</span> laporan kasir
        </div>
      </div>

      {/* 2. Kas Komputer (POS) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider">Total Kas Komputer (POS)</span>
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <Monitor className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-sm sm:text-base font-black text-purple-900 font-mono">
          {formatCurrency(totalPos)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Input independen audit cabang
        </div>
      </div>

      {/* 3. Selisih Cabang */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider">Selisih Cabang</span>
          <div className={`p-1.5 rounded-lg ${
            isKlop ? 'bg-emerald-50 text-emerald-600' : isMinus ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
          }`}>
            <Scale className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-sm sm:text-base font-black font-mono ${
          variance === null ? 'text-slate-400' : isKlop ? 'text-emerald-600' : isMinus ? 'text-rose-600' : 'text-blue-600'
        }`}>
          {variance === null ? 'Belum Ada POS' : formatCurrency(variance)}
        </div>
        <div className="text-[11px] font-semibold mt-1">
          {variance === null ? (
            <span className="text-slate-400">Menunggu input POS</span>
          ) : isKlop ? (
            <span className="text-emerald-700">✓ Fisik & POS Klop Sempurna</span>
          ) : isMinus ? (
            <span className="text-rose-700">Kurang Bayar ({formatCurrency(Math.abs(variance))})</span>
          ) : (
            <span className="text-blue-700">Lebih Bayar (+{formatCurrency(variance)})</span>
          )}
        </div>
      </div>

      {/* 4. Rekap Status Kasir */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider">Status Rekonsiliasi</span>
          <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg">
            {unbalancedCount > 0 ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
            {balancedCount} Klop
          </span>
          {unbalancedCount > 0 ? (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
              {unbalancedCount} Selisih
            </span>
          ) : (
            <span className="text-xs text-slate-400">0 Selisih</span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mt-1.5">
          {reportsCount === 0 ? 'Belum ada kasir closing' : 'Kesiapan approval pusat'}
        </div>
      </div>
    </div>
  );
};
