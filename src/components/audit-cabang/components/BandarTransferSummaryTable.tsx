import React from 'react';
import { formatCurrency } from '../../../utils/formatters';
import { User } from '../../../types';
import { Crown } from 'lucide-react';

export interface BandarTransferSummaryItem {
  bandar: User;
  modalDibagiSah: number;
  modalDibagiPending: number;
  setoranDiterimaSah: number;
  setoranDiterimaPending: number;
  netKas: number;
}

interface BandarTransferSummaryTableProps {
  summary: BandarTransferSummaryItem | null;
}

export const BandarTransferSummaryTable: React.FC<BandarTransferSummaryTableProps> = ({
  summary,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ringkasan Mutasi Kasir Bandar
          </h4>
        </div>
        {summary && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Bandar Aktif
          </span>
        )}
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
              <th className="py-2.5 px-4 truncate">Nama Kasir Bandar</th>
              <th className="py-2.5 px-4 truncate">Peran Sesi</th>
              <th className="py-2.5 px-4 text-right truncate">Modal Dibagi (Sah)</th>
              <th className="py-2.5 px-4 text-right truncate">Modal Pending</th>
              <th className="py-2.5 px-4 text-right truncate">Setoran Diterima (Sah)</th>
              <th className="py-2.5 px-4 text-right truncate">Setoran Pending</th>
              <th className="py-2.5 px-4 text-right truncate">Net Kas Masuk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {!summary ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Belum ada Kasir Bandar yang ditunjuk pada sesi tanggal ini.
                </td>
              </tr>
            ) : (
              <tr className="hover:bg-amber-50/30 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900 truncate">
                  {summary.bandar.name}
                  <span className="text-[11px] text-slate-400 font-normal ml-1">
                    {summary.bandar.username ? `(@${summary.bandar.username})` : ''}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Crown className="w-3 h-3 text-amber-600" />
                    <span>Kasir Bandar</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(summary.modalDibagiSah)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {summary.modalDibagiPending > 0 ? (
                    <span className="text-amber-600 font-bold">{formatCurrency(summary.modalDibagiPending)}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                  {formatCurrency(summary.setoranDiterimaSah)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {summary.setoranDiterimaPending > 0 ? (
                    <span className="text-amber-600 font-bold">{formatCurrency(summary.setoranDiterimaPending)}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className={`py-3 px-4 text-right font-mono font-extrabold ${
                  summary.netKas >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {summary.netKas > 0 ? `+${formatCurrency(summary.netKas)}` : formatCurrency(summary.netKas)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
