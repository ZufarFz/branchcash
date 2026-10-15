import React, { useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport } from '../../../types';
import { AuditDashboardSessionSection } from '../components/dashboard/AuditDashboardSessionSection';
import { AuditDashboardSummaryKpi } from '../components/dashboard/AuditDashboardSummaryKpi';
import { AuditDashboardPosTable } from '../components/dashboard/AuditDashboardPosTable';
import { Layers } from 'lucide-react';

interface AuditCabangDashboardTabProps {
  onOpenInputModal: (report: CashReport) => void;
  onOpenBatchModal: () => void;
}

export const AuditCabangDashboardTab: React.FC<AuditCabangDashboardTabProps> = ({
  onOpenInputModal,
  onOpenBatchModal,
}) => {
  const { 
    currentUser, 
    currentBranch, 
    reports, 
    cashSessions, 
    allUsers, 
    selectedDate, 
    openCashSession,
    updateCashSessionBandar,
    updateSessionBeginningCash,
    inputComputerCash,
  } = useApp();

  const isAuditCabangRole = currentUser.role === 'AUDIT_CABANG' || currentUser.role === 'AUDIT_PUSAT' || currentUser.role === 'AUDIT_PUSAT_ADMIN';
  const currentBranchId = currentUser.branchId || currentBranch?.id;

  // Sesi pada tanggal aktif
  const targetSession = useMemo(() => {
    return cashSessions.find(
      (s) => (s.branchId === currentBranchId || !currentBranchId) && s.businessDate === selectedDate
    );
  }, [cashSessions, currentBranchId, selectedDate]);

  const isSessionLocked = useMemo(() => {
    if (!targetSession) return false;
    return Boolean(targetSession.transferCount !== undefined && targetSession.transferCount > 0);
  }, [targetSession]);

  // List Kasir & SPV di Cabang
  const branchCashiers = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === 'KASIR' && (!currentBranchId || u.branchId === currentBranchId)
    );
  }, [allUsers, currentBranchId]);

  const branchSpvs = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === 'SPV' && (!currentBranchId || u.branchId === currentBranchId)
    );
  }, [allUsers, currentBranchId]);

  // Laporan kasir cabang pada tanggal terpilih
  const branchReports = useMemo(() => {
    return reports.filter(
      (r) => (r.branchId === currentBranchId || !currentBranchId) && r.businessDate === selectedDate
    );
  }, [reports, currentBranchId, selectedDate]);

  // Perhitungan KPI Ringkasan
  const totalPhysical = useMemo(() => {
    return branchReports.reduce((acc, r) => acc + (r.totalPhysical || 0), 0);
  }, [branchReports]);

  const totalPos = useMemo(() => {
    return branchReports.reduce((acc, r) => {
      const t = r.computerCashTunai !== null && r.computerCashTunai !== undefined ? r.computerCashTunai : (r.computerCashTotal || 0);
      const nt = r.computerCashNonTunai || 0;
      return acc + (t + nt);
    }, 0);
  }, [branchReports]);

  const variance = useMemo(() => {
    const hasAnyPos = branchReports.some(r => r.computerCashTotal !== null || r.computerCashTunai !== null);
    if (!hasAnyPos) return null;
    return totalPhysical - totalPos;
  }, [branchReports, totalPhysical, totalPos]);

  const balancedCount = useMemo(() => {
    return branchReports.filter(r => (r.computerCashTotal !== null || r.computerCashTunai !== null) && (r.variance === 0 || (r.totalPhysical - ((r.computerCashTunai || 0) + (r.computerCashNonTunai || 0))) === 0)).length;
  }, [branchReports]);

  const unbalancedCount = useMemo(() => {
    return branchReports.filter(r => (r.computerCashTotal !== null || r.computerCashTunai !== null) && (r.variance !== 0 && (r.totalPhysical - ((r.computerCashTunai || 0) + (r.computerCashNonTunai || 0))) !== 0)).length;
  }, [branchReports]);

  // Handler simpan sesi
  const handleSaveSession = async (bandarId: string, spvId: string | null, beginningCash: number) => {
    let resBandar: { success: boolean; error?: string };
    if (targetSession) {
      resBandar = await updateCashSessionBandar(targetSession.id, bandarId, spvId);
      if (resBandar.success && beginningCash !== (targetSession.computerBeginningCash || 0)) {
        await updateSessionBeginningCash(targetSession.id, beginningCash);
      }
    } else {
      resBandar = await openCashSession({
        businessDate: selectedDate,
        bandarUserId: bandarId,
        actingCashierUserId: spvId,
        computerBeginningCash: beginningCash,
      });
    }
    return resBandar;
  };

  // Handler simpan POS baris tabel
  const handleSaveRowPos = async (reportId: string, tunai: number, nonTunai: number) => {
    const res = await inputComputerCash(reportId, tunai, nonTunai);
    return { success: res.success, message: res.message };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Blok Otorisasi Sesi, Bandar, SPV (hidden default), & Saldo Awal */}
      <AuditDashboardSessionSection
        targetDate={selectedDate}
        targetSession={targetSession}
        isSessionLocked={isSessionLocked}
        branchCashiers={branchCashiers}
        branchSpvs={branchSpvs}
        isAuditCabangRole={isAuditCabangRole}
        onSaveSession={handleSaveSession}
      />

      {/* 2. KPI Ringkasan */}
      <AuditDashboardSummaryKpi
        totalPhysical={totalPhysical}
        totalPos={totalPos}
        variance={variance}
        reportsCount={branchReports.length}
        balancedCount={balancedCount}
        unbalancedCount={unbalancedCount}
      />

      {/* 3. Action Bar Mini & Tabel Interaktif POS Kasir */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs font-bold text-slate-700">
          Daftar Kasir & Rekonsiliasi Real-Time
        </span>
        <button
          type="button"
          onClick={onOpenBatchModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Batch Input POS</span>
        </button>
      </div>

      <AuditDashboardPosTable
        reports={branchReports}
        isAuditCabangRole={isAuditCabangRole}
        onSaveRowPos={handleSaveRowPos}
        onOpenModal={onOpenInputModal}
      />
    </div>
  );
};
