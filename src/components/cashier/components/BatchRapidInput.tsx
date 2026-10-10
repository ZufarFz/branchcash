import React from 'react';
import { Plus } from 'lucide-react';
import { formatNumberWithDots } from '../utils/cashierNonCashHelpers';

interface BatchRapidInputProps {
  batchInputRef: React.RefObject<HTMLInputElement | null>;
  batchAmountInput: string;
  setBatchAmountInput: (val: string) => void;
  handleBatchSubmit: (e: React.FormEvent) => void;
}

export const BatchRapidInput: React.FC<BatchRapidInputProps> = ({
  batchInputRef,
  batchAmountInput,
  setBatchAmountInput,
  handleBatchSubmit
}) => {
  return (
    <form
      onSubmit={handleBatchSubmit}
      className="space-y-1.5 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200/70 shrink-0"
    >
      <label htmlFor="input-batch-amount" className="text-xs font-bold text-slate-700 block">
        Input Nominal
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            Rp
          </span>
          <input
            ref={batchInputRef}
            id="input-batch-amount"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={batchAmountInput}
            onChange={(e) => setBatchAmountInput(formatNumberWithDots(e.target.value))}
            className="w-full text-sm font-bold font-mono pl-9 pr-3 py-2 bg-white border-2 border-emerald-500 rounded-lg focus:outline-hidden focus:ring-3 focus:ring-emerald-500/20 shadow-xs"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!batchAmountInput}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Simpan
        </button>
      </div>
    </form>
  );
};
