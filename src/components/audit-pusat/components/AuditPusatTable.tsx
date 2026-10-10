import React from 'react';
import { CashReport } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { StatusBadge, MatchStatusBadge } from '../../common/StatusBadge';
import { VarianceBadge } from '../../common/VarianceBadge';
import { 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Edit3 
} from 'lucide-react';

interface AuditPusatTableProps {
  reports: CashReport[];
  isAuditPusat: boolean;
  onOpenDetail: (report: CashReport) => void;
  onApprove: (report: CashReport) => void;
  onOpenReject: (report: CashReport) => void;
  onOpenForceEdit: (report: CashReport) => void;
}

export const AuditPusatTable: React.FC<AuditPusatTableProps> = ({
  reports,
  isAuditPusat,
  onOpenDetail,
  onApprove,
  onOpenReject,
  onOpenForceEdit,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Monitoring Laporan Kas & Kewenangan Approval
          </h3>
          <p className="text-xs text-slate-500">
            Periksa komposisi fisik, status rekonsiliasi perbankan, dan kesesuaian Computer Cash POS
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
          {reports.length} Laporan
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">No. Laporan</th>
              <th className="py-3 px-4">Tanggal Bisnis</th>
              <th className="py-3 px-4">Cabang</th>
              <th className="py-3 px-4">Kasir</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Kas Fisik</th>
              <th className="py-3 px-4 text-right">Computer Cash</th>
              <th className="py-3 px-4 text-center">Selisih</th>
              <th className="py-3 px-4 text-center">Aksi Audit Pusat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Tidak ada laporan kas yang ditemukan dengan filter ini.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <div>{report.reportNumber}</div>
                    {report.nonCashTransactions.length > 0 && (
                      <div className="mt-1">
                        <MatchStatusBadge
                          status={
                            report.nonCashTransactions.every((t) => t.syncStatus === 'SAVED')
                              ? 'MATCHED'
                              : 'PENDING'
                          }
                          size="sm"
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatDate(report.businessDate)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{report.branchName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{report.branchCode}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {report.cashierName}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(report.totalPhysical)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {report.computerCashTotal !== null
                      ? formatCurrency(report.computerCashTotal)
                      : <span className="text-slate-400 italic">Belum Diinput</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {report.computerCashTotal !== null ? (
                      <VarianceBadge variance={report.variance || 0} />
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(report)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Lihat Detail & Periksa Fisik"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Detail
                      </button>

                      {isAuditPusat && report.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onApprove(report)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Approval Final (Auto Lock)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenReject(report)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Reject Laporan"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}

                      {isAuditPusat && report.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => onOpenForceEdit(report)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Force Edit dengan Alasan (PRD Bab 10)"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Force Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
