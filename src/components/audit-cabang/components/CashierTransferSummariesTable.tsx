import React from 'react';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { User } from '../../../types';

export interface CashierTransferSummaryItem {
  cashier: User;
  isBandar: boolean;
  modalReceivedSah: number;
  modalReceivedPending: number;
  setorSentSah: number;
  setorSentPending: number;
  sisaKasir: number;
}

interface CashierTransferSummariesTableProps {
  summaries: CashierTransferSummaryItem[];
  mutasiDateFilter: string;
}

export const CashierTransferSummariesTable: React.FC<CashierTransferSummariesTableProps> = ({
  summaries,
  mutasiDateFilter
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Ringkasan Mutasi per Kasir ({summaries.length})
        </h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Nama Kasir</th>
              <th className="py-2.5 px-4">Peran Sesi</th>
              <th className="py-2.5 px-4 text-right">Modal Diterima (Sah)</th>
              <th className="py-2.5 px-4 text-right">Modal Pending</th>
              <th className="py-2.5 px-4 text-right">Setoran Kasir (Sah)</th>
              <th className="py-2.5 px-4 text-right">Setoran Pending</th>
              <th className="py-2.5 px-4 text-right">Sisa Modal Fisik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Belum ada kasir terdaftar di cabang ini.
                </td>
              </tr>
            ) : (
              summaries.map(({ cashier, isBandar, modalReceivedSah, modalReceivedPending, setorSentSah, setorSentPending, sisaKasir }) => (
                <tr key={cashier.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {cashier.name}
                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                      {cashier.username ? `(@${cashier.username})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {isBandar ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Kasir Bandar
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Kasir Regular
                      </span>
                    )}
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
