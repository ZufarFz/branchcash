import React from 'react';
import { CashierCashTransfer, Branch, User, AuditLogEntry } from '../../types';
import { supabaseService } from '../../services/supabaseService';

export const useCashTransferConfirm = (
  currentUser: User,
  currentBranch: Branch | undefined,
  cashTransfers: CashierCashTransfer[],
  setCashTransfers: React.Dispatch<React.SetStateAction<CashierCashTransfer[]>>,
  addAuditLog: (entry: AuditLogEntry) => void,
  triggerRealtimeBroadcast: () => void
) => {
  const confirmCashTransfer = async (
    transferId: string, 
    action: 'CONFIRM' | 'REJECT'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const nowFormatted = new Date().toLocaleString('id-ID');
      const newStatus = action === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED';

      const target = cashTransfers.find(t => t.id === transferId);
      const pairId = target?.referenceTransferId;

      setCashTransfers(prev => prev.map(t => {
        if (t.id === transferId || (pairId && t.id === pairId) || (t.referenceTransferId && t.referenceTransferId === transferId)) {
          return {
            ...t,
            status: newStatus,
            confirmedAt: nowFormatted,
            confirmedBy: currentUser.id,
            confirmedByName: currentUser.name,
          };
        }
        return t;
      }));

      triggerRealtimeBroadcast();

      const res = await supabaseService.confirmCashTransferPair({
        transferId,
        confirmedByUserId: currentUser.id,
        action,
      });

      if (!res.success) {
        console.warn('Supabase sync warning for transfer confirmation:', res.error);
      }

      const auditAction = action === 'CONFIRM' ? 'CONFIRM_CASH_TRANSFER' : 'REJECT_CASH_TRANSFER';
      const summaryText = action === 'CONFIRM'
        ? `${currentUser.name} mengonfirmasi telah menerima fisik uang mutasi kas.`
        : `${currentUser.name} menolak mutasi transfer kas.`;

      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: auditAction,
        branchCode: currentBranch?.code || 'CBG',
        summary: summaryText,
        afterData: { transferId, action, confirmedBy: currentUser.name },
        reason: summaryText,
      };
      addAuditLog(auditEntry);
      supabaseService.insertAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: auditAction,
        branchCode: currentBranch?.code || 'CBG',
        summary: summaryText,
        afterData: { transferId, action, confirmedBy: currentUser.name },
        reason: summaryText,
      });

      triggerRealtimeBroadcast();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memproses konfirmasi transfer.' };
    }
  };

  return { confirmCashTransfer };
};
