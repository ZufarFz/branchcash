import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CashReport, DenomConfig, DenomBreakdownItem } from '../../types';
import { PenunjukanBandarTab } from './tabs/PenunjukanBandarTab';
import { MutasiKasTab } from './tabs/MutasiKasTab';
import { RekapitulasiTab } from './tabs/RekapitulasiTab';
import { KasOperasionalTab } from './tabs/KasOperasionalTab';
import { InputComputerCashModal } from './modals/InputComputerCashModal';
import { BatchComputerCashModal } from './modals/BatchComputerCashModal';
import { CellPopover, CellPopoverData } from './modals/CellPopover';

interface AuditCabangViewProps {
  initialTab?: 'bandar' | 'mutasi' | 'rekap' | 'operasional';
}

export const AuditCabangView: React.FC<AuditCabangViewProps> = ({ 
  initialTab = 'bandar' 
}) => {
  const { currentUser, reports } = useApp();
  const isAuditCabangRole = currentUser.role === 'AUDIT_CABANG' || currentUser.role === 'AUDIT_PUSAT' || currentUser.role === 'AUDIT_PUSAT_ADMIN';

  // Active Tab: dikontrol via Sidebar
  const [activeAuditTab, setActiveAuditTab] = useState<'bandar' | 'mutasi' | 'rekap' | 'operasional'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveAuditTab(initialTab);
    }
  }, [initialTab]);

  // Modal Input Computer Cash (Single)
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<CashReport | null>(null);

  // Modal Batch Input Computer Cash
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);

  // Cell Popover State
  const [activeCellPopover, setActiveCellPopover] = useState<CellPopoverData | null>(null);

  // Click outside listener for Cell Popover
  useEffect(() => {
    if (!activeCellPopover) return;

    const handleWindowMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('#light-cell-popover')) return;
      if (activeCellPopover.anchorEl && activeCellPopover.anchorEl.contains(target)) return;
      setActiveCellPopover(null);
    };

    window.addEventListener('mousedown', handleWindowMouseDown);
    return () => window.removeEventListener('mousedown', handleWindowMouseDown);
  }, [activeCellPopover]);

  const handleOpenInputModal = (report: CashReport) => {
    if (!isAuditCabangRole) {
      alert('Hanya role Audit Cabang yang berwenang memproses laporan cabang.');
      return;
    }
    setSelectedReport(report);
    setIsInputModalOpen(true);
  };

  const handleOpenBatchModal = () => {
    if (!isAuditCabangRole) {
      alert('Hanya role Audit Cabang yang berwenang memproses laporan cabang.');
      return;
    }
    setIsBatchModalOpen(true);
  };

  const handleCellClick = (
    e: React.MouseEvent,
    id: string,
    cashierName: string,
    master: DenomConfig,
    dData: { subtotal: number; calculatedPcs?: number; breakdown?: DenomBreakdownItem[] },
    singleItem?: DenomBreakdownItem
  ) => {
    e.stopPropagation();
    if (activeCellPopover && activeCellPopover.id === id) {
      setActiveCellPopover(null);
      return;
    }

    const currentTarget = e.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();

    setActiveCellPopover({
      id,
      anchorEl: currentTarget,
      rect,
      cashierName,
      master,
      subtotal: dData.subtotal,
      calculatedPcs: dData.calculatedPcs,
      breakdown: dData.breakdown || [],
      singleItem,
    });
  };

  const branchReports = reports.filter(
    (r) => r.branchId === currentUser.branchId || (!currentUser.branchId && true)
  );

  return (
    <div className="space-y-6">
      {activeAuditTab === 'bandar' && <PenunjukanBandarTab />}
      
      {activeAuditTab === 'mutasi' && <MutasiKasTab />}
      
      {activeAuditTab === 'operasional' && <KasOperasionalTab />}
      
      {activeAuditTab === 'rekap' && (
        <RekapitulasiTab
          onOpenBatchModal={handleOpenBatchModal}
          onOpenInputModal={handleOpenInputModal}
          activeCellPopover={activeCellPopover}
          onCellClick={handleCellClick}
        />
      )}

      {/* Modal Single Input Computer Cash */}
      <InputComputerCashModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
      />

      {/* Modal Batch Input Computer Cash */}
      <BatchComputerCashModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        filteredReports={branchReports}
        selectedDate={branchReports[0]?.businessDate || new Date().toISOString().split('T')[0]}
      />

      {/* Popover Breakdown Cell */}
      <CellPopover
        data={activeCellPopover}
        onClose={() => setActiveCellPopover(null)}
      />
    </div>
  );
};
export default AuditCabangView;
