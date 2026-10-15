import React from 'react';
import { formatCurrency } from '../../../utils/formatters';
import { User } from '../../../types';
import { Users } from 'lucide-react';

export interface CashierTransferSummaryItem {
  cashier: User;
  modalReceivedSah: number;
  modalReceivedPending: number;
  setorSentSah: number;
  setorSentPending: number;
  sisaKasir: number;
}

interface CashierTransferSummariesTableProps {
  summaries: CashierTransferSummaryItem[];
}

export const CashierTransferSummariesTable: React.FC<CashierTransferSummariesTableProps> = ({
  summaries,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ringkasan Mutasi Kasir Harian ({summaries.length})
          </h4>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs text-left">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 truncate">Nama Kasir Harian</th>
              <th className="py-2.5 px-4 truncate">Peran Sesi</th>
              <th className="py-2.5 px-4 text-right truncate">Modal Diterima (Sah)</th>
              <th className="py-2.5 px-4 text-right truncate">Modal Pending</th>
              <th className="py-2.5 px-4 text-right truncate">Setoran Kasir (Sah)</th>
              <th className="py-2.5 px-4 text-right truncate">Setoran Pending</th>
              <th className="py-2.5 px-4 text-right truncate">Sisa Modal Fisik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Belum ada kasir harian terdaftar atau bertransaksi pada tanggal ini.
                </td>
              </tr>
            ) : (
              summaries.map(({ cashier, modalReceivedSah, modalReceivedPending, setorSentSah, setorSentPending, sisaKasir }) => (
                <tr key={cashier.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 truncate">
                    {cashier.name}
                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                      {cashier.username ? `(@${cashier.username})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Kasir Regular
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                    {formatCurrency(modalReceivedSah)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {modalReceivedPending > 0 ? (
                      <span className="text-amber-600 font-bold">{formatCurrency(modalReceivedPending)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800">
                    {formatCurrency(setorSentSah)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {setorSentPending > 0 ? (
                      <span className="text-amber-600 font-bold">{formatCurrency(setorSentPending)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                    {formatCurrency(sisaKasir)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
