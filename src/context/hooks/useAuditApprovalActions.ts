import React from 'react';
import { CashReport, AuditLogEntry, CashDenominationItem, ReportStatus, User } from '../../types';
import { supabaseService } from '../../services/supabaseService';

export const useAuditApprovalActions = (
  currentUser: User,
  setReports: React.Dispatch<React.SetStateAction<CashReport[]>>,
  addLog: (
    action: AuditLogEntry['action'],
    report: CashReport,
    summary: string,
    beforeData?: any,
    afterData?: any,
    reason?: string
  ) => void,
  triggerRealtimeBroadcast: () => void
) => {
  // Approve Report
  const approveReport = async (reportId: string): Promise<boolean> => {
    if (currentUser.role !== 'AUDIT_CABANG' && currentUser.role !== 'AUDIT_PUSAT' && currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return false;
    }

    let success = false;
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;

      success = true;
      const approvedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updated: CashReport = {
        ...r,
        status: 'APPROVED',
        verifiedAt: approvedDate,
        verifiedBy: currentUser.name,
        updatedDate: approvedDate,
      };

      const roleTitle = currentUser.role === 'AUDIT_CABANG' ? 'Audit Cabang' : 'Audit Pusat';
      addLog('APPROVE_REPORT', updated, `${roleTitle} (${currentUser.name}) memberikan Approval. Laporan otomatis terkunci.`);
      return updated;
    }));

    await supabaseService.approveReport(reportId, currentUser.id);
    triggerRealtimeBroadcast();
    return success;
  };

  // Reject Report
  const rejectReport = async (reportId: string, reason: string): Promise<boolean> => {
    if (currentUser.role !== 'AUDIT_CABANG' && currentUser.role !== 'AUDIT_PUSAT' && currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return false;
    }

    let success = false;
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;

      success = true;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updated: CashReport = {
        ...r,
        status: 'REJECTED',
        notes: reason,
        verifiedAt: now,
        verifiedBy: currentUser.name,
        updatedDate: now,
      };

      const roleTitle = currentUser.role === 'AUDIT_CABANG' ? 'Audit Cabang' : 'Audit Pusat';
      addLog('REJECT_REPORT', updated, `${roleTitle} (${currentUser.name}) menolak laporan: "${reason}". Kasir dapat mengedit dan submit ulang.`, undefined, undefined, reason);
      return updated;
    }));

    await supabaseService.rejectReport(reportId, reason, currentUser.id);
    triggerRealtimeBroadcast();
    return success;
  };

  // Update Report Status
  const updateReportStatus = async (reportId: string, status: ReportStatus, reason?: string): Promise<boolean> => {
    if (currentUser.role !== 'AUDIT_CABANG' && currentUser.role !== 'AUDIT_PUSAT' && currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return false;
    }

    if (status === 'APPROVED') {
      return approveReport(reportId);
    }
    if (status === 'REJECTED') {
      return rejectReport(reportId, reason || 'Ditolak oleh Audit Cabang');
    }

    let success = false;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      success = true;
      const updated: CashReport = {
        ...r,
        status,
        updatedDate: now,
      };
      const roleTitle = currentUser.role === 'AUDIT_CABANG' ? 'Audit Cabang' : 'Audit Pusat';
      addLog('UPDATE_STATUS', updated, `${roleTitle} (${currentUser.name}) mengubah status laporan menjadi ${status}`);
      return updated;
    }));

    await supabaseService.updateReportStatus(reportId, status);
    triggerRealtimeBroadcast();
    return success;
  };

  // Force Edit
  const forceEditReport = (
    reportId: string, 
    changes: {
      denominations?: CashDenominationItem[];
      computerCashTunai?: number;
      computerCashNonTunai?: number;
      computerCashTotal?: number;
      notes?: string;
    }, 
    reason: string
  ): boolean => {
    if ((currentUser.role !== 'AUDIT_PUSAT' && currentUser.role !== 'AUDIT_PUSAT_ADMIN') || !reason || reason.trim() === '') {
      return false;
    }

    let success = false;
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;

      success = true;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const beforeSnapshot = {
        denominations: r.denominations,
        totalCash: r.totalCash,
        computerCashTotal: r.computerCashTotal,
        totalPhysical: r.totalPhysical,
        variance: r.variance,
        notes: r.notes,
      };

      const newDenoms = changes.denominations ?? r.denominations;
      const totalCash = newDenoms.reduce((acc, curr) => acc + curr.subtotal, 0);
      const totalPhysical = totalCash + r.totalNonCash;
      
      const computerCashTunai = changes.computerCashTunai !== undefined
        ? changes.computerCashTunai
        : r.computerCashTunai;
      const computerCashNonTunai = changes.computerCashNonTunai !== undefined
        ? changes.computerCashNonTunai
        : r.computerCashNonTunai;
      
      let computerCashTotal = changes.computerCashTotal !== undefined
        ? changes.computerCashTotal
        : (computerCashTunai !== null || computerCashNonTunai !== null
            ? (computerCashTunai || 0) + (computerCashNonTunai || 0)
            : r.computerCashTotal);

      const varianceTunai = computerCashTunai !== null ? totalCash - computerCashTunai : null;
      const varianceNonTunai = computerCashNonTunai !== null ? r.totalNonCash - computerCashNonTunai : null;
      const variance = computerCashTotal !== null ? totalPhysical - computerCashTotal : null;

      const updated: CashReport = {
        ...r,
        denominations: newDenoms,
        totalCash,
        totalPhysical,
        computerCashTunai,
        computerCashNonTunai,
        computerCashTotal,
        varianceTunai,
        varianceNonTunai,
        variance,
        notes: changes.notes !== undefined ? changes.notes : r.notes,
        updatedDate: now,
      };

      const afterSnapshot = {
        denominations: newDenoms,
        totalCash,
        computerCashTotal,
        totalPhysical,
        variance,
        notes: updated.notes,
      };

      addLog(
        'FORCE_EDIT',
        updated,
        `Audit Pusat melakukan Force Edit pada laporan ${r.reportNumber}`,
        beforeSnapshot,
        afterSnapshot,
        reason
      );

      return updated;
    }));

    supabaseService.forceEditReport(
      reportId, 
      { computerCashTotal: changes.computerCashTotal, notes: changes.notes }, 
      reason, 
      currentUser
    );

    return success;
  };

  return {
    approveReport,
    rejectReport,
    updateReportStatus,
    forceEditReport,
  };
};
