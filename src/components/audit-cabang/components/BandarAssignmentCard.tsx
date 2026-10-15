import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/formatters';
import { User, BranchCashSession } from '../../../types';
import { 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

interface BandarAssignmentCardProps {
  targetBandarDate: string;
  setTargetBandarDate: (date: string) => void;
  targetSession?: BranchCashSession;
  isTargetSessionLocked: boolean;
  branchCashiers: User[];
  branchSpvs?: User[];
  isAuditCabangRole: boolean;
  onSaveBandar: (selectedBandarId: string, selectedActingSpvId: string | null) => Promise<{ success: boolean; error?: string }>;
}

export const BandarAssignmentCard: React.FC<BandarAssignmentCardProps> = ({
  targetBandarDate,
  targetSession,
  isTargetSessionLocked,
  branchCashiers,
  branchSpvs = [],
  isAuditCabangRole,
  onSaveBandar
}) => {
  const [selectedBandarId, setSelectedBandarId] = useState<string>('');
  const [selectedActingSpvId, setSelectedActingSpvId] = useState<string>('');
  const [isAssigningBandar, setIsAssigningBandar] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (targetSession?.bandarUserId) {
      setSelectedBandarId(targetSession.bandarUserId);
    } else if (branchCashiers.length > 0) {
      setSelectedBandarId(branchCashiers[0].id);
    } else {
      setSelectedBandarId('');
    }

    if (targetSession?.actingCashierUserId) {
      setSelectedActingSpvId(targetSession.actingCashierUserId);
    } else {
      setSelectedActingSpvId('');
    }
  }, [targetSession, branchCashiers, targetBandarDate]);

  const handleSaveBandar = async () => {
    if (!selectedBandarId) {
      setAssignError('Pilih kasir terlebih dahulu.');
      return;
    }
    if (isTargetSessionLocked && targetSession?.bandarUserId !== selectedBandarId) {
      setAssignError('Kasir Bandar tidak dapat diubah karena sudah ada transaksi transfer modal/setor.');
      return;
    }

    setIsAssigningBandar(true);
    setAssignError(null);
    setAssignSuccess(null);

    const res = await onSaveBandar(selectedBandarId, selectedActingSpvId || null);
    setIsAssigningBandar(false);

    if (!res.success) {
      setAssignError(res.error || 'Gagal menyimpan konfigurasi sesi.');
    } else {
      const bName = branchCashiers.find(c => c.id === selectedBandarId)?.name || 'Kasir terpilih';
      const spvName = branchSpvs.find(s => s.id === selectedActingSpvId)?.name;
      setAssignSuccess(
        `Berhasil menyimpan sesi! Bandar: ${bName}${spvName ? `, SPV Pengganti: ${spvName}` : ''} (${formatDate(targetBandarDate)})`
      );
      setTimeout(() => setAssignSuccess(null), 3500);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Penunjukan Kasir Bandar & Delegasi Sesi</h3>
          <span className="text-xs font-semibold text-slate-500">({formatDate(targetBandarDate)})</span>
        </div>

        {targetSession ? (
          <div className="flex items-center gap-2">
            {targetSession.actingCashierUserId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span>SPV Merangkap Kasir: {targetSession.actingCashierUserName || 'Aktif'}</span>
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isTargetSessionLocked 
                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {isTargetSessionLocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              <span>{isTargetSessionLocked ? 'Bandar Terkunci' : 'Sesi Aktif'}</span>
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3 h-3 text-slate-400" />
            <span>Sesi Belum Dibuka</span>
          </span>
        )}
      </div>

      {assignError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{assignError}</span>
        </div>
      )}

      {assignSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Kasir Bandar Terpilih:
          </label>
          {branchCashiers.length === 0 ? (
            <p className="text-xs text-rose-600 italic">Belum ada kasir terdaftar di cabang ini.</p>
          ) : (
            <select
              value={selectedBandarId}
              onChange={(e) => setSelectedBandarId(e.target.value)}
              disabled={isTargetSessionLocked || !isAuditCabangRole}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
            >
              {branchCashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.username ? `(@${c.username})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            SPV Merangkap Kasir (Opsional - Jika Kasir Kurang/Libur):
          </label>
          <select
            value={selectedActingSpvId}
            onChange={(e) => setSelectedActingSpvId(e.target.value)}
            disabled={!isAuditCabangRole}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
          >
            <option value="">-- Tidak Ada (Operasional Kasir Normal) --</option>
            {branchSpvs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.username ? `(@${s.username})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isAuditCabangRole && (
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveBandar}
            disabled={isAssigningBandar || (isTargetSessionLocked && targetSession?.bandarUserId !== selectedBandarId) || branchCashiers.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isAssigningBandar ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{targetSession ? 'Simpan Perubahan Sesi' : 'Buka Sesi & Tunjuk Bandar'}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};


