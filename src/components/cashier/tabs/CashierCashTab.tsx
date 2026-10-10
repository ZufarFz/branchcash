import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport, DenomConfig, DenomBreakdownItem } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { CashierExcelMatrix } from '../components/CashierExcelMatrix';
import { CashierMobileCashTable } from '../components/CashierMobileCashTable';
import { CashierCellPopoverData } from '../modals/CashierCellPopover';

interface CashierCashTabProps {
  activeReport: CashReport | null;
  ensureActiveReport: () => CashReport;
  activeMasterList: DenomConfig[];
  isLocked: boolean;
  isCashierRole: boolean;
  activeCellPopover: CashierCellPopoverData | null;
  onCellClick: (e: React.MouseEvent<HTMLElement>, id: string, master: DenomConfig, item: DenomBreakdownItem, isImplicit?: boolean) => void;
  onOpenBreakdownModal: (master: DenomConfig) => void;
}

export const CashierCashTab: React.FC<CashierCashTabProps> = ({
  activeReport,
  ensureActiveReport,
  activeMasterList,
  isLocked,
  isCashierRole,
  activeCellPopover,
  onCellClick,
  onOpenBreakdownModal
}) => {
  const { currentUser, updateReportDenominations } = useApp();
  const [denomErrors, setDenomErrors] = useState<Record<string, string>>({});

  const handleSubtotalChange = (master: DenomConfig, rawInput: string) => {
    if (!isCashierRole) {
      alert('Hanya akun dengan peran KASIR yang dapat mengubah denominasi uang (PRD Bab 2).');
      return;
    }
    const report = ensureActiveReport();
    if (report.status === 'APPROVED') return;

    const cleanNum = rawInput === '' ? 0 : Math.max(0, parseInt(rawInput.replace(/[^0-9]/g, ''), 10) || 0);

    let errorMsg = '';
    let calculatedPcs: number | undefined = undefined;

    if (master.type === 'KERTAS' && master.nominal && master.nominal > 0) {
      if (cleanNum > 0) {
        if (cleanNum % master.nominal !== 0) {
          errorMsg = `Nominal tidak pas! Harus kelipatan ${formatCurrency(master.nominal)}`;
        } else {
          calculatedPcs = cleanNum / master.nominal;
        }
      } else {
        calculatedPcs = 0;
      }
    }

    setDenomErrors(prev => {
      const next = { ...prev };
      if (errorMsg) {
        next[master.id] = errorMsg;
      } else {
        delete next[master.id];
      }
      return next;
    });

    const existingList = report.denominations || [];
    let matched = false;

    const nextDenoms = existingList.map(item => {
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
          subtotal: cleanNum,
          calculatedPcs,
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
        subtotal: cleanNum,
        calculatedPcs,
        breakdown: [],
      });
    }

    updateReportDenominations(report.id, nextDenoms);
  };

  const handleQuickAddNominal = (master: DenomConfig, multiplier: number) => {
    if (!master.nominal) return;
    const report = ensureActiveReport();
    const existing = report.denominations?.find(d => d.denomId === master.id);
    const currentSubtotal = existing?.subtotal || 0;
    const addAmount = master.nominal * multiplier;
    handleSubtotalChange(master, String(currentSubtotal + addAmount));
  };

  return (
    <div className="lg:col-span-12 space-y-4">
      <CashierExcelMatrix
        activeReport={activeReport}
        cashierName={activeReport?.cashierName || currentUser.name || 'Kasir'}
        activeMasterList={activeMasterList}
        isLocked={isLocked}
        activeCellPopover={activeCellPopover}
        onCellClick={onCellClick}
        onOpenBreakdownModal={onOpenBreakdownModal}
      />

      <CashierMobileCashTable
        activeReport={activeReport}
        activeMasterList={activeMasterList}
        denomErrors={denomErrors}
        isLocked={isLocked}
        onSubtotalChange={handleSubtotalChange}
        onQuickAddNominal={handleQuickAddNominal}
        onOpenBreakdownModal={onOpenBreakdownModal}
      />
    </div>
  );
};
