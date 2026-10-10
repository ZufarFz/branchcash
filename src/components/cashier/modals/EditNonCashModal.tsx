import React from 'react';
import { NonCashTransaction } from '../../../types';
import { formatNumberWithDots } from '../utils/cashierNonCashHelpers';
import { Pencil, X } from 'lucide-react';

interface EditNonCashModalProps {
  txToEdit: NonCashTransaction | null;
  onClose: () => void;
  onSave: (e?: React.FormEvent) => void;
  editAmountInput: string;
  setEditAmountInput: (val: string) => void;
  isSubmittingEdit: boolean;
}

export const EditNonCashModal: React.FC<EditNonCashModalProps> = ({
  txToEdit,
  onClose,
  onSave,
  editAmountInput,
  setEditAmountInput,
  isSubmittingEdit
}) => {
  if (!txToEdit) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in zoom-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Edit Nominal Transaksi</h4>
              <p className="text-[11px] text-slate-500">{txToEdit.bank} - {txToEdit.paymentMethod}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nominal Baru (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={editAmountInput}
                onChange={(e) => setEditAmountInput(formatNumberWithDots(e.target.value))}
                className="w-full text-sm font-bold font-mono pl-9 pr-3 py-2.5 bg-white border-2 border-amber-500 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-amber-500/20 shadow-xs"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingEdit || !editAmountInput}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
