import React from 'react';
import { formatDate } from '../../../utils/formatters';
import { BranchCashSession } from '../../../types';
import { Lock, CheckCircle2 } from 'lucide-react';

interface BranchSessionsTableProps {
  branchSessions: BranchCashSession[];
  targetBandarDate: string;
  onSelectDate: (date: string) => void;
}

export const BranchSessionsTable: React.FC<BranchSessionsTableProps> = ({
  branchSessions,
  targetBandarDate,
  onSelectDate
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Daftar Sesi Kas & Jadwal Bandar Cabang ({branchSessions.length})
          </h4>
          <p className="text-[11px] text-slate-500">
            Seluruh sesi kas yang telah dibuka beserta riwayat penunjukan bandar di cabang ini.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Tanggal Bisnis</th>
              <th className="py-2.5 px-4">Kasir Bandar</th>
              <th className="py-2.5 px-4">Ditunjuk Oleh</th>
              <th className="py-2.5 px-4 text-center">Mutasi Kas</th>
              <th className="py-2.5 px-4 text-center">Laporan Kasir</th>
              <th className="py-2.5 px-4 text-center">Status Integritas</th>
              <th className="py-2.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {branchSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Belum ada sesi kas yang dibuka untuk cabang ini.
                </td>
              </tr>
            ) : (
              branchSessions.map((s) => {
                const isLocked = Boolean(
                  s.hasTransactions || (s.transferCount && s.transferCount > 0) || (s.reportCount && s.reportCount > 0)
                );
                const isSelected = s.businessDate === targetBandarDate;

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {formatDate(s.businessDate)}
                      {s.businessDate === new Date().toISOString().split('T')[0] && (
                        <span className="ml-1.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-sans font-semibold">
                          Hari Ini
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{s.bandarUserName || 'Kasir Bandar'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.assignedByName || 'Audit Cabang'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        (s.transferCount || 0) > 0 ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400'
                      }`}>
                        {s.transferCount || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        (s.reportCount || 0) > 0 ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-400'
                      }`}>
                        {s.reportCount || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Lock className="w-3 h-3" /> Terkunci
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bisa Diubah
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDate(s.businessDate);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                      >
                        Pilih Tanggal
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
