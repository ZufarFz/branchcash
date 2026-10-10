import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { Modal } from '../../common/Modal';
import { VarianceBadge } from '../../common/VarianceBadge';
import { DecisionActionPicker, AuditDecisionType } from '../components/DecisionActionPicker';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface InputComputerCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CashReport | null;
}

export const InputComputerCashModal: React.FC<InputComputerCashModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  const { inputComputerCash, approveReport, rejectReport } = useApp();

  const [tunaiInput, setTunaiInput] = useState<string>('0');
  const [nonTunaiInput, setNonTunaiInput] = useState<string>('0');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [decisionAction, setDecisionAction] = useState<AuditDecisionType>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (report) {
      setTunaiInput(
        report.computerCashTunai !== null && report.computerCashTunai !== undefined
          ? report.computerCashTunai.toString()
          : (report.computerCashTotal ? report.computerCashTotal.toString() : '0')
      );
      setNonTunaiInput(
        report.computerCashNonTunai !== null && report.computerCashNonTunai !== undefined
          ? report.computerCashNonTunai.toString()
          : '0'
      );
      setAuditNotes(report.notes || '');
      setDecisionAction('APPROVE');
      setRejectionReason('');
      setSaveStatus(null);
    }
  }, [report, isOpen]);

  if (!isOpen || !report) return null;

  const previewTunaiPOS = parseFloat(tunaiInput.replace(/[^0-9]/g, '')) || 0;
  const previewNonTunaiPOS = parseFloat(nonTunaiInput.replace(/[^0-9]/g, '')) || 0;
  const previewTotalPOS = previewTunaiPOS + previewNonTunaiPOS;

  const previewVarianceTunai = report.totalCash - previewTunaiPOS;
  const previewVarianceNonTunai = report.totalNonCash - previewNonTunaiPOS;
  const previewVarianceTotal = report.totalPhysical - previewTotalPOS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numTunai = parseFloat(tunaiInput.replace(/[^0-9]/g, '')) || 0;
    const numNonTunai = parseFloat(nonTunaiInput.replace(/[^0-9]/g, '')) || 0;

    if (numTunai < 0 || numNonTunai < 0) {
      alert('Masukkan nominal Computer Cash yang valid (tidak boleh minus).');
      return;
    }
    if (decisionAction === 'REJECT' && !rejectionReason.trim()) {
      alert('Alasan penolakan wajib diisi untuk mengembalikan laporan ke Kasir.');
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    const res = await inputComputerCash(report.id, numTunai, numNonTunai, auditNotes);
    if (res && res.success) {
      if (decisionAction === 'APPROVE') {
        await approveReport(report.id);
        setSaveStatus({ type: 'success', message: 'Berhasil menyimpan POS & Menyetujui (APPROVE) laporan!' });
      } else if (decisionAction === 'REJECT') {
        await rejectReport(report.id, rejectionReason.trim());
        setSaveStatus({ type: 'success', message: 'Laporan ditolak (REJECT) & dikembalikan ke Kasir.' });
      } else {
        setSaveStatus({ type: 'success', message: res.message || 'Berhasil menyimpan Computer Cash!' });
      }
      setTimeout(() => {
        onClose();
        setSaveStatus(null);
      }, 1200);
    } else {
      setSaveStatus({ type: 'error', message: res?.message || 'Gagal menyimpan ke Supabase.' });
    }
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Input Computer Cash / POS: ${report.reportNumber}`}
      subtitle={`Tanggal: ${formatDate(report.businessDate)} • Kasir: ${report.cashierName}`}
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            id="btn-submit-pos-cash"
            type="button"
            disabled={isSaving}
            onClick={handleSubmit}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
              decisionAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : decisionAction === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {decisionAction === 'APPROVE' ? 'Simpan POS & Approve' : decisionAction === 'REJECT' ? 'Reject & Minta Revisi' : 'Simpan POS Saja'}
                </span>
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {saveStatus && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${saveStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'}`}>
            {saveStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Cabang & Kasir:</span>
            <span className="font-semibold text-slate-800">{report.branchName} • <strong className="text-purple-700">{report.cashierName}</strong></span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
            <span className="text-slate-500">Kas Fisik:</span>
            <span className="font-bold text-slate-900 font-mono">
              <span className="text-amber-700">{formatCurrency(report.totalCash)}</span> + <span className="text-teal-700">{formatCurrency(report.totalNonCash)}</span> = <span className="text-indigo-700 underline font-black">{formatCurrency(report.totalPhysical)}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">1. POS Tunai (Rp) *</label>
            <input
              id="input-computer-cash-tunai"
              type="number"
              min="0"
              required
              placeholder="0"
              value={tunaiInput}
              onChange={(e) => setTunaiInput(e.target.value)}
              className="w-full text-sm font-bold font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">2. POS Non-Tunai (Rp) *</label>
            <input
              id="input-computer-cash-nontunai"
              type="number"
              min="0"
              required
              placeholder="0"
              value={nonTunaiInput}
              onChange={(e) => setNonTunaiInput(e.target.value)}
              className="w-full text-sm font-bold font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-purple-200/80 pb-1.5">
            <span className="font-semibold text-purple-950">Total Computer Cash (POS):</span>
            <span className="font-bold font-mono text-sm text-purple-900">{formatCurrency(previewTotalPOS)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white/80 p-2 rounded border border-purple-100">
              <span className="text-slate-500 block">Selisih Tunai:</span>
              <span className={`font-mono font-bold ${previewVarianceTunai === 0 ? 'text-emerald-700' : previewVarianceTunai < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatCurrency(previewVarianceTunai)}
              </span>
            </div>
            <div className="bg-white/80 p-2 rounded border border-purple-100">
              <span className="text-slate-500 block">Selisih Non-Tunai:</span>
              <span className={`font-mono font-bold ${previewVarianceNonTunai === 0 ? 'text-emerald-700' : previewVarianceNonTunai < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatCurrency(previewVarianceNonTunai)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-700 font-semibold">Total Selisih:</span>
            <VarianceBadge variance={previewVarianceTotal} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">Catatan Audit / Batch Z-Report</label>
          <textarea
            id="textarea-audit-pos-notes"
            rows={2}
            placeholder="Contoh: Z-Report Batch #8921 klop"
            value={auditNotes}
            onChange={(e) => setAuditNotes(e.target.value)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
          />
        </div>

        <DecisionActionPicker
          decisionAction={decisionAction}
          setDecisionAction={setDecisionAction}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
        />
      </form>
    </Modal>
  );
};
