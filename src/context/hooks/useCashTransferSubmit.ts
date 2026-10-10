import React from 'react';
import { CashierCashTransfer, BranchCashSession, Branch, User, AuditLogEntry } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { generateUUID } from '../types';

export const useCashTransferSubmit = (
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
  const transferCash = async (params: {
    businessDate: string;
    toUserId: string;
    transferType: 'MODAL' | 'SETOR';
    amount: number;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const branch = currentBranch || branches[0];
    if (!branch) return { success: false, error: 'Cabang tidak valid' };

    const activeSession = cashSessionsRef.current.find(
      s => s.branchId === branch.id && s.businessDate === params.businessDate
    );

    if (!activeSession) {
      return { success: false, error: 'Sesi kas cabang untuk tanggal ini belum dibuka.' };
    }

    if (params.amount <= 0) {
      return { success: false, error: 'Nominal transfer kas harus lebih besar dari 0.' };
    }

    const partnerUser = allUsers.find(u => u.id === params.toUserId);
    const partnerName = partnerUser?.name || 'Kasir Lawan';

    try {
      const res = await supabaseService.recordCashTransferPair({
        cashSessionId: activeSession.id,
        branchId: branch.id,
        businessDate: params.businessDate,
        fromUserId: currentUser.id,
        toUserId: params.toUserId,
        transferType: params.transferType,
        amount: params.amount,
        notes: params.notes,
      });

      if (!res.success) {
        return { success: false, error: res.error || 'Gagal menyimpan transaksi transfer kas.' };
      }

      const senderEntry: CashierCashTransfer = {
        id: res.senderId || generateUUID(),
        cashSessionId: activeSession.id,
        branchId: branch.id,
        businessDate: params.businessDate,
        userId: currentUser.id,
        userName: currentUser.name,
        partnerUserId: params.toUserId,
        partnerUserName: partnerName,
        transferType: params.transferType,
        direction: 'OUT',
        amount: -Math.abs(params.amount),
        referenceTransferId: res.recipientId,
        status: 'PENDING',
        notes: params.notes,
        createdAt: new Date().toISOString(),
      };

      const recipientEntry: CashierCashTransfer = {
        id: res.recipientId || generateUUID(),
        cashSessionId: activeSession.id,
        branchId: branch.id,
        businessDate: params.businessDate,
        userId: params.toUserId,
        userName: partnerName,
        partnerUserId: currentUser.id,
        partnerUserName: currentUser.name,
        transferType: params.transferType,
        direction: 'IN',
        amount: Math.abs(params.amount),
        referenceTransferId: res.senderId,
        status: 'PENDING',
        notes: params.notes,
        createdAt: new Date().toISOString(),
      };

      setCashTransfers(prev => [senderEntry, recipientEntry, ...prev]);

      const actionType = params.transferType === 'MODAL' ? 'TRANSFER_CASH_MODAL' : 'TRANSFER_CASH_SETOR';
      const actionDesc = params.transferType === 'MODAL'
        ? `Kasir ${currentUser.name} menyerahkan modal Rp ${params.amount.toLocaleString('id-ID')} ke ${partnerName} (Menunggu Konfirmasi)`
        : `Kasir ${currentUser.name} menyetorkan kas Rp ${params.amount.toLocaleString('id-ID')} ke ${partnerName} (Menunggu Konfirmasi)`;

      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: actionType,
        branchCode: branch.code,
        summary: actionDesc,
        afterData: { senderEntry, recipientEntry },
        reason: params.notes || actionDesc,
      };
      addAuditLog(auditEntry);
      supabaseService.insertAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: actionType,
        branchCode: branch.code,
        summary: auditEntry.summary,
        afterData: { senderEntry, recipientEntry },
        reason: auditEntry.reason,
      });

      triggerRealtimeBroadcast();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memproses mutasi kas.' };
    }
  };

  const editAndResubmitTransfer = async (
    transferId: string,
    newAmount: number,
    newNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const target = cashTransfers.find(t => t.id === transferId);
      if (!target) {
        return { success: false, error: 'Transaksi transfer kas tidak ditemukan.' };
      }

      if (target.status === 'CONFIRMED') {
        return { 
          success: false, 
          error: 'Mutasi modal yang sudah diterima (sah) oleh kasir harian tidak dapat diubah nominalnya ataupun statusnya.' 
        };
      }

      const pairId = target.referenceTransferId;
      const cleanAmount = Math.abs(newAmount);

      setCashTransfers(prev => prev.map(t => {
        const isSender = t.id === transferId;
        const isReceiver = pairId ? t.id === pairId : (t.referenceTransferId === transferId);

        if (isSender) {
          return {
            ...t,
            amount: -cleanAmount,
            notes: newNotes !== undefined ? newNotes : t.notes,
            status: 'PENDING',
            confirmedAt: undefined,
            confirmedBy: undefined,
            confirmedByName: undefined,
          };
        }
        if (isReceiver) {
          return {
            ...t,
            amount: cleanAmount,
            notes: newNotes !== undefined ? newNotes : t.notes,
            status: 'PENDING',
            confirmedAt: undefined,
            confirmedBy: undefined,
            confirmedByName: undefined,
          };
        }
        return t;
      }));

      const summaryText = `Kasir ${currentUser.name} merevisi dan mengajukan ulang modal kas ke ${target.partnerUserName || 'Kasir'} menjadi Rp ${cleanAmount.toLocaleString('id-ID')} (Status kembali PENDING)`;
      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'RESUBMIT_REJECTED_MODAL',
        branchCode: currentBranch?.code || 'CBG',
        summary: summaryText,
        afterData: { transferId, newAmount: cleanAmount, newNotes },
        reason: newNotes || 'Revisi modal yang ditolak',
      };
      addAuditLog(auditEntry);
      supabaseService.insertAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'RESUBMIT_REJECTED_MODAL',
        branchCode: currentBranch?.code || 'CBG',
        summary: summaryText,
        afterData: { transferId, newAmount: cleanAmount, newNotes },
        reason: newNotes || 'Revisi modal yang ditolak',
      });

      triggerRealtimeBroadcast();

      const res = await supabaseService.editAndResubmitTransferPair({
        transferId,
        newAmount: cleanAmount,
        newNotes,
      });

      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengajukan ulang modal kas.' };
    }
  };

  return { transferCash, editAndResubmitTransfer };
};
