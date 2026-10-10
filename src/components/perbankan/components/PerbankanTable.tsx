import React from 'react';
import { NonCashTransaction } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { CreditCard } from 'lucide-react';

export interface PerbankanItem {
  tx: NonCashTransaction;
  reportNumber: string;
  reportId: string;
  branchName: string;
  branchCode: string;
  businessDate: string;
  reportStatus: string;
}

interface PerbankanTableProps {
  items: PerbankanItem[];
}

export const PerbankanTable: React.FC<PerbankanTableProps> = ({ items }) => {
  const totalNominal = items.reduce((sum, item) => sum + item.tx.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Transaksi Non-Tunai
          </h3>
          <p className="text-xs text-slate-500">
            Data transaksi non-tunai yang diinput oleh kasir per cabang
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
          Menampilkan {items.length} transaksi
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">No</th>
              <th className="py-3 px-4">Tanggal Bisnis</th>
              <th className="py-3 px-4">Cabang</th>
              <th className="py-3 px-4">No. Laporan</th>
              <th className="py-3 px-4">Kasir</th>
              <th className="py-3 px-4">Bank / Mesin EDC</th>
              <th className="py-3 px-4">Metode Pembayaran</th>
              <th className="py-3 px-4 text-right">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                  <p className="font-semibold text-slate-600">Tidak ada transaksi non-tunai</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Belum ada data transaksi non-tunai yang cocok dengan filter.
                  </p>
                </td>
              </tr>
            ) : (
              items.map(({ tx, reportNumber, branchCode, branchName, businessDate }, idx) => (
                <tr key={tx.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {formatDate(businessDate)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800 block">{branchCode}</span>
                    <span className="text-[11px] text-slate-500">{branchName}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {reportNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {tx.cashierName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {tx.bank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {tx.paymentMethod}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-teal-500">
                <td colSpan={7} className="py-3 px-4 text-left uppercase text-xs tracking-wider text-teal-300">
                  TOTAL TRANSAKSI NON-TUNAI
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm font-black text-teal-300">
                  {formatCurrency(totalNominal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
