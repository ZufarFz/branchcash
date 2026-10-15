import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';

export const useCashierTransfers = (selectedDate: string) => {
  const { 
    currentUser, 
    currentBranch, 
    allUsers, 
    cashSessions, 
    cashTransfers, 
    transferCash, 
    confirmCashTransfer 
  } = useApp();

  const currentBranchId = currentUser.branchId || currentBranch?.id;
  const currentSession = useMemo(() => {
    return cashSessions.find(
      (s) => (s.branchId === currentBranchId || !currentBranchId) && s.businessDate === selectedDate
    ) || null;
  }, [cashSessions, currentBranchId, selectedDate]);

  const isUserBandar = Boolean(currentSession?.bandarUserId && currentSession.bandarUserId === currentUser.id);

  const peerCashiers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        (u.role === 'KASIR' || u.id === currentSession?.actingCashierUserId) &&
        u.id !== currentUser.id &&
        (!currentBranchId || u.branchId === currentBranchId)
    );
  }, [allUsers, currentUser.id, currentBranchId, currentSession]);

  const myTransfers = useMemo(() => {
    return (cashTransfers || []).filter((t) => {
      const matchBranch = !currentBranchId || t.branchId === currentBranchId;
      const matchDate = t.businessDate === selectedDate;
      const isMine = t.userId === currentUser.id || t.partnerUserId === currentUser.id;
      return matchBranch && matchDate && isMine;
    });
  }, [cashTransfers, currentBranchId, currentUser.id, selectedDate]);

  const pendingReceivedTransfers = useMemo(() => {
    return myTransfers.filter(
      (t) => t.userId === currentUser.id && t.direction === 'IN' && t.status === 'PENDING'
    );
  }, [myTransfers, currentUser.id]);

  const pendingOutgoingTransfers = useMemo(() => {
    return myTransfers.filter(
      (t) => t.userId === currentUser.id && t.direction === 'OUT' && t.status === 'PENDING'
    );
  }, [myTransfers, currentUser.id]);

  // Modal State
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferTypeMode, setTransferTypeMode] = useState<'MODAL' | 'SETOR'>('MODAL');
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>('');
  const [transferAmountInput, setTransferAmountInput] = useState<string>('');
  const [transferNotesInput, setTransferNotesInput] = useState<string>('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const handleOpenTransferModal = (type: 'MODAL' | 'SETOR') => {
    setTransferTypeMode(type);
    setTransferAmountInput('');
    setTransferNotesInput('');
    setTransferStatus(null);
    if (type === 'MODAL') {
      if (peerCashiers.length > 0) setTransferTargetUserId(peerCashiers[0].id);
    } else {
      if (currentSession?.bandarUserId) setTransferTargetUserId(currentSession.bandarUserId);
    }
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) {
      alert('Sesi kas cabang belum dibuka.');
      return;
    }
    const cleanNum = parseFloat(transferAmountInput.replace(/[^0-9]/g, '')) || 0;
    if (cleanNum <= 0) {
      setTransferStatus({ type: 'error', message: 'Masukkan nominal transfer yang valid (lebih dari 0).' });
      return;
    }
    if (!transferTargetUserId) {
      setTransferStatus({ type: 'error', message: 'Pilih kasir penerima terlebih dahulu.' });
      return;
    }

    setIsSubmittingTransfer(true);
    setTransferStatus(null);

    const res = await transferCash({
      businessDate: selectedDate,
      toUserId: transferTargetUserId,
      transferType: transferTypeMode,
      amount: cleanNum,
      notes: transferNotesInput.trim() || undefined,
    });

    setIsSubmittingTransfer(false);
    if (!res.success) {
      setTransferStatus({ type: 'error', message: res.error || 'Gagal mengirim transfer kas.' });
    } else {
      setTransferStatus({
        type: 'success',
        message: transferTypeMode === 'MODAL'
          ? `Berhasil menyerahkan modal Rp ${cleanNum.toLocaleString('id-ID')}!`
          : `Berhasil mengirim setoran Rp ${cleanNum.toLocaleString('id-ID')} ke Kasir Bandar!`
      });
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferStatus(null);
      }, 1500);
    }
  };

  return {
    currentSession,
    isUserBandar,
    peerCashiers,
    myTransfers,
    pendingReceivedTransfers,
    pendingOutgoingTransfers,
    showTransferModal,
    setShowTransferModal,
    transferTypeMode,
    transferTargetUserId,
    setTransferTargetUserId,
    transferAmountInput,
    setTransferAmountInput,
    transferNotesInput,
    setTransferNotesInput,
    isSubmittingTransfer,
    transferStatus,
    showHistoryModal,
    setShowHistoryModal,
    handleOpenTransferModal,
    handleExecuteTransfer
  };
};
