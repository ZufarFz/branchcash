import React from 'react';
import { CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export type AuditDecisionType = 'APPROVE' | 'REJECT' | 'SAVE_ONLY';

interface DecisionActionPickerProps {
  decisionAction: AuditDecisionType;
  setDecisionAction: (action: AuditDecisionType) => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
}

export const DecisionActionPicker: React.FC<DecisionActionPickerProps> = ({
  decisionAction,
  setDecisionAction,
  rejectionReason,
  setRejectionReason
}) => {
  return (
    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
      <label className="text-xs font-bold text-slate-900 block">
        Keputusan Audit Cabang terhadap Laporan:
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setDecisionAction('APPROVE')}
          className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
            decisionAction === 'APPROVE'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
          Approve
        </button>
        <button
          type="button"
          onClick={() => setDecisionAction('REJECT')}
          className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
            decisionAction === 'REJECT'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-4 h-4 mx-auto mb-1" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => setDecisionAction('SAVE_ONLY')}
          className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
            decisionAction === 'SAVE_ONLY'
              ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mx-auto mb-1" />
          Simpan POS Saja
        </button>
      </div>

      {decisionAction === 'REJECT' && (
        <div className="pt-2 animate-fadeIn">
          <label className="text-xs font-bold text-rose-800 block mb-1">
            Alasan Penolakan (Wajib Diisi)*
          </label>
          <textarea
            id="input-rejection-reason"
            rows={2}
            required
            placeholder="Contoh: Terdapat selisih fisik tunai tidak wajar"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full text-xs p-2.5 border border-rose-300 rounded-lg bg-rose-50/50 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          />
        </div>
      )}
    </div>
  );
};
