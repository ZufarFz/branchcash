import React from 'react';
import { CashReport, AuditLogEntry, User } from '../../types';
import { supabaseService } from '../../services/supabaseService';

export const useBranchReviewActions = (
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
  // SPV Review
  const reviewSpv = (reportId: string, notes: string) => {
    if (currentUser.role !== 'SPV') return;

    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updated: CashReport = {
        ...r,
        updatedDate: now,
      };

      addLog('REVIEW_SPV', updated, `Supervisor (${currentUser.name}) menyelesaikan review cabang`, undefined, { notes });
      return updated;
    }));

    triggerRealtimeBroadcast();
  };

  // Kacab Review
  const reviewKacab = (reportId: string, notes: string) => {
    if (currentUser.role !== 'KEPALA_CABANG') return;

    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updated: CashReport = {
        ...r,
        updatedDate: now,
      };

      addLog('REVIEW_KACAB', updated, `Kepala Cabang (${currentUser.name}) menyelesaikan review closing`, undefined, { notes });
      return updated;
    }));

    triggerRealtimeBroadcast();
  };

  // Reconcile Non-Cash (Perbankan)
  const reconcileNonCashTransaction = (
    reportId: string,
    txId: string,
    status: 'MATCHED' | 'UNMATCHED' | 'PENDING',
    notes?: string
  ) => {
    if (currentUser.role !== 'PERBANKAN') return;

    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;

      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updatedTxs = r.nonCashTransactions.map(tx => {
        if (tx.id !== txId) return tx;
        return {
          ...tx,
          matchStatus: status,
          matchedAt: status !== 'PENDING' ? now : undefined,
          matchedBy: status !== 'PENDING' ? currentUser.name : undefined,
          matchNotes: notes,
        };
      });

      const updated: CashReport = {
        ...r,
        nonCashTransactions: updatedTxs,
        updatedDate: now,
      };

      const matchedTx = r.nonCashTransactions.find(t => t.id === txId);
      addLog(
        'RECONCILE_NON_CASH',
        updated,
        `Perbankan menandai transaksi ${matchedTx?.bank} ${matchedTx?.paymentMethod} (Rp ${matchedTx?.amount.toLocaleString('id-ID')}) sebagai ${status}`,
        { matchStatus: matchedTx?.matchStatus },
        { matchStatus: status, notes }
      );

      return updated;
    }));

    supabaseService.reconcileTransaction(txId, status, notes, currentUser.id);
    triggerRealtimeBroadcast();
  };

  return {
    reviewSpv,
    reviewKacab,
    reconcileNonCashTransaction,
  };
};
