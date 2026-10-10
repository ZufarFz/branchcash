import React from 'react';
import { Modal } from '../../common/Modal';
import { CashReport } from '../../../types';

interface RejectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CashReport | null;
  reason: string;
  setReason: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RejectReportModal: React.FC<RejectReportModalProps> = ({
  isOpen,
  onClose,
  report,
  reason,
  setReason,
  onSubmit,
}) => {
  if (!isOpen || !report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reject Laporan Kas: ${report.reportNumber}`}
      subtitle="Laporan akan dikembalikan ke status REJECTED dan kasir dapat melakukan revisi"
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800">
          <p>
            <strong>Aturan PRD:</strong> Penolakan laporan memerlukan alasan yang jelas agar kasir cabang mengetahui bagian yang perlu diperbaiki.
          </p>
        </div>

        <div>
          <label className="font-bold text-slate-800 block mb-1">
            Alasan Penolakan Laporan (Wajib) *
          </label>
          <textarea
            id="textarea-rejection-reason"
            rows={4}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Terdapat selisih kas fisik Rp 50.000 dengan Computer Cash POS, dan transaksi QRIS BCA belum sesuai dengan mutasi bank."
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Batal
          </button>
          <button
            id="btn-confirm-reject-submit"
            type="submit"
            className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
          >
            Tolak Laporan (Kirim ke Kasir)
          </button>
        </div>
      </form>
    </Modal>
  );
};
