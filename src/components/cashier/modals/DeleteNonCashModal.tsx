import React from 'react';
import { NonCashTransaction } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { AlertTriangle } from 'lucide-react';

interface DeleteNonCashModalProps {
  transaction: NonCashTransaction | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteNonCashModal: React.FC<DeleteNonCashModalProps> = ({
  transaction,
  onClose,
  onConfirm
}) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in zoom-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Konfirmasi Hapus</h4>
            <p className="text-xs text-slate-500">Yakin ingin menghapus transaksi ini?</p>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Nominal:</span>
            <span className="font-bold font-mono text-slate-900">{formatCurrency(transaction.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bank:</span>
            <span className="font-semibold text-slate-800">{transaction.bank}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Metode:</span>
            <span className="font-semibold text-slate-800">{transaction.paymentMethod}</span>
          </div>
          {transaction.createdAt && (
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu:</span>
              <span className="font-mono text-slate-600">
                {new Date(transaction.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
};
