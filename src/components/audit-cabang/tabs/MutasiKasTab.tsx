import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { BandarTransferSummaryTable, BandarTransferSummaryItem } from '../components/BandarTransferSummaryTable';
import { CashierTransferSummariesTable, CashierTransferSummaryItem } from '../components/CashierTransferSummariesTable';
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

  // 1. Ringkasan Khusus Kasir Bandar
  const bandarTransferSummary = useMemo<BandarTransferSummaryItem | null>(() => {
    if (!mutasiSession?.bandarUserId) return null;
    const bandarUser = allUsers.find((u) => u.id === mutasiSession.bandarUserId);
    if (!bandarUser) return null;

    const modalSent = branchTransfers.filter(
      (t) => t.userId === bandarUser.id && t.direction === 'OUT' && t.transferType === 'MODAL'
    );
    const modalDibagiSah = modalSent
      .filter((t) => t.status === 'CONFIRMED')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const modalDibagiPending = modalSent
      .filter((t) => t.status === 'PENDING')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const setorReceived = branchTransfers.filter(
      (t) => t.userId === bandarUser.id && t.direction === 'IN' && t.transferType === 'SETOR'
    );
    const setoranDiterimaSah = setorReceived
      .filter((t) => t.status === 'CONFIRMED')
      .reduce((acc, t) => acc + t.amount, 0);
    const setoranDiterimaPending = setorReceived
      .filter((t) => t.status === 'PENDING')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const netKas = setoranDiterimaSah - modalDibagiSah;

    return {
      bandar: bandarUser,
      modalDibagiSah,
      modalDibagiPending,
      setoranDiterimaSah,
      setoranDiterimaPending,
      netKas,
    };
  }, [mutasiSession, allUsers, branchTransfers]);

  // 2. Ringkasan Khusus Kasir Harian (Exclude Bandar)
  const cashierTransferSummaries = useMemo<CashierTransferSummaryItem[]>(() => {
    const bandarId = mutasiSession?.bandarUserId;
    const dailyCashiers = branchCashiers.filter((c) => c.id !== bandarId);

    return dailyCashiers.map((c) => {
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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Tabel 1: Ringkasan Khusus Bandar */}
      <BandarTransferSummaryTable
        summary={bandarTransferSummary}
      />

      {/* Tabel 2: Ringkasan Khusus Kasir Harian */}
      <CashierTransferSummariesTable
        summaries={cashierTransferSummaries}
      />

      {/* Tabel 3: Log Transaksi Mutasi dengan Dropdown Filter */}
      <MutasiLogTable
        displayedTransfers={displayedTransfers}
        statusFilter={mutasiStatusFilter}
        onStatusFilterChange={setMutasiStatusFilter}
      />
    </div>
  );
};

