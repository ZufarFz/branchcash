import React from 'react';
import { NonCashTransaction } from '../../../types';
import { Trash2, Pencil } from 'lucide-react';
import { formatCurrency } from '../utils/cashierNonCashHelpers';

interface BatchTxRowProps {
  tx: NonCashTransaction;
  origIndex: number;
  isJustAdded: boolean;
  isSaving: boolean;
  isFailed: boolean;
  actMode: 'delete' | 'edit';
  handleRetrySaveTx: (tx: NonCashTransaction) => void;
  setTxToDelete: (tx: NonCashTransaction) => void;
  handleStartEdit: (tx: NonCashTransaction) => void;
}

export const BatchTxRow: React.FC<BatchTxRowProps> = ({
  tx,
  origIndex,
  isJustAdded,
  isSaving,
  isFailed,
  actMode,
  handleRetrySaveTx,
  setTxToDelete,
  handleStartEdit
}) => {
  return (
    <tr
      id={`nc-tx-row-${tx.id}`}
      key={tx.id || origIndex}
      className={`transition-all duration-300 scroll-my-2 ${
        isJustAdded
          ? 'bg-emerald-100/90 ring-2 ring-emerald-500 ring-inset shadow-xs'
          : isFailed
          ? 'bg-rose-50/70 hover:bg-rose-50'
          : 'hover:bg-slate-50'
      }`}
    >
      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
        {origIndex}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold font-mono text-slate-800">
            {formatCurrency(tx.amount)}
          </span>
          {isSaving && (
            <span className="text-[10px] text-amber-600 font-semibold animate-pulse bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              Menyimpan...
            </span>
          )}
          {isFailed && (
            <div className="inline-flex items-center gap-1.5">
              <span
                className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200"
                title={tx.syncError || 'Gagal menyimpan ke database'}
              >
                Gagal
              </span>
              <button
                type="button"
                onClick={() => handleRetrySaveTx(tx)}
                className="text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.2 rounded border border-teal-200 transition-colors cursor-pointer"
                title="Coba simpan ulang transaksi ini"
              >
                Ulangi
              </button>
            </div>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
        {tx.createdAt
          ? new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-'}
      </td>
      <td className="py-2.5 px-3 text-center">
        {actMode === 'delete' ? (
          <button
            type="button"
            onClick={() => setTxToDelete(tx)}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center justify-center cursor-pointer"
            title="Hapus transaksi"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleStartEdit(tx)}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center justify-center cursor-pointer"
            title="Edit nominal transaksi"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
};
