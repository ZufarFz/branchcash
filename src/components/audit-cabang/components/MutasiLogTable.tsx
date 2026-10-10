import React from 'react';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { CashierCashTransfer } from '../../../types';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface MutasiLogTableProps {
  displayedTransfers: CashierCashTransfer[];
}

export const MutasiLogTable: React.FC<MutasiLogTableProps> = ({ displayedTransfers }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Log Transaksi Mutasi Modal & Setor ({displayedTransfers.length})
          </h4>
          <p className="text-[11px] text-slate-500">
            Daftar seluruh transaksi serah terima kas fisik antar-kasir cabang.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Waktu</th>
              <th className="py-2.5 px-4">Tanggal</th>
              <th className="py-2.5 px-4 text-center">Tipe</th>
              <th className="py-2.5 px-4">Pengirim Kas</th>
              <th className="py-2.5 px-4">Penerima Kas</th>
              <th className="py-2.5 px-4 text-right">Nominal</th>
              <th className="py-2.5 px-4 text-center">Status</th>
              <th className="py-2.5 px-4">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {displayedTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  Tidak ada transaksi mutasi kas yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              displayedTransfers.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                    {formatDate(tx.businessDate)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.transferType === 'MODAL'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {tx.transferType === 'MODAL' ? 'MODAL' : 'SETOR'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {tx.userName || 'Pengirim'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {tx.partnerUserName || 'Penerima'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(Math.abs(tx.amount))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {tx.status === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sah (ACC)
                      </span>
                    ) : tx.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> Ditolak
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                    {tx.notes || '-'}
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
