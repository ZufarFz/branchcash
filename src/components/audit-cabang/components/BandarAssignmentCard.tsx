import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/formatters';
import { User, BranchCashSession } from '../../../types';
import { 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
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
  setTargetBandarDate,
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

  const handleSave = async () => {
    if (!selectedBandarId) {
      setAssignError('Pilih kasir terlebih dahulu.');
      return;
    }
    if (isTargetSessionLocked) {
      setAssignError('Kasir Bandar tidak dapat diubah karena transaksi sudah berjalan pada tanggal ini.');
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

  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setTargetBandarDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Penunjukan Kasir Bandar Harian</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih tanggal bebas untuk membuka sesi atau menjadwalkan Kasir Bandar hingga 7 hari ke depan.
          </p>
        </div>

        {targetSession ? (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isTargetSessionLocked 
                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {isTargetSessionLocked ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isTargetSessionLocked ? 'Terkunci (Transaksi Ada)' : 'Sesi Aktif (Bisa Diubah)'}</span>
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Sesi Belum Dibuka</span>
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Pilih Tanggal Sesi Kas:
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={targetBandarDate}
            onChange={(e) => setTargetBandarDate(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setQuickDate(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              targetBandarDate === new Date().toISOString().split('T')[0]
                ? 'bg-amber-500 text-white border-amber-600 font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
          >
            Besok (+1)
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(2)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
          >
            Lusa (+2)
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(7)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
          >
            +7 Hari
          </button>
        </div>
      </div>

      {assignError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{assignError}</span>
        </div>
      )}

      {assignSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      )}

      {isTargetSessionLocked ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-amber-950">
              Kasir Bandar Terkunci untuk Tanggal {formatDate(targetBandarDate)}
            </strong>
            <span>
              Sesi ini sudah memiliki transaksi mutasi kas ({targetSession?.transferCount || 0} mutasi) atau laporan kasir ({targetSession?.reportCount || 0} laporan). Kasir Bandar tidak dapat diubah lagi.
            </span>
          </div>
        </div>
      ) : targetSession ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-emerald-950">Sesi Belum Memiliki Transaksi</strong>
            <span>Belum ada mutasi modal/setor atau laporan kasir yang dibuat pada sesi ini. Anda masih dapat mengubah Kasir Bandar jika diperlukan.</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-sky-950">Sesi Belum Dibuka</strong>
            <span>Silakan tentukan Kasir Bandar di bawah ini untuk membuka sesi kas cabang pada tanggal {formatDate(targetBandarDate)}.</span>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Pilih Kasir Bandar:
          </label>
          {branchCashiers.length === 0 ? (
            <p className="text-xs text-rose-600 italic">
              Belum ada kasir terdaftar di cabang ini.
            </p>
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
            onClick={handleSave}
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
