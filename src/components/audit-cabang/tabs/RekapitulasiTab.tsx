import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { formatDate } from '../../../utils/formatters';
import { CashReport, DenomConfig, NonCashTransaction } from '../../../types';
import { RekapKpiCards } from '../components/RekapKpiCards';
import { RekapTunaiTable } from '../components/RekapTunaiTable';
import { RekapNonTunaiTable } from '../components/RekapNonTunaiTable';
import { CellPopoverData } from '../modals/CellPopover';
import { Calendar, Plus } from 'lucide-react';

interface RekapitulasiTabProps {
  onOpenBatchModal: () => void;
  onOpenInputModal: (report: CashReport) => void;
  activeCellPopover: CellPopoverData | null;
  onCellClick: (e: React.MouseEvent, id: string, cashierName: string, master: DenomConfig, dData: any, singleItem?: any) => void;
}

export const RekapitulasiTab: React.FC<RekapitulasiTabProps> = ({
  onOpenBatchModal,
  onOpenInputModal,
  activeCellPopover,
  onCellClick
}) => {
  const { currentUser, reports, masterDenoms, selectedDate } = useApp();

  const [isExpandedDetails, setIsExpandedDetails] = useState<boolean>(false);
  const [posColumnMode, setPosColumnMode] = useState<'KOMPUTER' | 'SELISIH'>('KOMPUTER');

  const branchReports = useMemo(() => {
    return reports.filter(
      (r) => r.branchId === currentUser.branchId || (!currentUser.branchId && true)
    );
  }, [reports, currentUser.branchId]);

  const activeMasterList: DenomConfig[] = useMemo(() => {
    return (masterDenoms && masterDenoms.length > 0)
      ? [...masterDenoms].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
  }, [masterDenoms]);

  const filteredReports = useMemo(() => {
    return branchReports.filter((r) => r.businessDate === selectedDate);
  }, [branchReports, selectedDate]);

  const allNonCashTransactions = useMemo(() => {
    const list: (NonCashTransaction & { reportNumber: string; businessDate: string })[] = [];
    filteredReports.forEach((rep) => {
      (rep.nonCashTransactions || []).forEach((tx) => {
        list.push({
          ...tx,
          reportNumber: rep.reportNumber,
          businessDate: rep.businessDate,
          cashierName: tx.cashierName || rep.cashierName,
        });
      });
    });
    return list;
  }, [filteredReports]);

  const branchTunaiTotal = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.totalCash || 0), 0);
  }, [filteredReports]);

  const branchNonTunaiTotal = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.totalNonCash || 0), 0);
  }, [filteredReports]);

  const branchPhysicalTotal = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.totalPhysical || 0), 0);
  }, [filteredReports]);

  const branchPOSTunaiTotal = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.computerCashTunai !== null && r.computerCashTunai !== undefined ? r.computerCashTunai : (r.computerCashTotal || 0)), 0);
  }, [filteredReports]);

  const branchPOSNonTunaiTotal = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.computerCashNonTunai || 0), 0);
  }, [filteredReports]);

  const branchPOSTotal = useMemo(() => {
    return branchPOSTunaiTotal + branchPOSNonTunaiTotal;
  }, [branchPOSTunaiTotal, branchPOSNonTunaiTotal]);

  const branchVarianceTotal = useMemo(() => {
    const reportsWithPOS = filteredReports.filter(r => r.computerCashTotal !== null);
    if (reportsWithPOS.length === 0) return null;
    const physicalWithPOS = reportsWithPOS.reduce((acc, r) => acc + (r.totalPhysical || 0), 0);
    const posWithPOS = reportsWithPOS.reduce((acc, r) => acc + (r.computerCashTotal || 0), 0);
    return physicalWithPOS - posWithPOS;
  }, [filteredReports]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Control Bar Ringkas */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span>{filteredReports.length} Laporan Kasir</span>
          <span className="text-slate-400 font-normal">({formatDate(selectedDate)})</span>
        </div>

        <button
          id="btn-open-batch-pos"
          type="button"
          onClick={onOpenBatchModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Input Kas Computer</span>
        </button>
      </div>

      <RekapKpiCards
        branchTunaiTotal={branchTunaiTotal}
        filteredReportsCount={filteredReports.length}
        branchNonTunaiTotal={branchNonTunaiTotal}
        nonCashTransactionsCount={allNonCashTransactions.length}
        branchPOSTotal={branchPOSTotal}
        branchPOSTunaiTotal={branchPOSTunaiTotal}
        branchPOSNonTunaiTotal={branchPOSNonTunaiTotal}
        branchPhysicalTotal={branchPhysicalTotal}
        branchVarianceTotal={branchVarianceTotal}
      />

      <RekapTunaiTable
        filteredReports={filteredReports}
        activeMasterList={activeMasterList}
        isExpandedDetails={isExpandedDetails}
        setIsExpandedDetails={setIsExpandedDetails}
        posColumnMode={posColumnMode}
        setPosColumnMode={setPosColumnMode}
        selectedDate={selectedDate}
        branchTunaiTotal={branchTunaiTotal}
        branchPOSTunaiTotal={branchPOSTunaiTotal}
        activeCellPopover={activeCellPopover}
        onCellClick={onCellClick}
        onOpenInputModal={onOpenInputModal}
      />

      <RekapNonTunaiTable
        allNonCashTransactions={allNonCashTransactions}
        branchNonTunaiTotal={branchNonTunaiTotal}
      />
    </div>
  );
};
