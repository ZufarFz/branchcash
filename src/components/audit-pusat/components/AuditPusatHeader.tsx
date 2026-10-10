import React from 'react';
import { User } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { 
  AlertCircle, 
  Database, 
  UserCheck, 
  Download, 
  Printer 
} from 'lucide-react';

interface AuditPusatHeaderProps {
  currentUser: User;
  isAuditPusat: boolean;
  branchesCount: number;
  totalReportsCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalPhysicalAll: number;
  pendingUsersCount: number;
  onOpenMasterModal: () => void;
  onOpenUserModal: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
}

export const AuditPusatHeader: React.FC<AuditPusatHeaderProps> = ({
  currentUser,
  isAuditPusat,
  branchesCount,
  totalReportsCount,
  pendingApprovalCount,
  approvedCount,
  rejectedCount,
  totalPhysicalAll,
  pendingUsersCount,
  onOpenMasterModal,
  onOpenUserModal,
  onExportCSV,
  onPrint,
}) => {
  return (
    <div className="space-y-4">
      {/* Role restriction banner if non-Audit Pusat is viewing this page */}
      {!isAuditPusat && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">Mode Pratinjau (Role: {currentUser.role})</h4>
            <p>
              Sesuai ketentuan PRD Bab 2 & 10, wewenang <strong>Approval Final</strong>, <strong>Reject Laporan</strong>, serta <strong>Force Edit</strong> laporan yang sudah disetujui (dengan alasan wajib & pencatatan audit log) merupakan hak eksklusif <strong>Audit Pusat</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Audit Pusat (Kantor Pusat)
            </h1>
            <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200">
              Wewenang Approval Final & Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lead Auditor: <strong className="text-slate-800">{currentUser.name}</strong> •{' '}
            Monitoring seluruh cabang, review berkas kas, approval final (auto-lock), & force edit.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-master-data"
            type="button"
            onClick={onOpenMasterModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 shadow-xs transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Master Data</span>
          </button>
          <button
            id="btn-user-approvals"
            type="button"
            onClick={onOpenUserModal}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer ${
              pendingUsersCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Persetujuan Akun</span>
            {pendingUsersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-800 text-[10px] font-bold">
                {pendingUsersCount}
              </span>
            )}
          </button>
          <button
            id="btn-export-reports-csv"
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export Excel/CSV
          </button>
          <button
            id="btn-print-summary"
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Global Realtime Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Cabang</span>
          <span className="font-bold text-lg text-slate-900 mt-0.5 block">{branchesCount}</span>
          <span className="text-[10px] text-slate-400">Aktif Beroperasi</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Laporan</span>
          <span className="font-bold text-lg text-slate-900 mt-0.5 block">{totalReportsCount}</span>
          <span className="text-[10px] text-slate-400">Seluruh Periode</span>
        </div>

        <div className="bg-white rounded-xl border border-amber-200/80 bg-amber-50/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-amber-800 block">Draft / Menunggu Approval</span>
          <span className="font-bold text-lg text-amber-700 mt-0.5 block">{pendingApprovalCount}</span>
          <span className="text-[10px] text-amber-600 font-medium">Status DRAFT</span>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-800 block">Approved & Locked</span>
          <span className="font-bold text-lg text-emerald-700 mt-0.5 block">{approvedCount}</span>
          <span className="text-[10px] text-emerald-600 font-medium">Otomatis Terkunci</span>
        </div>

        <div className="bg-white rounded-xl border border-rose-200/80 bg-rose-50/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-rose-800 block">Ditolak (Rejected)</span>
          <span className="font-bold text-lg text-rose-700 mt-0.5 block">{rejectedCount}</span>
          <span className="text-[10px] text-rose-600 font-medium">Menunggu Revisi Kasir</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Kas Fisik</span>
          <span className="font-bold text-sm font-mono text-indigo-700 mt-0.5 block truncate">
            {formatCurrency(totalPhysicalAll)}
          </span>
          <span className="text-[10px] text-slate-400">Seluruh Cabang</span>
        </div>
      </div>
    </div>
  );
};
