import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CashReport, 
  AuditLogEntry, 
  Branch, 
  User, 
  DenomConfig, 
  BranchCashSession 
} from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { STORAGE_KEYS, DUMMY_REPORT_IDS, DUMMY_LOG_IDS } from '../types';
import { useReportMutations } from './useReportMutations';
import { useAuditCabangInput } from './useAuditCabangInput';

export const useReportState = (
  currentUser: User,
  currentBranch: Branch | undefined,
  branches: Branch[],
  masterDenoms: DenomConfig[],
  cashSessionsRef: React.MutableRefObject<BranchCashSession[]>,
  triggerRealtimeBroadcast: () => void
) => {
  // Load reports (strictly clean, no dummy data)
  const [reports, setReports] = useState<CashReport[]>(() => {
    try {
      localStorage.removeItem('branchcash_reports_v1');
      const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (saved) {
        const parsed: CashReport[] = JSON.parse(saved);
        return parsed
          .filter(r => !DUMMY_REPORT_IDS.includes(r.id))
          .map(r => {
            const sumCash = (r.denominations || []).reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
            const nonCash = Number(r.totalNonCash || 0);
            const totalCash = sumCash;
            const totalPhysical = totalCash + nonCash;
            return {
              ...r,
              totalCash,
              totalNonCash: nonCash,
              totalPhysical,
              grandTotal: totalCash + nonCash,
            };
          });
      }
    } catch (e) {
      console.warn('Error reading saved reports', e);
    }
    return [];
  });

  const reportsRef = useRef<CashReport[]>(reports);
  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  const updateReportsState = useCallback((updater: (prev: CashReport[]) => CashReport[]) => {
    setReports(prev => {
      const next = updater(prev);
      reportsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.error(e);
    }
  }, [reports]);

  // Load audit logs (strictly clean, no dummy logs)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      localStorage.removeItem('branchcash_audit_logs_v1');
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (saved) {
        const parsed: AuditLogEntry[] = JSON.parse(saved);
        return parsed.filter(l => !DUMMY_LOG_IDS.includes(l.id));
      }
    } catch (e) {
      console.warn('Error reading saved audit logs', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.error(e);
    }
  }, [auditLogs]);

  const addAuditLog = useCallback((entry: AuditLogEntry) => {
    setAuditLogs(prev => [entry, ...prev]);
  }, []);

  const addLog = useCallback((
    action: AuditLogEntry['action'],
    report: CashReport,
    summary: string,
    beforeData?: any,
    afterData?: any,
    reason?: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      reportId: report.id,
      reportNumber: report.reportNumber,
      branchCode: report.branchCode,
      beforeData,
      afterData,
      reason,
      summary,
    };

    setAuditLogs(prev => [newEntry, ...prev]);

    supabaseService.insertAuditLog({
      reportId: report.id,
      reportNumber: report.reportNumber,
      branchCode: report.branchCode,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      beforeData,
      afterData,
      reason: reason || summary,
      summary,
    });
  }, [currentUser]);

  const mutations = useReportMutations(
    currentUser,
    currentBranch,
    branches,
    masterDenoms,
    reportsRef,
    updateReportsState,
    cashSessionsRef,
    addLog,
    triggerRealtimeBroadcast
  );

  const auditCabang = useAuditCabangInput(
    currentUser,
    updateReportsState,
    addLog,
    triggerRealtimeBroadcast
  );

  return {
    reports,
    setReports,
    reportsRef,
    updateReportsState,
    auditLogs,
    setAuditLogs,
    addAuditLog,
    addLog,
    createReport: mutations.createReport,
    updateReportDenominations: mutations.updateReportDenominations,
    submitReport: mutations.submitReport,
    resubmitRevision: mutations.resubmitRevision,
    inputComputerCash: auditCabang.inputComputerCash,
  };
};
