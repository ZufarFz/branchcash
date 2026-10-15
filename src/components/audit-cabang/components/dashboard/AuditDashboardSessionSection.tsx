import React, { useState, useEffect } from 'react';
import { User, BranchCashSession } from '../../../../types';
import { formatDate, formatCurrency } from '../../../../utils/formatters';
import { Crown, Wallet, Lock, CheckCircle2, AlertTriangle, AlertCircle, Loader2, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';

interface AuditDashboardSessionSectionProps {
  targetDate: string;
  targetSession?: BranchCashSession;
  isSessionLocked: boolean;
  branchCashiers: User[];
  branchSpvs: User[];
  isAuditCabangRole: boolean;
  onSaveSession: (
    bandarId: string,
    spvId: string | null,
    beginningCash: number
  ) => Promise<{ success: boolean; error?: string }>;
}

export const AuditDashboardSessionSection: React.FC<AuditDashboardSessionSectionProps> = ({
  targetDate,
  targetSession,
  isSessionLocked,
  branchCashiers,
  branchSpvs,
  isAuditCabangRole,
  onSaveSession,
}) => {
  const [selectedBandarId, setSelectedBandarId] = useState<string>('');
  const [selectedActingSpvId, setSelectedActingSpvId] = useState<string>('');
  const [showSpvOption, setShowSpvOption] = useState<boolean>(false);
  const [beginningCashInput, setBeginningCashInput] = useState<string>('0');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setShowSpvOption(true);
    } else {
      setSelectedActingSpvId('');
      setShowSpvOption(false);
    }

    if (targetSession?.computerBeginningCash !== undefined && targetSession.computerBeginningCash !== null) {
      setBeginningCashInput(targetSession.computerBeginningCash.toString());
    } else {
      setBeginningCashInput('0');
    }
  }, [targetSession, branchCashiers, targetDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBandarId) {
      setErrorMsg('Pilih kasir bandar terlebih dahulu.');
      return;
    }
    if (isSessionLocked && targetSession?.bandarUserId !== selectedBandarId) {
      setErrorMsg('Kasir Bandar tidak dapat diubah karena mutasi modal/setor telah berjalan.');
      return;
    }

    const cleanCash = parseFloat(beginningCashInput.replace(/[^0-9]/g, '')) || 0;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const actingSpv = showSpvOption ? (selectedActingSpvId || null) : null;
    const res = await onSaveSession(selectedBandarId, actingSpv, cleanCash);
    setIsSaving(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Gagal menyimpan konfigurasi sesi.');
    } else {
      setSuccessMsg(`Konfigurasi sesi berhasil disimpan.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const isBandarAssigned = Boolean(targetSession?.bandarUserId);

  return (
    <div className="space-y-3">
      {/* 1. Alert Banner jika Kasir Bandar Belum Ditunjuk */}
      {!isBandarAssigned && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 rounded-xl text-amber-950 flex items-center justify-between gap-3 shadow-2xs animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-2xs shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-tight text-amber-950">
                Kasir Bandar Belum Ditunjuk untuk Hari Ini ({formatDate(targetDate)})
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Segera tunjuk Kasir Bandar dan masukkan saldo awal agar transaksi modal kasir dapat berjalan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Kartu Penunjukan Bandar & Saldo Awal (Clean & Minimalist) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Penunjukan Kasir Bandar & Saldo Awal Sesi
            </h3>
          </div>
          {targetSession ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isSessionLocked ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
              {isSessionLocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              <span>{isSessionLocked ? 'Terkunci (Ada Mutasi)' : 'Sesi Aktif'}</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-400">Belum Ada Sesi</span>
          )}
        </div>

        {/* Notif Messages */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Field 1: Kasir Bandar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kasir Bandar Hari Ini *
              </label>
              {branchCashiers.length === 0 ? (
                <p className="text-xs text-rose-600 italic py-1.5">Belum ada kasir terdaftar di cabang.</p>
              ) : (
                <select
                  value={selectedBandarId}
                  onChange={(e) => setSelectedBandarId(e.target.value)}
                  disabled={isSessionLocked || !isAuditCabangRole}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                >
                  {branchCashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.username ? `(@${c.username})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Field 2: Saldo Awal Bandar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Saldo Awal Bandar (POS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">Rp</span>
                <input
                  type="number"
                  min="0"
                  value={beginningCashInput}
                  onChange={(e) => setBeginningCashInput(e.target.value)}
                  disabled={!isAuditCabangRole}
                  placeholder="0"
                  className="w-full text-xs font-mono font-bold pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* SPV Merangkap Kasir Toggle (Hidden by Default) */}
          <div className="pt-1">
            {!showSpvOption ? (
              <button
                type="button"
                onClick={() => setShowSpvOption(true)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>+ SPV Bertugas Merangkap Kasir (Opsi Khusus)</span>
              </button>
            ) : (
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>SPV Merangkap Kasir (Jika Kasir Libur / Kurang)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedActingSpvId('');
                      setShowSpvOption(false);
                    }}
                    className="text-[10px] text-slate-500 hover:text-rose-600 cursor-pointer font-semibold"
                  >
                    Tutup & Batalkan
                  </button>
                </div>
                <select
                  value={selectedActingSpvId}
                  onChange={(e) => setSelectedActingSpvId(e.target.value)}
                  disabled={!isAuditCabangRole}
                  className="w-full text-xs bg-white border border-indigo-200 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Pilih SPV yang bertugas --</option>
                  {branchSpvs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.username ? `(@${s.username})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Bottom Action */}
          {isAuditCabangRole && (
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving || (isSessionLocked && targetSession?.bandarUserId !== selectedBandarId) || branchCashiers.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{targetSession ? 'Simpan Perubahan' : 'Tunjuk Bandar'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
