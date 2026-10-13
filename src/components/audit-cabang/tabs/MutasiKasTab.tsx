import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { AlertCircle } from 'lucide-react';
import { MutasiMetricsCards } from '../components/MutasiMetricsCards';
import { CashierTransferSummariesTable } from '../components/CashierTransferSummariesTable';
import { MutasiLogTable } from '../components/MutasiLogTable';

export const MutasiKasTab: React.FC = () => {
  const {
    currentUser,
    currentBranch,
    cashSessions,
    cashTransfers,
    allUsers,
    selectedDate
  } = useApp();

  const currentBranchId = currentUser.branchId || currentBranch?.id;
  const [mutasiStatusFilter, setMutasiStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'REJECTED'>('ALL');

  const mutasiSession = useMemo(() => {
    return cashSessions.find(
      (s) => (s.branchId === currentBranchId || !currentBranchId) && s.businessDate === selectedDate
    );
  }, [cashSessions, currentBranchId, selectedDate]);

  const branchCashiers = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === 'KASIR' && (!currentBranchId || u.branchId === currentBranchId)
    );
  }, [allUsers, currentBranchId]);

  const branchTransfers = useMemo(() => {
    return (cashTransfers || []).filter((t) => {
      const matchBranch = !currentBranchId || t.branchId === currentBranchId;
      const matchDate = t.businessDate === selectedDate;
      return matchBranch && matchDate;
    });
  }, [cashTransfers, currentBranchId, selectedDate]);

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
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Sleek Toolbar Status & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {mutasiSession ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Bandar: {mutasiSession.bandarUserName || 'Kasir Bandar'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Sesi Belum Dibuka</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'CONFIRMED', 'PENDING', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setMutasiStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${mutasiStatusFilter === st
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {st === 'ALL' ? 'Semua' : st === 'CONFIRMED' ? 'Sah' : st === 'PENDING' ? 'Pending' : 'Ditolak'}
            </button>
          ))}
        </div>
      </div>

      <MutasiMetricsCards
        mutasiMetrics={mutasiMetrics}
        pendingBranchTransfersCount={pendingBranchTransfersCount}
      />

      <CashierTransferSummariesTable
        summaries={cashierTransferSummaries}
        mutasiDateFilter={selectedDate}
      />

      <MutasiLogTable
        displayedTransfers={displayedTransfers}
      />
    </div>
  );
};

