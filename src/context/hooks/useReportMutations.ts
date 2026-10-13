import React from 'react';
import { 
  CashReport, 
  AuditLogEntry, 
  CashDenominationItem, 
  Branch, 
  User, 
  DenomConfig, 
  BranchCashSession 
} from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { generateUUID } from '../types';

export const useReportMutations = (
  currentUser: User,
  currentBranch: Branch | undefined,
  branches: Branch[],
  masterDenoms: DenomConfig[],
  reportsRef: React.MutableRefObject<CashReport[]>,
  updateReportsState: (updater: (prev: CashReport[]) => CashReport[]) => void,
  cashSessionsRef: React.MutableRefObject<BranchCashSession[]>,
  addLog: (action: AuditLogEntry['action'], report: CashReport, summary: string) => void,
  triggerRealtimeBroadcast: () => void
) => {
  // 1. Create Report (Kasir)
  const createReport = (businessDate: string, notes?: string): CashReport => {
    if (currentUser.role !== 'KASIR') {
      throw new Error('Akses ditolak: Hanya role Kasir yang berwenang membuat laporan kas baru.');
    }

    const branch = currentBranch || branches[0] || {
      id: currentUser.branchId || 'br-01',
      code: 'CBG-01',
      name: currentUser.branchName || 'Cabang Utama',
      address: 'Alamat Cabang',
      status: 'ACTIVE' as const,
    };

    const existingReport = reportsRef.current.find(
      r => r.cashierId === currentUser.id && r.businessDate === businessDate
    );
    if (existingReport) {
      return existingReport;
    }

    const activeSession = cashSessionsRef.current.find(
      s => s.branchId === branch.id && s.businessDate === businessDate
    );

    const dateParts = businessDate.split('-');
    const yy = dateParts[0].length >= 4 ? dateParts[0].slice(-2) : dateParts[0];
    const mm = dateParts[1] || '01';
    const dd = dateParts[2] || '01';
    const yyMMdd = `${yy}${mm}${dd}`;

    const branchCodeClean = (branch.code || 'BR').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cashierUniq = (currentUser.username || currentUser.email?.split('@')[0] || currentUser.name || 'KASIR')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    const reportNumber = `CR-${yyMMdd}-${branchCodeClean}-${cashierUniq}`;

    const defaultDenoms: CashDenominationItem[] = (masterDenoms || []).map(d => ({
      denomId: d.id,
      denomCode: d.code,
      denomLabel: d.label,
      denomType: d.type,
      denomValue: d.nominal || undefined,
      subtotal: 0,
      calculatedPcs: 0,
      breakdown: [],
    }));

    const newReport: CashReport = {
      id: generateUUID(),
      cashSessionId: activeSession ? activeSession.id : undefined,
      reportNumber,
      businessDate,
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      status: 'DRAFT',
      submittedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      denominations: defaultDenoms,
      totalCash: 0,
      nonCashTransactions: [],
      totalNonCash: 0,
      totalPhysical: 0,
      computerCashTunai: null,
      computerCashNonTunai: null,
      computerCashTotal: null,
      varianceTunai: null,
      varianceNonTunai: null,
      variance: null,
      createdDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: notes || '',
    };

    updateReportsState(prev => [newReport, ...prev]);
    addLog('CREATE_REPORT', newReport, `Membuat laporan kas ${reportNumber} (status DRAFT)`);
    supabaseService.createReport(newReport);

    return newReport;
  };

  // 2. Update Denominations (Kasir)
  const updateReportDenominations = (reportId: string, denoms: CashDenominationItem[]) => {
    if (currentUser.role !== 'KASIR') return;

    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId || r.status === 'APPROVED') return r;

      const totalCash = denoms.reduce((acc, curr) => acc + curr.subtotal, 0);
      const totalPhysical = totalCash + r.totalNonCash;
      const varianceTunai = r.computerCashTunai !== null ? totalCash - r.computerCashTunai : null;
      const varianceNonTunai = r.computerCashNonTunai !== null ? r.totalNonCash - r.computerCashNonTunai : null;
      const variance = r.computerCashTotal !== null ? totalPhysical - r.computerCashTotal : null;

      return {
        ...r,
        denominations: denoms,
        totalCash,
        totalPhysical,
        varianceTunai,
        varianceNonTunai,
        variance,
        updatedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
    }));

    supabaseService.updateDenominations(reportId, denoms);
  };

  // 3. Submit Report (Kasir)
  const submitReport = (reportId: string): boolean => {
    if (currentUser.role !== 'KASIR') return false;

    let success = false;
    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId || r.status === 'APPROVED') return r;

      success = true;
      const submittedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updated: CashReport = {
        ...r,
        status: 'SUBMITTED',
        submittedDate,
        updatedDate: submittedDate,
      };

      addLog('SUBMIT_REPORT', updated, `Submit laporan kas ${r.reportNumber} oleh kasir ${currentUser.name}`);
      return updated;
    }));

    supabaseService.submitReport(reportId);
    triggerRealtimeBroadcast();
    return success;
  };

  // 4. Resubmit Revision (Kasir)
  const resubmitRevision = async (reportId: string): Promise<boolean> => {
    if (currentUser.role !== 'KASIR') return false;

    let success = false;
    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId || r.status === 'APPROVED') return r;

      success = true;
      const updatedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updated: CashReport = {
        ...r,
        status: 'DRAFT',
        updatedDate,
      };

      addLog('SUBMIT_REPORT', updated, `Kasir ${currentUser.name} telah menyelesaikan revisi laporan ${r.reportNumber} dan meminta Audit memeriksa kembali.`);
      return updated;
    }));

    await supabaseService.updateReportStatus(reportId, 'DRAFT');
    triggerRealtimeBroadcast();
    return success;
  };

  return {
    createReport,
    updateReportDenominations,
    submitReport,
    resubmitRevision,
  };
};
