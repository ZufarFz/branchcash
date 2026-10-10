import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CashReport } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { VarianceBadge } from '../common/VarianceBadge';
import { Users, Eye } from 'lucide-react';
import { BranchReviewModal } from './components/BranchReviewModal';

export const BranchReviewView: React.FC = () => {
  const { currentUser, currentBranch, reports, allUsers, reviewSpv, reviewKacab } = useApp();

  const isSpv = currentUser.role === 'SPV';
  const isKacab = currentUser.role === 'KEPALA_CABANG';

  // Branch cashiers
  const branchCashiers = allUsers.filter(
    (u) => u.role === 'KASIR' && u.branchId === currentUser.branchId
  );

  // Branch reports
  const branchReports = reports.filter(
    (r) => r.branchId === currentUser.branchId || (!currentUser.branchId && true)
  );

  const [selectedReport, setSelectedReport] = useState<CashReport | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState<string>('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  const handleOpenReview = (report: CashReport) => {
    setSelectedReport(report);
    setReviewNoteInput(
      isSpv ? (report.spvNotes || '') : (report.kacabNotes || '')
    );
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    if (isSpv) {
      reviewSpv(selectedReport.id, reviewNoteInput || 'Sudah direview oleh SPV cabang');
    } else if (isKacab) {
      reviewKacab(selectedReport.id, reviewNoteInput || 'Closing harian telah diverifikasi Kepala Cabang');
    }

    setIsReviewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isSpv ? 'Portal Review SPV Cabang' : 'Monitoring Closing Kepala Cabang'}
            </h1>
            <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
              {isSpv ? 'Supervisi Kasir' : 'Closing & Monitoring'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reviewer: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role}) •{' '}
            Cabang: <strong className="text-slate-800">{currentBranch?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600">
          <Users className="w-4 h-4 text-slate-500" />
          <span>
            Kasir Terdaftar di Cabang ini: <strong>{branchCashiers.length} Kasir</strong>
          </span>
        </div>
      </div>

      {/* Cashier Roster in Branch */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Daftar Kasir Cabang {currentBranch?.code}:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {branchCashiers.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-3 text-xs"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate">{c.name}</span>
                <span className="text-[11px] text-slate-400 block truncate">{c.email}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports Table for Branch */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Laporan Kasir Cabang ({branchReports.length} Laporan)
            </h3>
            <p className="text-xs text-slate-500">
              Laporan kas yang telah disubmit kasir untuk disupervisi SPV & Kepala Cabang
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. Laporan</th>
                <th className="py-3 px-4">Tanggal Bisnis</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Kas Fisik</th>
                <th className="py-3 px-4 text-right">POS / Comp Cash</th>
                <th className="py-3 px-4 text-center">Selisih</th>
                <th className="py-3 px-4">Status Review Cabang</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada laporan kas dari kasir di cabang ini.
                  </td>
                </tr>
              ) : (
                branchReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {report.reportNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(report.businessDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {report.cashierName}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                      {formatCurrency(report.totalPhysical)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {report.computerCashTotal !== null
                        ? formatCurrency(report.computerCashTotal)
                        : <span className="text-slate-400 italic">Belum diinput</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <VarianceBadge variance={report.variance} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-semibold text-slate-600">SPV:</span>
                          {report.spvReviewedBy ? (
                            <span className="text-emerald-700 font-medium">✓ Sudah direview</span>
                          ) : (
                            <span className="text-slate-400">Belum</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-semibold text-slate-600">Kacab:</span>
                          {report.kacabReviewedBy ? (
                            <span className="text-emerald-700 font-medium">✓ Terverifikasi</span>
                          ) : (
                            <span className="text-slate-400">Belum</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        id={`btn-review-${report.id}`}
                        type="button"
                        onClick={() => handleOpenReview(report)}
                        className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail & Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <BranchReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        report={selectedReport}
        isSpv={isSpv}
        reviewNoteInput={reviewNoteInput}
        setReviewNoteInput={setReviewNoteInput}
        onSaveReview={handleSaveReview}
      />
    </div>
  );
};
