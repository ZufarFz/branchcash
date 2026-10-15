import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport, DenomConfig, DenomBreakdownItem } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { CashierCellPopoverData } from '../modals/CashierCellPopover';
import { DeleteBreakdownTarget } from '../modals/DeleteBreakdownModal';

export const useCashierDenominations = (
  activeReport: CashReport | null,
  ensureActiveReport: () => CashReport,
  isLocked: boolean
) => {
  const { currentUser, cashSessions, selectedDate, masterDenoms, updateReportDenominations } = useApp();
  const isCashierRole = currentUser.role === 'KASIR' || (currentUser.role === 'SPV' && (cashSessions || []).some(s => s.actingCashierUserId === currentUser.id && s.businessDate === selectedDate));

  const activeMasterList = useMemo<DenomConfig[]>(() => {
    if (!Array.isArray(masterDenoms)) return [];

    // ID pecahan yang sudah pernah diisi pada laporan aktif ini (historis tetap muncul)
    const filledDenomIds = new Set(
      (activeReport?.denominations || [])
        .filter((d) => (d.subtotal && d.subtotal > 0) || (d.breakdown && d.breakdown.length > 0))
        .map((d) => d.denomId)
    );

    return [...masterDenoms]
      .filter((m) => m.isActive !== false || filledDenomIds.has(m.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [masterDenoms, activeReport?.denominations]);

  const [activeBreakdownMaster, setActiveBreakdownMaster] = useState<DenomConfig | null>(null);
  const [editingBreakdownItem, setEditingBreakdownItem] = useState<DenomBreakdownItem | null>(null);
  const [inputSubtotalNominal, setInputSubtotalNominal] = useState<string>('');
  const [inputBreakdownNote, setInputBreakdownNote] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<DeleteBreakdownTarget | null>(null);

  const [activeCellPopover, setActiveCellPopover] = useState<CashierCellPopoverData | null>(null);

  useEffect(() => {
    if (!activeCellPopover) return;

    const handleScrollOrResize = () => {
      if (activeCellPopover.anchorEl && document.body.contains(activeCellPopover.anchorEl)) {
        const newRect = activeCellPopover.anchorEl.getBoundingClientRect();
        setActiveCellPopover((prev) => (prev ? { ...prev, rect: newRect } : null));
      } else {
        setActiveCellPopover(null);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('#light-cashier-cell-popover') &&
        !target.closest('[data-cell-popover]') &&
        !activeCellPopover.anchorEl.contains(target)
      ) {
        setActiveCellPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCellPopover?.id]);

  const handleCellClick = (
    e: React.MouseEvent<HTMLElement>,
    id: string,
    master: DenomConfig,
    item: DenomBreakdownItem,
    isImplicit?: boolean
  ) => {
    e.stopPropagation();
    if (activeCellPopover?.id === id) {
      setActiveCellPopover(null);
      return;
    }
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    setActiveCellPopover({
      id,
      anchorEl: target,
      rect,
      master,
      item,
      isImplicit,
    });
  };

  const handleOpenBreakdownModal = (master: DenomConfig, itemToEdit?: DenomBreakdownItem) => {
    setActiveBreakdownMaster(master);
    if (itemToEdit) {
      setEditingBreakdownItem(itemToEdit);
      setInputSubtotalNominal(itemToEdit.subtotal.toString());
      setInputBreakdownNote(itemToEdit.note || '');
    } else {
      setEditingBreakdownItem(null);
      setInputSubtotalNominal('');
      setInputBreakdownNote('');
    }
  };

  const handleSaveBreakdownItem = (master: DenomConfig) => {
    if (!isCashierRole) return;
    const report = ensureActiveReport();
    if (report.status === 'APPROVED') return;

    const cleanNum = inputSubtotalNominal === '' ? 0 : Math.max(0, parseInt(inputSubtotalNominal.replace(/[^0-9]/g, ''), 10) || 0);
    if (cleanNum <= 0) {
      alert('Masukkan nominal lebih dari 0.');
      return;
    }

    if (master.type === 'KERTAS' && master.nominal && master.nominal > 0) {
      if (cleanNum % master.nominal !== 0) {
        alert(`Nominal tidak valid! Pecahan ${master.label} harus kelipatan pas ${formatCurrency(master.nominal)}.`);
        return;
      }
    }

    const calculatedPcs = (master.type === 'KERTAS' && master.nominal && master.nominal > 0)
      ? cleanNum / master.nominal
      : undefined;

    const existingItem = report.denominations?.find((d) => d.denomId === master.id);
    let currentBreakdown = [...(existingItem?.breakdown || [])];

    if (editingBreakdownItem) {
      const isImp = editingBreakdownItem.id.startsWith('implicit-');
      if (isImp || currentBreakdown.length === 0) {
        currentBreakdown = [{
          id: `bd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subtotal: cleanNum,
          calculatedPcs,
          note: inputBreakdownNote.trim() || undefined,
          createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }];
      } else {
        currentBreakdown = currentBreakdown.map((item) => {
          if (item.id === editingBreakdownItem.id) {
            return {
              ...item,
              subtotal: cleanNum,
              calculatedPcs,
              note: inputBreakdownNote.trim() || undefined,
            };
          }
          return item;
        });
      }
    } else {
      if (currentBreakdown.length === 0 && (existingItem?.subtotal || 0) > 0) {
        currentBreakdown = [
          {
            id: `bd-${Date.now() - 1}`,
            subtotal: existingItem!.subtotal,
            calculatedPcs: existingItem!.calculatedPcs,
            createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: `bd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            subtotal: cleanNum,
            calculatedPcs,
            note: inputBreakdownNote.trim() || undefined,
            createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          }
        ];
      } else {
        currentBreakdown.push({
          id: `bd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subtotal: cleanNum,
          calculatedPcs,
          note: inputBreakdownNote.trim() || undefined,
          createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }

    const newTotalSubtotal = currentBreakdown.reduce((acc, curr) => acc + curr.subtotal, 0);
    const newTotalCalculatedPcs = (master.type === 'KERTAS' && master.nominal && master.nominal > 0)
      ? newTotalSubtotal / master.nominal
      : undefined;

    const existingList = report.denominations || [];
    let matched = false;

    const nextDenoms = existingList.map((item) => {
      const isThis = item.denomId === master.id ||
        (item.denomCode && item.denomCode.toUpperCase() === master.code.toUpperCase()) ||
        (master.nominal && item.denomValue === master.nominal);

      if (isThis) {
        matched = true;
        return {
          ...item,
          denomId: master.id,
          denomCode: master.code,
          denomLabel: master.label,
          denomType: master.type,
          denomValue: master.nominal || undefined,
          subtotal: newTotalSubtotal,
          calculatedPcs: newTotalCalculatedPcs,
          breakdown: currentBreakdown,
        };
      }
      return item;
    });

    if (!matched) {
      nextDenoms.push({
        denomId: master.id,
        denomCode: master.code,
        denomLabel: master.label,
        denomType: master.type,
        denomValue: master.nominal || undefined,
        subtotal: newTotalSubtotal,
        calculatedPcs: newTotalCalculatedPcs,
        breakdown: currentBreakdown,
      });
    }

    updateReportDenominations(report.id, nextDenoms);

    setEditingBreakdownItem(null);
    setInputSubtotalNominal('');
    setInputBreakdownNote('');
    setActiveBreakdownMaster(null);
    setActiveCellPopover(null);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete || !activeReport) return;
    const master = itemToDelete.master;
    const existingList = activeReport.denominations || [];

    if (itemToDelete.itemId.startsWith('implicit-')) {
      const nextDenoms = existingList.map((item) =>
        item.denomId === master.id ? { ...item, subtotal: 0, calculatedPcs: 0, breakdown: [] } : item
      );
      updateReportDenominations(activeReport.id, nextDenoms);
    } else {
      const current = existingList.find((d) => d.denomId === master.id);
      const filtered = (current?.breakdown || []).filter((item) => item.id !== itemToDelete.itemId);
      const newTotal = filtered.reduce((acc, curr) => acc + curr.subtotal, 0);
      const newPcs = (master.type === 'KERTAS' && master.nominal && master.nominal > 0)
        ? newTotal / master.nominal
        : undefined;

      const nextDenoms = existingList.map((item) =>
        item.denomId === master.id ? { ...item, subtotal: newTotal, calculatedPcs: newPcs, breakdown: filtered } : item
      );
      updateReportDenominations(activeReport.id, nextDenoms);
    }

    setItemToDelete(null);
    setActiveCellPopover(null);
  };

  const handleCloseBreakdownModal = () => {
    setActiveBreakdownMaster(null);
    setEditingBreakdownItem(null);
    setInputSubtotalNominal('');
    setInputBreakdownNote('');
  };

  return {
    activeMasterList,
    activeBreakdownMaster,
    editingBreakdownItem,
    inputSubtotalNominal,
    setInputSubtotalNominal,
    inputBreakdownNote,
    setInputBreakdownNote,
    itemToDelete,
    setItemToDelete,
    activeCellPopover,
    setActiveCellPopover,
    handleCellClick,
    handleOpenBreakdownModal,
    handleCloseBreakdownModal,
    handleSaveBreakdownItem,
    handleConfirmDelete
  };
};
