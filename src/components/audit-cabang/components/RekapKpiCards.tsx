import React from 'react';
import { formatCurrency } from '../../../utils/formatters';
import { VarianceBadge } from '../../common/VarianceBadge';
import { Coins, CreditCard, Calculator, ShieldCheck } from 'lucide-react';

interface RekapKpiCardsProps {
  branchTunaiTotal: number;
  filteredReportsCount: number;
  branchNonTunaiTotal: number;
  nonCashTransactionsCount: number;
  branchPOSTotal: number;
  branchPOSTunaiTotal: number;
  branchPOSNonTunaiTotal: number;
  branchPhysicalTotal: number;
  branchVarianceTotal: number | null;
}

export const RekapKpiCards: React.FC<RekapKpiCardsProps> = ({
  branchTunaiTotal,
  filteredReportsCount,
  branchNonTunaiTotal,
  nonCashTransactionsCount,
  branchPOSTotal,
  branchPOSTunaiTotal,
  branchPOSNonTunaiTotal,
  branchVarianceTotal
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1: Total Fisik Tunai */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Fisik Tunai</span>
          <div className="p-1 bg-amber-50 text-amber-600 rounded-md">
            <Coins className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-slate-900">
          {formatCurrency(branchTunaiTotal)}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {filteredReportsCount} kasir
        </p>
      </div>

      {/* Card 2: Total Fisik Non-Tunai */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Fisik Non-Tunai</span>
          <div className="p-1 bg-teal-50 text-teal-600 rounded-md">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-teal-700">
          {formatCurrency(branchNonTunaiTotal)}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {nonCashTransactionsCount} transaksi
        </p>
      </div>

      {/* Card 3: Total Computer Cash POS */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Computer Cash</span>
          <div className="p-1 bg-purple-50 text-purple-600 rounded-md">
            <Calculator className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-purple-900">
          {branchPOSTotal > 0 ? formatCurrency(branchPOSTotal) : 'Rp 0'}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          POS Tunai {formatCurrency(branchPOSTunaiTotal)}
        </p>
      </div>

      {/* Card 4: Total Variance / Selisih */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Status Selisih</span>
          <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1">
          <VarianceBadge variance={branchVarianceTotal} size="sm" />
        </div>
      </div>
    </div>
  );
};

