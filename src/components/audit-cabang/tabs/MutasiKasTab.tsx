import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';
import { MutasiMetricsCards } from '../components/MutasiMetricsCards';
import { CashierTransferSummariesTable } from '../components/CashierTransferSummariesTable';
import { MutasiLogTable } from '../components/MutasiLogTable';

export const MutasiKasTab: React.FC = () => {
  const { 
    currentUser, 
    currentBranch, 
    cashSessions, 
    cashTransfers, 
    allUsers 
  } = useApp();

  const currentBranchId = currentUser.branchId || currentBranch?.id;

  const [mutasiDateFilter, setMutasiDateFilter] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [mutasiStatusFilter, setMutasiStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'REJECTED'>('ALL');

  const mutasiSession = useMemo(() => {
    return cashSessions.find(
      (s) => (s.branchId === currentBranchId || !currentBranchId) && s.businessDate === mutasiDateFilter
    );
  }, [cashSessions, currentBranchId, mutasiDateFilter]);

  const branchCashiers = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === 'KASIR' && (!currentBranchId || u.branchId === currentBranchId)
    );
  }, [allUsers, currentBranchId]);

  const branchTransfers = useMemo(() => {
    return (cashTransfers || []).filter((t) => {
      const matchBranch = !currentBranchId || t.branchId === currentBranchId;
      const matchDate = mutasiDateFilter === 'ALL' || t.businessDate === mutasiDateFilter;
      return matchBranch && matchDate;
    });
  }, [cashTransfers, currentBranchId, mutasiDateFilter]);

  const uniqueBranchTransfers = useMemo(() => {
    return branchTransfers.filter((t) => t.direction === 'OUT');
  }, [branchTransfers]);

  const mutasiMetrics = useMemo(() => {
    const modalConfirmed = uniqueBranchTransfers
      .filter((t) => t.transferType === 'MODAL' && t.status === 'CONFIRMED')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const modalPending = uniqueBranchTransfers
      .filter((t) => t.transferType === 'MODAL' && t.status === 'PENDING')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const setorConfirmed = uniqueBranchTransfers
      .filter((t) => t.transferType === 'SETOR' && t.status === 'CONFIRMED')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const setorPending = uniqueBranchTransfers
      .filter((t) => t.transferType === 'SETOR' && t.status === 'PENDING')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const netBandar = setorConfirmed - modalConfirmed;

    return { modalConfirmed, modalPending, setorConfirmed, setorPending, netBandar };
  }, [uniqueBranchTransfers]);

  const cashierTransferSummaries = useMemo(() => {
    return branchCashiers.map((c) => {
      const isBandar = mutasiSession?.bandarUserId === c.id;
      const received = branchTransfers.filter((t) => t.userId === c.id && t.direction === 'IN');
      const sent = branchTransfers.filter((t) => t.userId === c.id && t.direction === 'OUT');

      const modalReceivedSah = received
        .filter((t) => t.transferType === 'MODAL' && t.status === 'CONFIRMED')
        .reduce((acc, t) => acc + t.amount, 0);

      const modalReceivedPending = received
        .filter((t) => t.transferType === 'MODAL' && t.status === 'PENDING')
        .reduce((acc, t) => acc + t.amount, 0);

      const setorSentSah = sent
        .filter((t) => t.transferType === 'SETOR' && t.status === 'CONFIRMED')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

      const setorSentPending = sent
        .filter((t) => t.transferType === 'SETOR' && t.status === 'PENDING')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

      const sisaKasir = modalReceivedSah - setorSentSah;

      return {
        cashier: c,
        isBandar,
        modalReceivedSah,
        modalReceivedPending,
        setorSentSah,
        setorSentPending,
        sisaKasir,
      };
    });
  }, [branchCashiers, branchTransfers, mutasiSession]);

  const displayedTransfers = useMemo(() => {
    return uniqueBranchTransfers
      .filter((t) => mutasiStatusFilter === 'ALL' || t.status === mutasiStatusFilter)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [uniqueBranchTransfers, mutasiStatusFilter]);

  const pendingBranchTransfersCount = useMemo(() => {
    return uniqueBranchTransfers.filter((t) => t.status === 'PENDING').length;
  }, [uniqueBranchTransfers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengawasan Mutasi Modal & Setoran Cabang</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring serah terima modal kasir bandar dan pengembalian setoran kasir harian secara transparan.
              </p>
            </div>
          </div>

          {mutasiSession ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span>Bandar: {mutasiSession.bandarUserName || 'Kasir Bandar'}</span>
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Sesi Belum Dibuka untuk Tanggal Ini</span>
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Tanggal Bisnis:</span>
            <input
              type="date"
              value={mutasiDateFilter}
              onChange={(e) => setMutasiDateFilter(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setMutasiDateFilter(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                mutasiDateFilter === new Date().toISOString().split('T')[0]
                  ? 'bg-indigo-600 text-white border-indigo-700 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setMutasiDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                mutasiDateFilter === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-700 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Semua Tanggal
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'CONFIRMED', 'PENDING', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setMutasiStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  mutasiStatusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st === 'CONFIRMED' ? 'Sah' : st === 'PENDING' ? 'Pending' : 'Ditolak'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MutasiMetricsCards
        mutasiMetrics={mutasiMetrics}
        pendingBranchTransfersCount={pendingBranchTransfersCount}
      />

      <CashierTransferSummariesTable
        summaries={cashierTransferSummaries}
        mutasiDateFilter={mutasiDateFilter}
      />

      <MutasiLogTable
        displayedTransfers={displayedTransfers}
      />
    </div>
  );
};
