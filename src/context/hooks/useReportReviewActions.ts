import React from 'react';
import { CashReport, AuditLogEntry, User } from '../../types';
import { useBranchReviewActions } from './useBranchReviewActions';
import { useAuditApprovalActions } from './useAuditApprovalActions';

export const useReportReviewActions = (
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
  const branchReviews = useBranchReviewActions(
    currentUser,
    setReports,
    addLog,
    triggerRealtimeBroadcast
  );

  const auditApprovals = useAuditApprovalActions(
    currentUser,
    setReports,
    addLog,
    triggerRealtimeBroadcast
  );

  return {
    reviewSpv: branchReviews.reviewSpv,
    reviewKacab: branchReviews.reviewKacab,
    reconcileNonCashTransaction: branchReviews.reconcileNonCashTransaction,
    approveReport: auditApprovals.approveReport,
    rejectReport: auditApprovals.rejectReport,
    updateReportStatus: auditApprovals.updateReportStatus,
    forceEditReport: auditApprovals.forceEditReport,
  };
};
