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
  isAuditCabangRole: boolean;
  onSaveBandar: (selectedBandarId: string) => Promise<{ success: boolean; error?: string }>;
}

export const BandarAssignmentCard: React.FC<BandarAssignmentCardProps> = ({
  targetBandarDate,
  targetSession,
  isTargetSessionLocked,
  branchCashiers,
  isAuditCabangRole,
  onSaveBandar
}) => {
  const [selectedBandarId, setSelectedBandarId] = useState<string>('');
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
  }, [targetSession, branchCashiers, targetBandarDate]);

  const handleSaveBandar = async () => {
    if (!selectedBandarId) {
      setAssignError('Pilih kasir terlebih dahulu.');
      return;
    }
    if (isTargetSessionLocked) {
      setAssignError('Kasir Bandar tidak dapat diubah karena sudah ada transaksi transfer modal/setor.');
      return;
    }

    setIsAssigningBandar(true);
    setAssignError(null);
    setAssignSuccess(null);

    const res = await onSaveBandar(selectedBandarId);
    setIsAssigningBandar(false);

    if (!res.success) {
      setAssignError(res.error || 'Gagal menyimpan Kasir Bandar.');
    } else {
      const bName = branchCashiers.find(c => c.id === selectedBandarId)?.name || 'Kasir terpilih';
      setAssignSuccess(`Berhasil menetapkan ${bName} sebagai Kasir Bandar untuk tanggal ${formatDate(targetBandarDate)}!`);
      setTimeout(() => setAssignSuccess(null), 3500);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Penunjukan Kasir Bandar</h3>
          <span className="text-xs font-semibold text-slate-500">({formatDate(targetBandarDate)})</span>
        </div>

        {targetSession ? (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isTargetSessionLocked 
              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            {isTargetSessionLocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            <span>{isTargetSessionLocked ? 'Bandar Terkunci' : 'Sesi Aktif'}</span>
          </span>
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

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
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
                  {c.name} {c.username ? `(@${c.username})` : `(${c.email})`}
                </option>
              ))}
            </select>
          )}
        </div>

        {isAuditCabangRole && (
          <button
            type="button"
            onClick={handleSaveBandar}
            disabled={isAssigningBandar || isTargetSessionLocked || branchCashiers.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isAssigningBandar ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{targetSession ? 'Simpan Perubahan Bandar' : 'Buka Sesi & Tunjuk Bandar'}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};


