import React from 'react';
import { formatDate } from '../../../utils/formatters';
import { CashierCashTransfer } from '../../../types';
import { History, Check, X, RotateCcw } from 'lucide-react';

interface TransferMutationLogTableProps {
  myTransfers: CashierCashTransfer[];
  currentUserId: string;
  selectedDate: string;
  onActionClick: (tx: CashierCashTransfer, action: 'CONFIRM' | 'REJECT') => void;
  onEditClick?: (tx: CashierCashTransfer) => void;
}

export const TransferMutationLogTable: React.FC<TransferMutationLogTableProps> = ({
  myTransfers,
  currentUserId,
  selectedDate,
  onActionClick,
  onEditClick
}) => {
  const userTransfers = myTransfers.filter((t) => t.userId === currentUserId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Riwayat Mutasi Modal & Setor Tanggal {formatDate(selectedDate)}
          </h4>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Total {userTransfers.length} Catatan
        </span>
      </div>

      <div className="overflow-x-auto">
        {userTransfers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada mutasi kas (modal atau setoran) yang tercatat pada tanggal ini.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Jenis Mutasi</th>
                <th className="py-2.5 px-3">Arah</th>
                <th className="py-2.5 px-3">Mitra Kasir</th>
                <th className="py-2.5 px-3 text-right">Nominal</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Konfirmasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userTransfers.map((tx) => {
                const isIncoming = tx.direction === 'IN';
                const isPending = tx.status === 'PENDING';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {tx.transferType === 'MODAL' ? 'MODAL AWAL' : 'SETORAN KAS'}
                      {tx.notes && <div className="text-[10px] text-slate-400 font-normal">{tx.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isIncoming ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isIncoming ? 'MASUK (+)' : 'KELUAR (-)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {tx.partnerUserName || 'Kasir Mitra'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={tx.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {tx.amount > 0 ? `+Rp ${tx.amount.toLocaleString('id-ID')}` : `-Rp ${Math.abs(tx.amount).toLocaleString('id-ID')}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {tx.status === 'CONFIRMED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ SAH
                        </span>
                      )}
                      {tx.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          PENDING
                        </span>
                      )}
                      {tx.status === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          DITOLAK
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isPending && isIncoming ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onActionClick(tx, 'CONFIRM')}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                            title="Terima Kas"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onActionClick(tx, 'REJECT')}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                            title="Tolak Kas"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isPending && !isIncoming ? (
                        <span className="text-slate-400 italic text-[11px]">
                          Menunggu Konfirmasi
                        </span>
                      ) : tx.status === 'CONFIRMED' ? (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          {tx.confirmedByName ? `Oleh: ${tx.confirmedByName}` : 'Telah Dikonfirmasi'}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-rose-600 font-semibold text-[11px]">
                            Ditolak
                          </span>
                          {!isIncoming && tx.transferType === 'MODAL' && onEditClick && (
                            <button
                              type="button"
                              onClick={() => onEditClick(tx)}
                              className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 transition-colors cursor-pointer"
                              title="Edit & Ajukan Ulang Modal"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
