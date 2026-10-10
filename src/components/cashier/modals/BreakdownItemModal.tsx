import React from 'react';
import { DenomConfig, DenomBreakdownItem } from '../../../types';
import { X, Lock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/cashierDenomHelpers';

interface BreakdownItemModalProps {
  activeBreakdownMaster: DenomConfig | null;
  editingBreakdownItem: DenomBreakdownItem | null;
  inputSubtotalNominal: string;
  setInputSubtotalNominal: (val: string) => void;
  inputBreakdownNote: string;
  setInputBreakdownNote: (val: string) => void;
  isLocked: boolean;
  onClose: () => void;
  onSave: (master: DenomConfig) => void;
}

export const BreakdownItemModal: React.FC<BreakdownItemModalProps> = ({
  activeBreakdownMaster,
  editingBreakdownItem,
  inputSubtotalNominal,
  setInputSubtotalNominal,
  inputBreakdownNote,
  setInputBreakdownNote,
  isLocked,
  onClose,
  onSave
}) => {
  if (!activeBreakdownMaster) return null;

  const num = parseInt(inputSubtotalNominal.replace(/[^0-9]/g, ''), 10) || 0;
  const isPaper =
    activeBreakdownMaster.type === 'KERTAS' &&
    !!activeBreakdownMaster.nominal &&
    activeBreakdownMaster.nominal > 0;
  const isDivisible = isPaper ? num % activeBreakdownMaster.nominal! === 0 : true;
  const pcs = isPaper && num > 0 && isDivisible ? num / activeBreakdownMaster.nominal! : 0;
  const isSubmitDisabled = isLocked || num <= 0 || (isPaper && !isDivisible);

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-sm text-slate-800 truncate">
              {editingBreakdownItem ? 'Edit Tunai' : 'Input Tunai'} — {activeBreakdownMaster.label}
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">
              · {activeBreakdownMaster.type}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 transition-colors rounded-lg hover:bg-slate-200/60 cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSubmitDisabled) {
              onSave(activeBreakdownMaster);
            }
          }}
        >
          <div className="p-4 space-y-3.5">
            {isLocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 text-amber-800 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Laporan terkunci (mode baca).</span>
              </div>
            )}

            {/* Input Field Nominal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-breakdown-nominal" className="text-xs font-semibold text-slate-700">
                  Nominal (Rp)
                </label>
                {isPaper && num > 0 && isDivisible && (
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {pcs.toLocaleString('id-ID')} lembar
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-mono text-xs select-none">
                  Rp
                </span>
                <input
                  id="input-breakdown-nominal"
                  type="text"
                  inputMode="numeric"
                  value={
                    inputSubtotalNominal === ''
                      ? ''
                      : (parseInt(inputSubtotalNominal.replace(/[^0-9]/g, ''), 10) || 0).toLocaleString('id-ID')
                  }
                  onChange={(e) => setInputSubtotalNominal(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  className={`w-full text-right py-2 pl-9 pr-3 text-sm font-bold font-mono border rounded-lg focus:outline-hidden focus:ring-2 bg-white transition-colors ${
                    isPaper && num > 0 && !isDivisible
                      ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>
              {isPaper && num > 0 && !isDivisible && (
                <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Harus kelipatan {formatCurrency(activeBreakdownMaster.nominal!)}</span>
                </p>
              )}
            </div>

            {/* Input Field Catatan Opsional */}
            <div>
              <label htmlFor="input-breakdown-note" className="text-xs font-semibold text-slate-700 block mb-1">
                Keterangan (Opsional)
              </label>
              <input
                id="input-breakdown-note"
                type="text"
                value={inputBreakdownNote}
                onChange={(e) => setInputBreakdownNote(e.target.value)}
                placeholder="Contoh: Setoran Shift 1, Laci Kasir..."
                className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-confirm-breakdown-item"
              disabled={isSubmitDisabled}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {editingBreakdownItem ? 'Simpan Perubahan' : 'Tambah ke Daftar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
