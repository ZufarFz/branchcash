import React, { useState, useEffect } from 'react';
import { CashierCashTransfer } from '../../../types';
import { RotateCcw, X, Loader2 } from 'lucide-react';

interface EditRejectedModalModalProps {
  isOpen: boolean;
  transfer: CashierCashTransfer | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (newAmount: number, newNotes?: string) => void;
}

export const EditRejectedModalModal: React.FC<EditRejectedModalModalProps> = ({
  isOpen,
  transfer,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [nominalInput, setNominalInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  useEffect(() => {
    if (transfer) {
      setNominalInput(Math.abs(transfer.amount).toString());
      setNotesInput(transfer.notes || '');
    } else {
      setNominalInput('');
      setNotesInput('');
    }
  }, [transfer, isOpen]);

  if (!isOpen || !transfer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(nominalInput.replace(/[^0-9]/g, '')) || 0;
    if (cleanAmount <= 0) return;
    onSubmit(cleanAmount, notesInput.trim() || undefined);
  };

  const parsedNominal = Number(nominalInput.replace(/[^0-9]/g, '')) || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Revisi & Ajukan Ulang Modal
              </h4>
              <p className="text-[11px] text-slate-500">
                Penerima: <span className="font-bold text-slate-800">{transfer.partnerUserName || 'Kasir Harian'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold">Modal ini sebelumnya ditolak oleh kasir penerima.</p>
          <p className="text-[11px] text-amber-800/90">
            Perbarui nominal atau catatan di bawah. Setelah diajukan ulang, status akan kembali <b>PENDING</b> agar kasir penerima dapat mengonfirmasi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Modal Baru (Rp):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={parsedNominal > 0 ? parsedNominal.toLocaleString('id-ID') : ''}
                onChange={(e) => setNominalInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 2.500.000"
                className="w-full pl-9 pr-3 py-1.5 text-sm font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Revisi (Opsional):
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Contoh: Koreksi nominal modal laci 1"
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedNominal <= 0}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ajukan Ulang</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
