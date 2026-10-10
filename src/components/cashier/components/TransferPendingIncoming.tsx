import React from 'react';
import { CashierCashTransfer } from '../../../types';
import { ShieldCheck, CheckCircle2, Check, X, Loader2 } from 'lucide-react';

interface TransferPendingIncomingProps {
  pendingTransfers: CashierCashTransfer[];
  confirmingTransferId: string | null;
  onConfirm: (transferId: string, action: 'CONFIRM' | 'REJECT') => void;
}

export const TransferPendingIncoming: React.FC<TransferPendingIncomingProps> = ({
  pendingTransfers,
  confirmingTransferId,
  onConfirm
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Mutasi Kas Masuk Menunggu Konfirmasi Anda
          </h3>
        </div>
        {pendingTransfers.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {pendingTransfers.length} Butuh Konfirmasi
          </span>
        )}
      </div>

      {pendingTransfers.length === 0 ? (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Semua transfer fisik uang masuk telah terkonfirmasi. Tidak ada mutasi yang tertunda.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingTransfers.map((tx) => (
            <div
              key={tx.id}
              className="bg-amber-50/70 border-2 border-amber-400 rounded-xl p-4 shadow-2xs space-y-3 relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                    tx.transferType === 'MODAL' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {tx.transferType === 'MODAL' ? 'Penerimaan Modal Awal' : 'Penerimaan Setoran Kas'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    Dari: <span className="text-amber-950 font-black">{tx.partnerUserName || 'Kasir Pengirim'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Dikirim: {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block font-medium">Nominal:</span>
                  <span className="text-base font-extrabold font-mono text-emerald-700">
                    +Rp {tx.amount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {tx.notes && (
                <p className="text-xs bg-white/80 p-2 rounded-lg border border-amber-200 text-slate-700 italic">
                  "{tx.notes}"
                </p>
              )}

              <div className="pt-2 border-t border-amber-200 flex items-center gap-2">
                <button
                  id={`btn-confirm-transfer-${tx.id}`}
                  type="button"
                  disabled={confirmingTransferId === tx.id}
                  onClick={() => onConfirm(tx.id, 'CONFIRM')}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {confirmingTransferId === tx.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{tx.transferType === 'MODAL' ? 'Terima Modal' : 'Terima Setoran'} & Konfirmasi</span>
                </button>

                <button
                  id={`btn-reject-transfer-${tx.id}`}
                  type="button"
                  disabled={confirmingTransferId === tx.id}
                  onClick={() => onConfirm(tx.id, 'REJECT')}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 active:scale-98 disabled:opacity-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tolak</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
