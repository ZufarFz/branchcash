import React, { useState } from 'react';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { BranchCashSession } from '../../../types';
import { Lock, CheckCircle2, Pencil, Check, X, Loader2 } from 'lucide-react';

interface BranchSessionsTableProps {
  branchSessions: BranchCashSession[];
  targetBandarDate: string;
  onSelectDate: (date: string) => void;
  onSaveBeginningCash?: (sessionId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  isAuditCabangRole?: boolean;
}

export const BranchSessionsTable: React.FC<BranchSessionsTableProps> = ({
  branchSessions,
  targetBandarDate,
  onSelectDate,
  onSaveBeginningCash,
  isAuditCabangRole = false
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('0');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleStartEdit = (s: BranchCashSession) => {
    if (!isAuditCabangRole) return;
    setEditingSessionId(s.id);
    setEditAmount(s.computerBeginningCash ? s.computerBeginningCash.toString() : '0');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditAmount('0');
  };

  const handleSaveEdit = async (sessionId: string) => {
    if (!onSaveBeginningCash) return;
    const num = parseFloat(editAmount.replace(/[^0-9]/g, '')) || 0;
    setIsSaving(true);
    const res = await onSaveBeginningCash(sessionId, num);
    setIsSaving(false);
    if (res.success) {
      setEditingSessionId(null);
    } else {
      alert(res.error || 'Gagal menyimpan saldo awal');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Daftar Sesi Kas Cabang ({branchSessions.length})
        </h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Tanggal Bisnis</th>
              <th className="py-2.5 px-4">Kasir Bandar</th>
              <th className="py-2.5 px-4">Ditunjuk Oleh</th>
              <th className="py-2.5 px-4 text-right">Saldo Awal (POS)</th>
              <th className="py-2.5 px-4 text-center">Mutasi Kas</th>
              <th className="py-2.5 px-4 text-center">Laporan Kasir</th>
              <th className="py-2.5 px-4 text-center">Status Integritas</th>
              <th className="py-2.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {branchSessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
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
                    <td className="py-2 px-4 text-right font-mono">
                      {editingSessionId === s.id ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <div className="relative">
                            <span className="absolute left-2 top-1 text-[10px] text-slate-400 font-bold">Rp</span>
                            <input
                              type="number"
                              min="0"
                              autoFocus
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(s.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              disabled={isSaving}
                              className="w-28 text-xs font-mono font-bold pl-6 pr-1.5 py-0.5 bg-white border border-purple-400 rounded focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(s.id)}
                            disabled={isSaving}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Simpan"
                          >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors cursor-pointer"
                            title="Batal"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="group inline-flex items-center justify-end gap-1.5">
                          {s.computerBeginningCash !== undefined && s.computerBeginningCash !== null && s.computerBeginningCash > 0 ? (
                            <span className="font-bold text-purple-700">{formatCurrency(s.computerBeginningCash)}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Rp 0</span>
                          )}
                          {isAuditCabangRole && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(s)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all cursor-pointer"
                              title="Ubah Saldo Awal POS"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
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


