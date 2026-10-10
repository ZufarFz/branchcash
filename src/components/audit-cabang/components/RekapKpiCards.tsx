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
  branchPhysicalTotal,
  branchVarianceTotal
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Fisik Tunai Cabang */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">1. Kas Fisik Tunai</span>
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-slate-900">
          {formatCurrency(branchTunaiTotal)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Total uang tunai fisik dari {filteredReportsCount} kasir
        </p>
      </div>

      {/* Card 2: Total Fisik Non-Tunai Cabang */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">2. Fisik Non-Tunai</span>
          <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-teal-700">
          {formatCurrency(branchNonTunaiTotal)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {nonCashTransactionsCount} transaksi EDC / QRIS / Transfer
        </p>
      </div>

      {/* Card 3: Total Computer Cash POS */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">3. Computer Cash (POS)</span>
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <Calculator className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-purple-900">
          {branchPOSTotal > 0 ? formatCurrency(branchPOSTotal) : 'Belum Lengkap'}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          (Tunai POS: {formatCurrency(branchPOSTunaiTotal)} | Non-Tunai: {formatCurrency(branchPOSNonTunaiTotal)})
        </p>
      </div>

      {/* Card 4: Total Variance / Selisih */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">4. Selisih Cabang</span>
          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1">
          <VarianceBadge variance={branchVarianceTotal} size="md" />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Fisik Total ({formatCurrency(branchPhysicalTotal)}) vs POS Total
        </p>
      </div>
    </div>
  );
};
