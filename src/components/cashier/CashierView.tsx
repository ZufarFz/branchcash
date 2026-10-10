import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CashReport } from '../../types';
import { formatDate } from '../../utils/formatters';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { getActiveBankGroups, isBankMatch, isMethodMatch } from './utils/cashierNonCashHelpers';
import { CashierTransfersTab } from './tabs/CashierTransfersTab';
import { CashierCashTab } from './tabs/CashierCashTab';
import { CashierNonCashTab } from './tabs/CashierNonCashTab';
import { CashierBottomSummary } from './components/CashierBottomSummary';
import { CashierReportHeader } from './components/CashierReportHeader';
import { CashierModals } from './components/CashierModals';
import { useCashierTransfers } from './hooks/useCashierTransfers';
import { useCashierDenominations } from './hooks/useCashierDenominations';
import { useCashierNonCash } from './hooks/useCashierNonCash';

export interface CashierViewProps {
  initialMode?: 'all' | 'cash' | 'non-cash' | 'transfers';
}

export const CashierView: React.FC<CashierViewProps> = ({ 
  initialMode = 'transfers' 
}) => {
  const { 
    currentUser, 
    reports, 
    banks, 
    paymentMethods,
    createReport, 
    resubmitRevision,
    refreshFromSupabase
  } = useApp();

  const isCashierRole = currentUser.role === 'KASIR';

  const [activeSection, setActiveSection] = useState<'transfers' | 'cash' | 'non-cash'>(() => {
    if (initialMode === 'cash') return 'cash';
    if (initialMode === 'non-cash') return 'non-cash';
    return 'transfers';
  });

  useEffect(() => {
    if (initialMode === 'cash') {
      setActiveSection('cash');
    } else if (initialMode === 'non-cash') {
      setActiveSection('non-cash');
    } else {
      setActiveSection('transfers');
    }
  }, [initialMode]);

  const myReports = reports.filter((r) => {
    if (currentUser.role === 'KASIR') {
      return r.cashierId === currentUser.id;
    }
    return r.cashierId === currentUser.id || r.branchId === currentUser.branchId;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const cashierReports = reports.filter((r) => r.cashierId === currentUser.id);
    if (cashierReports.length > 0) {
      const sorted = [...cashierReports].sort((a, b) => b.businessDate.localeCompare(a.businessDate));
      return sorted[0].businessDate;
    }
    return new Date().toISOString().split('T')[0];
  });

  const [hasAutoSetLatestDate, setHasAutoSetLatestDate] = useState<boolean>(false);

  useEffect(() => {
    if (!hasAutoSetLatestDate && myReports.length > 0) {
      const sorted = [...myReports].sort((a, b) => b.businessDate.localeCompare(a.businessDate));
      if (sorted[0]?.businessDate) {
        setSelectedDate(sorted[0].businessDate);
        setHasAutoSetLatestDate(true);
      }
    }
  }, [myReports, hasAutoSetLatestDate]);

  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
    setHasAutoSetLatestDate(true);

    const foundLocal = myReports.some((r) => r.businessDate === newDate);
    if (!foundLocal) {
      await refreshFromSupabase();
    }
  };

  const activeReport = myReports.find((r) => r.businessDate === selectedDate) || null;
  const isLocked = activeReport?.status === 'APPROVED';

  // Sub-hooks
  const transfers = useCashierTransfers(selectedDate);

  const ensureActiveReport = (): CashReport => {
    if (activeReport) return activeReport;
    if (!transfers.currentSession) {
      alert('Sesi kas cabang untuk tanggal ini belum dibuka oleh Audit Cabang. Mohon tunggu penunjukan Kasir Bandar.');
      throw new Error('Sesi kas cabang belum dibuka.');
    }
    return createReport(selectedDate);
  };

  const denoms = useCashierDenominations(activeReport, ensureActiveReport, isLocked);
  const nonCash = useCashierNonCash(activeReport, ensureActiveReport);

  const [isSubmittingRevision, setIsSubmittingRevision] = useState<boolean>(false);
  const handleResubmitRevision = async () => {
    if (!activeReport) return;
    setIsSubmittingRevision(true);
    try {
      const ok = await resubmitRevision(activeReport.id);
      if (ok) {
        alert('Revisi berhasil dikirim! Status laporan kini kembali ke DRAFT. Pihak Audit telah diberitahu untuk melakukan verifikasi kembali.');
      }
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const activeBankGroups = getActiveBankGroups(activeReport, banks, paymentMethods);
  const filteredBatchTxs = (activeReport?.nonCashTransactions || []).filter(
    (tx) => isBankMatch(tx.bank, nonCash.batchBank, banks) && isMethodMatch(tx.paymentMethod, nonCash.batchMethod, paymentMethods)
  );

  return (
    <div className="space-y-6">
      {!isCashierRole && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">Mode Pratinjau (Role: {currentUser.role})</h4>
            <p>
              Sesuai ketentuan PRD Bab 2, pembuatan laporan kas, pengisian fisik pecahan rupiah, serta pencatatan transaksi non-tunai merupakan wewenang eksklusif <strong>Kasir</strong>. Akses input pada halaman ini dinonaktifkan untuk peran Anda.
            </p>
          </div>
        </div>
      )}

      {activeSection === 'transfers' ? (
        <CashierTransfersTab
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onOpenTransferModal={transfers.handleOpenTransferModal}
        />
      ) : (
        <>
          {!transfers.currentSession ? (
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 shadow-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-950">Sesi Kas Cabang Belum Dibuka</h4>
                <p className="text-xs text-amber-900">
                  Audit Cabang belum membuka sesi dan menunjuk Kasir Bandar untuk tanggal <strong>{formatDate(selectedDate)}</strong>. Pembuatan laporan kas fisik dan non-tunai terkunci hingga sesi dibuka.
                </p>
              </div>
            </div>
          ) : transfers.pendingReceivedTransfers.length > 0 ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Perhatian: Anda memiliki <strong>{transfers.pendingReceivedTransfers.length} transfer kas masuk</strong> yang menunggu konfirmasi fisik uang.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('transfers')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors cursor-pointer"
              >
                Buka Tab Modal & Setor ➔
              </button>
            </div>
          ) : null}

          <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs ${!transfers.currentSession ? 'opacity-60 pointer-events-none select-none' : ''}`}>
            <CashierReportHeader
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              activeReport={activeReport}
              activeSection={activeSection}
              isLocked={isLocked}
              onOpenBatchModal={() => {
                nonCash.setShowBatchNonCashModal(true);
                setTimeout(() => nonCash.batchInputRef.current?.focus(), 80);
              }}
            />

            <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {activeSection === 'cash' ? (
                <CashierCashTab
                  activeReport={activeReport}
                  ensureActiveReport={ensureActiveReport}
                  activeMasterList={denoms.activeMasterList}
                  isLocked={isLocked}
                  isCashierRole={isCashierRole}
                  activeCellPopover={denoms.activeCellPopover}
                  onCellClick={denoms.handleCellClick}
                  onOpenBreakdownModal={denoms.handleOpenBreakdownModal}
                />
              ) : (
                <CashierNonCashTab
                  activeReport={activeReport}
                  onSelectDetail={nonCash.setSelectedBankMethodDetail}
                />
              )}

              <CashierBottomSummary
                activeReport={activeReport}
                onResubmitRevision={handleResubmitRevision}
                isSubmittingRevision={isSubmittingRevision}
              />
            </div>
          </div>
        </>
      )}

      <CashierModals
        activeReport={activeReport}
        banks={banks}
        paymentMethods={paymentMethods}
        selectedDate={selectedDate}
        isLocked={isLocked}
        isCashierRole={isCashierRole}
        transfers={transfers}
        denoms={denoms}
        nonCash={nonCash}
        activeBankGroups={activeBankGroups}
        filteredBatchTxs={filteredBatchTxs}
      />
    </div>
  );
};
