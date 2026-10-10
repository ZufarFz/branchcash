import React from 'react';
import { CashierCashTransfer } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { CheckCircle2, AlertTriangle, X, Check, Loader2 } from 'lucide-react';

interface ConfirmTransferActionModalProps {
  isOpen: boolean;
  transfer: CashierCashTransfer | null;
  action: 'CONFIRM' | 'REJECT' | null;
  isSubmitting: boolean;
  onClose: () => void;
  onExecute: () => void;
}

export const ConfirmTransferActionModal: React.FC<ConfirmTransferActionModalProps> = ({
  isOpen,
  transfer,
  action,
  isSubmitting,
  onClose,
  onExecute
}) => {
  if (!isOpen || !transfer || !action) return null;

  const isConfirm = action === 'CONFIRM';
  const isModal = transfer.transferType === 'MODAL';
  const typeLabel = isModal ? 'Modal Awal' : 'Setoran Kas';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isConfirm ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {isConfirm ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              {isConfirm ? `Terima ${typeLabel}?` : `Tolak ${typeLabel}?`}
            </h4>
            <p className="text-xs text-slate-500">
              {isConfirm ? 'Konfirmasi penerimaan fisik uang' : 'Batalkan mutasi transfer kas'}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Pengirim:</span>
            <span className="font-bold text-slate-800">{transfer.partnerUserName || 'Kasir Pengirim'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Nominal Uang:</span>
            <span className="font-extrabold font-mono text-slate-900 text-sm">
              {formatCurrency(Math.abs(transfer.amount))}
            </span>
          </div>
          {transfer.notes && (
            <div className="pt-1 border-t border-slate-200/60 text-slate-600">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Catatan:</span>
              <span className="italic">"{transfer.notes}"</span>
            </div>
          )}
        </div>

        {/* Warning Note */}
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {isConfirm
            ? 'Pastikan fisik uang tunai telah Anda terima dan jumlahnya sesuai sebelum mengonfirmasi.'
            : 'Mutasi transfer kas ini akan ditolak dan dicatat pada riwayat audit.'}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onExecute}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isConfirm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : isConfirm ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Ya, Terima Fisik</span>
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Ya, Tolak</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
