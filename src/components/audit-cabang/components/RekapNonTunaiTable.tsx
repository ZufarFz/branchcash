import React from 'react';
import { NonCashTransaction } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { CreditCard } from 'lucide-react';

interface RekapNonTunaiTableProps {
  allNonCashTransactions: (NonCashTransaction & { reportNumber: string; businessDate: string })[];
  branchNonTunaiTotal: number;
}

export const RekapNonTunaiTable: React.FC<RekapNonTunaiTableProps> = ({
  allNonCashTransactions,
  branchNonTunaiTotal
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Sub-Container 1: Header Non-Tunai */}
      <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-200/90 text-teal-900 rounded-lg shadow-2xs">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              2. Rekapitulasi Transaksi Non-Tunai Cabang (EDC, QRIS, Transfer)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Daftar mutasi transaksi non-tunai dari seluruh kasir cabang • {allNonCashTransactions.length} Transaksi Terdaftar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-teal-900 bg-teal-200/90 px-3 py-1.5 rounded-md">
            Total Non-Tunai: {formatCurrency(branchNonTunaiTotal)}
          </span>
        </div>
      </div>

      {/* Sub-Container 2: Non Cash Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Kasir</th>
                <th className="py-2.5 px-3">Bank / Mesin EDC</th>
                <th className="py-2.5 px-3">Metode Pembayaran</th>
                <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allNonCashTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada transaksi non-tunai di cabang ini</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Transaksi QRIS, Debit, Kredit, atau Transfer yang diinput kasir akan muncul di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                allNonCashTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800 block">{tx.cashierName}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {tx.bank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Footer Non-Tunai */}
            {allNonCashTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-teal-500">
                  <td colSpan={4} className="py-2.5 px-3 text-left uppercase text-xs tracking-wider text-teal-300">
                    TOTAL TRANSAKSI NON-TUNAI CABANG
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm font-black text-teal-300">
                    {formatCurrency(branchNonTunaiTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
