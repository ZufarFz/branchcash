import React from 'react';
import { DenomConfig } from '../../../types';
import { AlertCircle } from 'lucide-react';

export interface DeleteBreakdownTarget {
  master: DenomConfig;
  itemId: string;
  subtotal: number;
  note?: string;
}

interface DeleteBreakdownModalProps {
  itemToDelete: DeleteBreakdownTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteBreakdownModal: React.FC<DeleteBreakdownModalProps> = ({
  itemToDelete,
  onClose,
  onConfirm
}) => {
  if (!itemToDelete) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-rose-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Hapus Rincian Ini?</h3>
            <p className="text-xs text-slate-500">Pecahan: {itemToDelete.master.label}</p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Rincian nominal <strong className="font-mono text-slate-900">Rp {itemToDelete.subtotal.toLocaleString('id-ID')}</strong> akan dihapus dari perhitungan kasir.
        </p>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
};
