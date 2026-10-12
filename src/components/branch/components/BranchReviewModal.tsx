import React from 'react';
import { Modal } from '../../common/Modal';
import { CashReport } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { VarianceBadge } from '../../common/VarianceBadge';
import { CheckCircle } from 'lucide-react';

interface BranchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CashReport | null;
  isSpv: boolean;
  reviewNoteInput: string;
  setReviewNoteInput: (val: string) => void;
  onSaveReview: (e: React.FormEvent) => void;
}

export const BranchReviewModal: React.FC<BranchReviewModalProps> = ({
  isOpen,
  onClose,
  report,
  isSpv,
  reviewNoteInput,
  setReviewNoteInput,
  onSaveReview,
}) => {
  if (!isOpen || !report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Laporan Kas: ${report.reportNumber}`}
      subtitle={`Cabang ${report.branchName} • Tanggal Bisnis: ${formatDate(report.businessDate)}`}
      maxWidth="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Tutup
          </button>
          <button
            id="btn-save-branch-review"
            type="button"
            onClick={onSaveReview}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            {isSpv ? 'Simpan Review SPV' : 'Verifikasi Closing Kepala Cabang'}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block">Total Uang Fisik:</span>
            <span className="font-mono font-bold text-sm text-indigo-700">
              {formatCurrency(report.totalPhysical)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Computer Cash POS:</span>
            <span className="font-mono font-bold text-sm text-slate-800">
              {report.computerCashTotal !== null
                ? formatCurrency(report.computerCashTotal)
                : 'Belum diinput'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Status Selisih:</span>
            <div className="mt-0.5">
              <VarianceBadge variance={report.variance} size="sm" />
            </div>
          </div>
        </div>

        {/* Non-Cash status */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-800 block mb-2">
            Daftar Transaksi Non-Tunai ({report.nonCashTransactions.length} item):
          </span>
          {report.nonCashTransactions.length === 0 ? (
            <span className="text-slate-400">Tidak ada transaksi non-tunai.</span>
          ) : (
            <div className="space-y-1.5">
              {report.nonCashTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                  <span>{tx.bank} - {tx.paymentMethod}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{formatCurrency(tx.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Input Note Form */}
        <div>
          <label className="font-bold text-slate-800 block mb-1">
            {isSpv ? 'Catatan Review SPV Cabang:' : 'Catatan Closing Kepala Cabang:'}
          </label>
          <textarea
            id="textarea-branch-review-note"
            rows={3}
            value={reviewNoteInput}
            onChange={(e) => setReviewNoteInput(e.target.value)}
            placeholder={
              isSpv
                ? 'Contoh: Fisik uang dalam brankas telah dihitung ulang bersama kasir, klop.'
                : 'Contoh: Closing kasir dan POS disetujui, siap diteruskan ke Audit Pusat.'
            }
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>
    </Modal>
  );
};
