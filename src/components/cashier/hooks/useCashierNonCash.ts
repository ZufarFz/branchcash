import React, { useState, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport, NonCashTransaction } from '../../../types';
import { formatNumberWithDots } from '../utils/cashierNonCashHelpers';

export const useCashierNonCash = (
  activeReport: CashReport | null,
  ensureActiveReport: () => CashReport
) => {
  const { 
    currentUser, 
    banks, 
    paymentMethods, 
    addNonCashTransaction, 
    deleteNonCashTransaction, 
    updateNonCashTransaction 
  } = useApp();

  const isCashierRole = currentUser.role === 'KASIR';

  // Single Non-Cash Modal
  const [showAddNonCashModal, setShowAddNonCashModal] = useState<boolean>(false);
  const [ncBank, setNcBank] = useState<string>(banks[0]?.name || '');
  const [ncMethod, setNcMethod] = useState<string>(paymentMethods[0]?.name || '');
  const [ncAmount, setNcAmount] = useState<string>('');
  const [isSubmittingNc, setIsSubmittingNc] = useState<boolean>(false);

  // Batch Non-Cash Modal
  const [showBatchNonCashModal, setShowBatchNonCashModal] = useState<boolean>(false);
  const [batchBank, setBatchBank] = useState<string>(banks[0]?.name || '');
  const [batchMethod, setBatchMethod] = useState<string>(paymentMethods[0]?.name || '');
  const [batchAmountInput, setBatchAmountInput] = useState<string>('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);
  const [savingTxIds, setSavingTxIds] = useState<string[]>([]);
  const [lastAddedTxId, setLastAddedTxId] = useState<string | null>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (banks.length > 0 && (!ncBank || !banks.some((b) => b.name === ncBank))) {
      setNcBank(banks[0].name);
    }
    if (banks.length > 0 && (!batchBank || !banks.some((b) => b.name === batchBank))) {
      setBatchBank(banks[0].name);
    }
  }, [banks, ncBank, batchBank]);

  React.useEffect(() => {
    if (paymentMethods.length > 0 && (!ncMethod || !paymentMethods.some((m) => m.name === ncMethod))) {
      setNcMethod(paymentMethods[0].name);
    }
    if (paymentMethods.length > 0 && (!batchMethod || !paymentMethods.some((m) => m.name === batchMethod))) {
      setBatchMethod(paymentMethods[0].name);
    }
  }, [paymentMethods, ncMethod, batchMethod]);

  // Table Sort & Act Mode
  const [tableSortField, setTableSortField] = useState<'no' | 'amount' | 'time'>('no');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');
  const [actMode, setActMode] = useState<'delete' | 'edit'>('delete');

  // Detail Modal
  const [selectedBankMethodDetail, setSelectedBankMethodDetail] = useState<{
    bankCode: string;
    bankName: string;
    methodCode: string;
    methodName: string;
  } | null>(null);

  // Delete & Edit Modals
  const [txToDelete, setTxToDelete] = useState<NonCashTransaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<NonCashTransaction | null>(null);
  const [editAmountInput, setEditAmountInput] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const handleAddNonCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCashierRole) {
      alert('Hanya akun dengan peran KASIR yang dapat menginput transaksi non-tunai (PRD Bab 2).');
      return;
    }
    const report = ensureActiveReport();
    if (report.status === 'APPROVED') {
      alert('Laporan kas sudah disetujui (APPROVED) dan terkunci. Transaksi tidak dapat ditambahkan.');
      return;
    }
    const numAmount = parseFloat(ncAmount.replace(/[^0-9]/g, ''));
    if (!numAmount || numAmount <= 0) {
      alert('Masukkan nominal transaksi non-tunai yang valid.');
      return;
    }

    setIsSubmittingNc(true);
    try {
      const result = await addNonCashTransaction(report.id, {
        bank: ncBank,
        paymentMethod: ncMethod,
        amount: numAmount,
        cashierName: currentUser.name,
      });

      if (result.success) {
        setNcAmount('');
        setShowAddNonCashModal(false);
      }
    } finally {
      setIsSubmittingNc(false);
    }
  };

  const handleBatchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isCashierRole) {
      alert('Hanya akun dengan peran KASIR yang dapat menginput transaksi non-tunai (PRD Bab 2).');
      return;
    }
    const report = ensureActiveReport();
    if (report.status === 'APPROVED') {
      alert('Laporan kas sudah disetujui (APPROVED) dan terkunci. Transaksi tidak dapat ditambahkan.');
      return;
    }

    const rawDigits = batchAmountInput.replace(/[^0-9]/g, '');
    const numAmount = parseFloat(rawDigits);
    if (!numAmount || numAmount <= 0) return;

    const clientTxId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'tx-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);

    setBatchAmountInput('');
    setSavingTxIds((prev) => [...prev, clientTxId]);
    setLastAddedTxId(clientTxId);
    batchInputRef.current?.focus();

    setTimeout(() => {
      const rowElem = document.getElementById(`nc-tx-row-${clientTxId}`);
      if (rowElem) {
        rowElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);

    setTimeout(() => {
      setLastAddedTxId((prev) => (prev === clientTxId ? null : prev));
    }, 2500);

    setIsSubmittingBatch(true);
    try {
      await addNonCashTransaction(
        report.id,
        {
          id: clientTxId,
          bank: batchBank,
          paymentMethod: batchMethod,
          amount: numAmount,
          cashierName: currentUser.name,
        } as any,
        true
      );
    } finally {
      setSavingTxIds((prev) => prev.filter((id) => id !== clientTxId));
      setIsSubmittingBatch(false);
    }
  };

  const handleRetrySaveTx = async (tx: NonCashTransaction) => {
    const report = activeReport || ensureActiveReport();
    if (!report || report.status === 'APPROVED') return;

    setSavingTxIds((prev) => (prev.includes(tx.id) ? prev : [...prev, tx.id]));
    try {
      await addNonCashTransaction(
        report.id,
        {
          id: tx.id,
          bank: tx.bank,
          paymentMethod: tx.paymentMethod,
          amount: tx.amount,
          cashierName: tx.cashierName || currentUser.name,
          createdAt: tx.createdAt,
        } as any,
        true
      );
    } finally {
      setSavingTxIds((prev) => prev.filter((id) => id !== tx.id));
      batchInputRef.current?.focus();
    }
  };

  const handleSort = (field: 'no' | 'amount' | 'time') => {
    if (tableSortField === field) {
      setTableSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortField(field);
      setTableSortDir('asc');
    }
  };

  const handleActHeaderClick = () => {
    setActMode((prev) => (prev === 'delete' ? 'edit' : 'delete'));
  };

  const handleConfirmDeleteNonCash = () => {
    if (!activeReport || !txToDelete) return;
    deleteNonCashTransaction(activeReport.id, txToDelete.id);
    setTxToDelete(null);
    setTimeout(() => batchInputRef.current?.focus(), 50);
  };

  const handleStartEdit = (tx: NonCashTransaction) => {
    setTxToEdit(tx);
    setEditAmountInput(formatNumberWithDots(String(tx.amount)));
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeReport || !txToEdit) return;

    const rawDigits = editAmountInput.replace(/[^0-9]/g, '');
    const numAmount = parseFloat(rawDigits);
    if (!numAmount || numAmount <= 0) {
      alert('Masukkan nominal yang valid');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await updateNonCashTransaction(activeReport.id, txToEdit.id, numAmount);
      setTxToEdit(null);
      setTimeout(() => batchInputRef.current?.focus(), 50);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleBatchBankChange = (bankCode: string) => {
    setBatchBank(bankCode);
    setBatchAmountInput('');
    setTimeout(() => batchInputRef.current?.focus(), 50);
  };

  const handleBatchMethodChange = (methodCode: string) => {
    setBatchMethod(methodCode);
    setBatchAmountInput('');
    setTimeout(() => batchInputRef.current?.focus(), 50);
  };

  const onSelectCombo = (bankCode: string, methodCode: string) => {
    setBatchBank(bankCode);
    setBatchMethod(methodCode);
    setTimeout(() => batchInputRef.current?.focus(), 50);
  };

  return {
    showAddNonCashModal,
    setShowAddNonCashModal,
    ncBank,
    setNcBank,
    ncMethod,
    setNcMethod,
    ncAmount,
    setNcAmount,
    isSubmittingNc,
    handleAddNonCash,
    showBatchNonCashModal,
    setShowBatchNonCashModal,
    batchBank,
    batchMethod,
    batchAmountInput,
    setBatchAmountInput,
    isSubmittingBatch,
    savingTxIds,
    lastAddedTxId,
    batchInputRef,
    tableSortField,
    tableSortDir,
    handleSort,
    actMode,
    handleActHeaderClick,
    handleBatchSubmit,
    handleRetrySaveTx,
    handleBatchBankChange,
    handleBatchMethodChange,
    onSelectCombo,
    selectedBankMethodDetail,
    setSelectedBankMethodDetail,
    txToDelete,
    setTxToDelete,
    handleConfirmDeleteNonCash,
    txToEdit,
    setTxToEdit,
    editAmountInput,
    setEditAmountInput,
    isSubmittingEdit,
    handleStartEdit,
    handleSaveEdit
  };
};
