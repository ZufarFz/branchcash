import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CashReport, CashDenominationItem } from '../../types';
import { exportReportsToCSV, triggerPrintReport } from '../../utils/exportUtils';

import { AuditPusatHeader } from './components/AuditPusatHeader';
import { AuditPusatFilterBar } from './components/AuditPusatFilterBar';
import { AuditPusatTable } from './components/AuditPusatTable';
import { ReportDetailModal } from './modals/ReportDetailModal';
import { RejectReportModal } from './modals/RejectReportModal';
import { ForceEditModal } from './modals/ForceEditModal';
import { UserApprovalModal } from './modals/UserApprovalModal';
import { MasterDataModal } from './master/MasterDataModal';

export const AuditPusatView: React.FC<{ onNavigateToAuditLog?: () => void }> = () => {
  const { 
    currentUser, 
    reports, 
    branches, 
    allUsers, 
    approveUser, 
    rejectUser, 
    approveReport, 
    rejectReport, 
    forceEditReport 
  } = useApp();

  // Modals & User state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [isMasterDataModalOpen, setIsMasterDataModalOpen] = useState(false);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Report Modals state
  const [detailReport, setDetailReport] = useState<CashReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<CashReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [forceEditTarget, setForceEditTarget] = useState<CashReport | null>(null);
  const [forceEditDenoms, setForceEditDenoms] = useState<CashDenominationItem[]>([]);
  const [forceEditComputerCashTunai, setForceEditComputerCashTunai] = useState<string>('');
  const [forceEditComputerCashNonTunai, setForceEditComputerCashNonTunai] = useState<string>('');
  const [forceEditReason, setForceEditReason] = useState<string>('');
  const [isForceEditModalOpen, setIsForceEditModalOpen] = useState(false);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedBranch !== 'ALL' && r.branchCode !== selectedBranch) return false;
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      if (dateFilter && r.businessDate !== dateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNum = r.reportNumber.toLowerCase().includes(q);
        const matchesCashier = r.cashierName.toLowerCase().includes(q);
        const matchesBranch = r.branchName.toLowerCase().includes(q);
        if (!matchesNum && !matchesCashier && !matchesBranch) return false;
      }
      return true;
    });
  }, [reports, selectedBranch, selectedStatus, dateFilter, searchQuery]);

  // Global KPIs
  const totalReportsCount = reports.length;
  const pendingApprovalCount = reports.filter((r) => r.status === 'DRAFT').length;
  const approvedCount = reports.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = reports.filter((r) => r.status === 'REJECTED').length;
  const totalPhysicalAll = reports.reduce((acc, curr) => acc + curr.totalPhysical, 0);
  const pendingUsersCount = allUsers.filter(u => u.status === 'PENDING').length;

  const isAuditPusat = currentUser.role === 'AUDIT_PUSAT';

  // Handlers for user approvals
  const handleApproveUser = async (userId: string) => {
    setProcessingUserId(userId);
    await approveUser(userId);
    setProcessingUserId(null);
  };

  const handleRejectUser = async (userId: string) => {
    setProcessingUserId(userId);
    await rejectUser(userId);
    setProcessingUserId(null);
  };

  // Handlers for report review
  const handleApprove = (report: CashReport) => {
    if (!isAuditPusat) {
      alert('Hanya role Audit Pusat yang berwenang melakukan approval final (PRD Bab 2 & 10).');
      return;
    }
    if (confirm(`Setujui laporan kas ${report.reportNumber}?\nSetelah disetujui, laporan akan OTOMATIS TERKUNCI (LOCKED).`)) {
      approveReport(report.id);
      setIsDetailModalOpen(false);
    }
  };

  const handleOpenReject = (report: CashReport) => {
    if (!isAuditPusat) {
      alert('Hanya role Audit Pusat yang berwenang melakukan reject laporan (PRD Bab 2 & 10).');
      return;
    }
    setRejectTarget(report);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuditPusat) return;
    if (!rejectTarget || !rejectionReason.trim()) return;
    rejectReport(rejectTarget.id, rejectionReason.trim());
    setIsRejectModalOpen(false);
    setIsDetailModalOpen(false);
  };

  const handleOpenForceEdit = (report: CashReport) => {
    if (!isAuditPusat) {
      alert('Hanya role Audit Pusat yang berwenang melakukan Force Edit pada laporan APPROVED (PRD Bab 2 & 10).');
      return;
    }
    setForceEditTarget(report);
    setForceEditDenoms(JSON.parse(JSON.stringify(report.denominations)));
    setForceEditComputerCashTunai(report.computerCashTunai !== null && report.computerCashTunai !== undefined ? report.computerCashTunai.toString() : '');
    setForceEditComputerCashNonTunai(report.computerCashNonTunai !== null && report.computerCashNonTunai !== undefined ? report.computerCashNonTunai.toString() : '');
    setForceEditReason('');
    setIsForceEditModalOpen(true);
  };

  const handleForceEditDenomSubtotal = (denomId: string, rawVal: string) => {
    const num = Math.max(0, parseInt(rawVal.replace(/[^0-9]/g, ''), 10) || 0);
    setForceEditDenoms((prev) =>
      prev.map((d) => {
        if ((d.denomId && d.denomId === denomId) || (d.denomValue && `denom-${d.denomValue}` === denomId)) {
          const calculatedPcs = (d.denomValue && d.denomValue > 0) ? Math.floor(num / d.denomValue) : undefined;
          return { ...d, subtotal: num, calculatedPcs };
        }
        return d;
      })
    );
  };

  const handleConfirmForceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuditPusat || !forceEditTarget || !forceEditReason.trim()) return;

    const numCompCashTunai = forceEditComputerCashTunai !== '' ? parseFloat(forceEditComputerCashTunai) : undefined;
    const numCompCashNonTunai = forceEditComputerCashNonTunai !== '' ? parseFloat(forceEditComputerCashNonTunai) : undefined;

    forceEditReport(
      forceEditTarget.id,
      {
        denominations: forceEditDenoms,
        computerCashTunai: numCompCashTunai,
        computerCashNonTunai: numCompCashNonTunai,
        notes: forceEditTarget.notes,
      },
      forceEditReason.trim()
    );

    setIsForceEditModalOpen(false);
    setIsDetailModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Realtime KPI Cards */}
      <AuditPusatHeader
        currentUser={currentUser}
        isAuditPusat={isAuditPusat}
        branchesCount={branches.length}
        totalReportsCount={totalReportsCount}
        pendingApprovalCount={pendingApprovalCount}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        totalPhysicalAll={totalPhysicalAll}
        pendingUsersCount={pendingUsersCount}
        onOpenMasterModal={() => setIsMasterDataModalOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onExportCSV={() => exportReportsToCSV(filteredReports)}
        onPrint={triggerPrintReport}
      />

      {/* Filter Bar */}
      <AuditPusatFilterBar
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        branches={branches}
      />

      {/* Reports Table */}
      <AuditPusatTable
        reports={filteredReports}
        isAuditPusat={isAuditPusat}
        onOpenDetail={(r) => {
          setDetailReport(r);
          setIsDetailModalOpen(true);
        }}
        onApprove={handleApprove}
        onOpenReject={handleOpenReject}
        onOpenForceEdit={handleOpenForceEdit}
      />

      {/* Modals */}
      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        report={detailReport}
        onApprove={handleApprove}
        onOpenReject={handleOpenReject}
        onOpenForceEdit={handleOpenForceEdit}
      />

      <RejectReportModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        report={rejectTarget}
        reason={rejectionReason}
        setReason={setRejectionReason}
        onSubmit={handleConfirmReject}
      />

      <ForceEditModal
        isOpen={isForceEditModalOpen}
        onClose={() => setIsForceEditModalOpen(false)}
        report={forceEditTarget}
        denoms={forceEditDenoms}
        onChangeDenomSubtotal={handleForceEditDenomSubtotal}
        computerCashTunai={forceEditComputerCashTunai}
        setComputerCashTunai={setForceEditComputerCashTunai}
        computerCashNonTunai={forceEditComputerCashNonTunai}
        setComputerCashNonTunai={setForceEditComputerCashNonTunai}
        reason={forceEditReason}
        setReason={setForceEditReason}
        onSubmit={handleConfirmForceEdit}
      />

      <UserApprovalModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        allUsers={allUsers}
        currentUser={currentUser}
        onApproveUser={handleApproveUser}
        onRejectUser={handleRejectUser}
        processingUserId={processingUserId}
      />

      <MasterDataModal
        isOpen={isMasterDataModalOpen}
        onClose={() => setIsMasterDataModalOpen(false)}
      />
    </div>
  );
};
