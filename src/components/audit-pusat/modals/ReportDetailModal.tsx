import React from 'react';
import { Modal } from '../../common/Modal';
import { CashReport } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { StatusBadge } from '../../common/StatusBadge';
import { VarianceBadge } from '../../common/VarianceBadge';
import { CheckCircle2, XCircle, Edit3 } from 'lucide-react';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CashReport | null;
  onApprove: (report: CashReport) => void;
  onOpenReject: (report: CashReport) => void;
  onOpenForceEdit: (report: CashReport) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onApprove,
  onOpenReject,
  onOpenForceEdit,
}) => {
  if (!isOpen || !report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Inspeksi Laporan Kas: ${report.reportNumber}`}
      subtitle={`Cabang: ${report.branchName} • Tanggal Bisnis: ${formatDate(report.businessDate)}`}
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {report.status === 'DRAFT' ? (
              <>
                <button
                  id="btn-modal-reject"
                  type="button"
                  onClick={() => onOpenReject(report)}
                  className="px-3.5 py-2 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject Laporan
                </button>
                <button
                  id="btn-modal-approve"
                  type="button"
                  onClick={() => onApprove(report)}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve (Otomatis Terkunci)
                </button>
              </>
            ) : report.status === 'APPROVED' ? (
              <button
                id="btn-modal-force-edit"
                type="button"
                onClick={() => onOpenForceEdit(report)}
                className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Force Edit Laporan (Dengan Alasan)
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Status overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block">Total Fisik:</span>
            <span className="font-mono font-bold text-sm text-indigo-700">
              {formatCurrency(report.totalPhysical)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Tunai + Non-Tunai
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Computer Cash POS:</span>
            <span className="font-mono font-bold text-sm text-slate-800">
              {report.computerCashTotal !== null
                ? formatCurrency(report.computerCashTotal)
                : 'Belum Diinput'}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Oleh: {report.computerCashEnteredBy?.split(' ')[0] || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Selisih (Variance):</span>
            <div className="mt-0.5">
              <VarianceBadge variance={report.variance} size="sm" />
            </div>
          </div>
          <div>
            <span className="text-slate-500 block">Status Laporan:</span>
            <div className="mt-0.5">
              <StatusBadge status={report.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Breakdown Denominasi */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3.5 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
            <span>1. Komposisi Pecahan Uang Tunai Kasir</span>
            <span className="text-indigo-700 font-mono font-bold">
              {formatCurrency(report.totalCash)}
            </span>
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white">
            {report.denominations.filter(d => (d.subtotal || 0) > 0).length === 0 ? (
              <div className="col-span-full py-2 text-center text-slate-400 italic text-xs">
                Belum ada fisik uang tunai yang diisi.
              </div>
            ) : (
              report.denominations
                .filter(d => (d.subtotal || 0) > 0)
                .map((d, idx) => (
                  <div key={d.denomId || d.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {d.denomLabel || (d.denomValue ? formatCurrency(d.denomValue) : d.denomCode || 'Denom')}
                      </span>
                      {d.denomType && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-200 text-slate-700">
                          {d.denomType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-extrabold text-indigo-700">
                      {formatCurrency(d.subtotal)}
                    </div>
                    {d.calculatedPcs !== undefined && d.calculatedPcs > 0 && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        {d.calculatedPcs.toLocaleString('id-ID')} lembar
                      </div>
                    )}
                    {d.breakdown && d.breakdown.some(b => b.note) && (
                      <div className="text-[10px] text-purple-700 italic border-t border-slate-200/60 pt-0.5 mt-0.5 space-y-0.5">
                        {d.breakdown.filter(b => b.note).map((b, bi) => (
                          <div key={bi} className="truncate" title={b.note}>
                            • {b.note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Breakdown Non-Tunai */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3.5 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
            <span>2. Transaksi Non-Tunai</span>
            <span className="text-teal-700 font-mono font-bold">
              {formatCurrency(report.totalNonCash)}
            </span>
          </div>
          {report.nonCashTransactions.length === 0 ? (
            <div className="p-4 text-center text-slate-400">Tidak ada transaksi non-tunai.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {report.nonCashTransactions.map((tx) => (
                <div key={tx.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-800">{tx.bank}</span>
                    <span className="text-slate-500 ml-2 text-xs">({tx.paymentMethod})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-teal-700 block">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>



        {/* Rejection notice if rejected */}
        {report.status === 'REJECTED' && report.notes && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
            <span className="font-bold text-rose-900 block">Alasan Penolakan:</span>
            <p className="text-rose-800 mt-0.5 italic">"{report.notes}"</p>
            {report.verifiedBy && (
              <span className="text-[10px] text-rose-600 block mt-1">
                Ditolak oleh {report.verifiedBy} ({report.verifiedAt})
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
