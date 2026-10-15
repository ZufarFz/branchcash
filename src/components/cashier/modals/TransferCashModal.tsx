import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { User, BranchCashSession } from '../../../types';
import { Send, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TransferCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferTypeMode: 'MODAL' | 'SETOR';
  peerCashiers: User[];
  currentSession: BranchCashSession | null;
  selectedDate: string;
}

export const TransferCashModal: React.FC<TransferCashModalProps> = ({
  isOpen,
  onClose,
  transferTypeMode,
  peerCashiers,
  currentSession,
  selectedDate
}) => {
  const { transferCash } = useApp();

  const [transferTargetUserId, setTransferTargetUserId] = useState<string>(() => {
    return peerCashiers[0]?.id || '';
  });
  const [transferAmountInput, setTransferAmountInput] = useState<string>('');
  const [transferNotesInput, setTransferNotesInput] = useState<string>('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(transferAmountInput.replace(/[^0-9]/g, '')) || 0;
    if (cleanAmount <= 0) {
      setTransferStatus({ type: 'error', message: 'Nominal transfer kas harus lebih dari Rp 0.' });
      return;
    }

    const partnerId = transferTypeMode === 'MODAL' ? transferTargetUserId : currentSession?.bandarUserId;
    if (!partnerId) {
      setTransferStatus({
        type: 'error',
        message: transferTypeMode === 'MODAL'
          ? 'Pilih kasir penerima modal.'
          : 'Kasir Bandar belum ditunjuk untuk sesi tanggal ini.'
      });
      return;
    }

    setIsSubmittingTransfer(true);
    setTransferStatus(null);

    const res = await transferCash({
      businessDate: selectedDate,
      toUserId: partnerId,
      transferType: transferTypeMode,
      amount: cleanAmount,
      notes: transferNotesInput.trim() || undefined,
    });

    setIsSubmittingTransfer(false);

    if (res.success) {
      const partnerName = peerCashiers.find(c => c.id === partnerId)?.name || currentSession?.bandarUserName || 'Kasir';
      setTransferStatus({
        type: 'success',
        message: `Berhasil mengajukan ${transferTypeMode === 'MODAL' ? 'modal' : 'setoran'} Rp ${cleanAmount.toLocaleString('id-ID')} ke ${partnerName}. Menunggu konfirmasi!`
      });
      setTimeout(() => {
        onClose();
        setTransferStatus(null);
        setTransferAmountInput('');
        setTransferNotesInput('');
      }, 1500);
    } else {
      setTransferStatus({ type: 'error', message: res.error || 'Gagal mengirim transfer kas.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${transferTypeMode === 'MODAL' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {transferTypeMode === 'MODAL' ? 'Penyerahan Modal ke Kasir' : 'Penyetoran Kas ke Bandar'}
              </h3>
              <p className="text-xs text-slate-500">
                {transferTypeMode === 'MODAL'
                  ? 'Kasir Bandar menyerahkan modal awal operasional'
                  : 'Kasir Harian menyetorkan uang fisik ke Kasir Bandar'}
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

        {transferStatus && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            transferStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {transferStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{transferStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleExecuteTransfer} className="space-y-3.5">
          {transferTypeMode === 'MODAL' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Kasir Harian Penerima Modal:
              </label>
              {peerCashiers.length === 0 ? (
                <p className="text-xs text-rose-600 italic">
                  Tidak ada kasir harian lain di cabang ini.
                </p>
              ) : (
                <select
                  value={transferTargetUserId}
                  onChange={(e) => setTransferTargetUserId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {peerCashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.username ? `(@${c.username})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 block mb-0.5">Tujuan Setoran (Kasir Bandar):</span>
              <div className="font-bold text-slate-900">
                <span>{currentSession?.bandarUserName || 'Kasir Bandar'}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Uang (Rp):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="Contoh: 1.000.000"
                value={transferAmountInput ? Number(transferAmountInput.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                onChange={(e) => setTransferAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: Modal Pagi Laci 1 / Setoran Siang"
              value={transferNotesInput}
              onChange={(e) => setTransferNotesInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingTransfer || (transferTypeMode === 'MODAL' && peerCashiers.length === 0)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                transferTypeMode === 'MODAL' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmittingTransfer ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{transferTypeMode === 'MODAL' ? 'Kirim Modal' : 'Kirim Setoran'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
