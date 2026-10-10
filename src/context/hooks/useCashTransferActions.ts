import React from 'react';
import { CashierCashTransfer, BranchCashSession, Branch, User, AuditLogEntry } from '../../types';
import { useCashTransferSubmit } from './useCashTransferSubmit';
import { useCashTransferConfirm } from './useCashTransferConfirm';

export const useCashTransferActions = (
  currentUser: User,
  currentBranch: Branch | undefined,
  branches: Branch[],
  allUsers: User[],
  cashSessionsRef: React.MutableRefObject<BranchCashSession[]>,
  cashTransfers: CashierCashTransfer[],
  setCashTransfers: React.Dispatch<React.SetStateAction<CashierCashTransfer[]>>,
  addAuditLog: (entry: AuditLogEntry) => void,
  triggerRealtimeBroadcast: () => void
) => {
  const submit = useCashTransferSubmit(
    currentUser,
    currentBranch,
    branches,
    allUsers,
    cashSessionsRef,
    cashTransfers,
    setCashTransfers,
    addAuditLog,
    triggerRealtimeBroadcast
  );

  const confirm = useCashTransferConfirm(
    currentUser,
    currentBranch,
    cashTransfers,
    setCashTransfers,
    addAuditLog,
    triggerRealtimeBroadcast
  );

  return {
    transferCash: submit.transferCash,
    confirmCashTransfer: confirm.confirmCashTransfer,
    editAndResubmitTransfer: submit.editAndResubmitTransfer,
  };
};
