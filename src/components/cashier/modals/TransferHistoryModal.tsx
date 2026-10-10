import React from 'react';
import { formatDate } from '../../../utils/formatters';
import { CashierCashTransfer } from '../../../types';
import { ArrowLeftRight, X } from 'lucide-react';

interface TransferHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  myTransfers: CashierCashTransfer[];
  selectedDate: string;
}

export const TransferHistoryModal: React.FC<TransferHistoryModalProps> = ({
  isOpen,
  onClose,
  myTransfers,
  selectedDate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 space-y-4 border border-slate-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Mutasi Kas Silang (Double-Entry)
              </h3>
              <p className="text-xs text-slate-500">
                Catatan saling-silang antara Kasir Bandar dan Kasir Harian tanggal {formatDate(selectedDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {myTransfers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada catatan mutasi transfer kas pada tanggal ini.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Jenis Mutasi</th>
                  <th className="py-2.5 px-3">Arah</th>
                  <th className="py-2.5 px-3">Lawan Transaksi</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Ref Silang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTransfers.map((tx) => {
                  const isIncoming = tx.direction === 'IN';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {tx.transferType === 'MODAL' ? 'MODAL AWAL' : 'SETORAN KAS'}
                        {tx.notes && <div className="text-[10px] text-slate-400 font-normal">{tx.notes}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isIncoming ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {tx.partnerUserName || 'Kasir Lawan'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={tx.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {tx.amount > 0 ? `+Rp ${tx.amount.toLocaleString('id-ID')}` : `-Rp ${Math.abs(tx.amount).toLocaleString('id-ID')}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-400" title={tx.referenceTransferId || 'Ref'}>
                        {tx.referenceTransferId ? `${tx.referenceTransferId.substring(0, 8)}...` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
