import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLogEntry, AuditAction } from '../../types';
import { RoleBadge } from '../common/RoleBadge';
import { Modal } from '../common/Modal';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  FileText, 
  ArrowRight, 
  Eye, 
  User, 
  Building 
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSummary = log.summary.toLowerCase().includes(q);
        const matchesUser = log.userName.toLowerCase().includes(q);
        const matchesReport = log.reportNumber.toLowerCase().includes(q);
        const matchesReason = log.reason?.toLowerCase().includes(q);
        if (!matchesSummary && !matchesUser && !matchesReport && !matchesReason) return false;
      }
      return true;
    });
  }, [auditLogs, selectedAction, searchQuery]);

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'CREATE_REPORT':
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">CREATE</span>;
      case 'SUBMIT_REPORT':
        return <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-indigo-200">SUBMIT</span>;
      case 'INPUT_COMPUTER_CASH':
        return <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200">INPUT POS</span>;
      case 'REVIEW_SPV':
        return <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">REVIEW SPV</span>;
      case 'REVIEW_KACAB':
        return <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200">REVIEW KACAB</span>;
      case 'RECONCILE_NON_CASH':
        return <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-teal-200">REKONSILIASI</span>;
      case 'APPROVE_REPORT':
        return <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">APPROVED (LOCKED)</span>;
      case 'REJECT_REPORT':
        return <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200">REJECTED</span>;
      case 'FORCE_EDIT':
        return <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-300">FORCE EDIT</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Audit Trail & Riwayat Perubahan (PRD Bab 11)
            </h1>
            <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200">
              Immutability & Rekam Jejak
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mencatat setiap aksi penting: pembuatan, submit, input POS, review cabang, rekonsiliasi, approval, reject, dan Force Edit beserta data Sebelum & Sesudah.
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
          Total Log Tercatat: <strong>{auditLogs.length} Entri</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id="filter-log-action"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg w-full sm:w-48"
          >
            <option value="ALL">Semua Tipe Aksi</option>
            <option value="FORCE_EDIT">Force Edit (Perubahan)</option>
            <option value="APPROVE_REPORT">Approval Final</option>
            <option value="REJECT_REPORT">Penolakan (Reject)</option>
            <option value="INPUT_COMPUTER_CASH">Input Computer Cash</option>
            <option value="RECONCILE_NON_CASH">Rekonsiliasi Perbankan</option>
            <option value="SUBMIT_REPORT">Submit Laporan</option>
            <option value="CREATE_REPORT">Pembuatan Laporan</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            id="search-audit-log"
            type="text"
            placeholder="Cari user, no. laporan, alasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs p-2 pl-7 bg-slate-50 border border-slate-200 rounded-lg"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Waktu (Timestamp)</th>
                <th className="py-3 px-4">Pengguna & Peran</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Laporan & Cabang</th>
                <th className="py-3 px-4">Ringkasan Aktivitas</th>
                <th className="py-3 px-4">Alasan (Wajib jika Edit/Reject)</th>
                <th className="py-3 px-4 text-center">Data Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada catatan audit log yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const hasDiff = log.beforeData || log.afterData;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{log.userName}</span>
                        <div className="mt-0.5">
                          <RoleBadge role={log.userRole} size="sm" />
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800 block">
                          {log.reportNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {log.branchCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        {log.summary}
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic">
                        {log.reason ? (
                          <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block text-[11px]">
                            "{log.reason}"
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasDiff ? (
                          <button
                            id={`btn-diff-${log.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedEntry(log);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Sebelum/Sesudah
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Perubahan Sebelum / Sesudah */}
      {isDetailModalOpen && selectedEntry && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Detail Perubahan: ${selectedEntry.action}`}
          subtitle={`No. Laporan: ${selectedEntry.reportNumber} • Oleh: ${selectedEntry.userName} (${selectedEntry.userRole})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Perubahan:</span>
                <span className="font-mono font-bold text-slate-800">{selectedEntry.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aktivitas:</span>
                <span className="font-semibold text-slate-800">{selectedEntry.summary}</span>
              </div>
              {selectedEntry.reason && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-amber-800 font-bold block">Alasan Perubahan:</span>
                  <p className="text-slate-700 mt-0.5 italic">"{selectedEntry.reason}"</p>
                </div>
              )}
            </div>

            {/* Before vs After comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200">
                <h4 className="font-bold text-rose-900 mb-2 flex items-center gap-1">
                  <span>Data Sebelum (Before):</span>
                </h4>
                <pre className="text-[11px] font-mono bg-white p-2.5 rounded border border-rose-100 overflow-x-auto text-slate-800">
                  {JSON.stringify(selectedEntry.beforeData || 'Tidak ada data sebelum', null, 2)}
                </pre>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-1">
                  <span>Data Sesudah (After):</span>
                </h4>
                <pre className="text-[11px] font-mono bg-white p-2.5 rounded border border-emerald-100 overflow-x-auto text-slate-800">
                  {JSON.stringify(selectedEntry.afterData || 'Tidak ada data sesudah', null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
