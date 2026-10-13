import { useState, useEffect, useRef } from 'react';
import { BranchCashSession, CashierCashTransfer, Branch, User, AuditLogEntry } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { STORAGE_KEYS } from '../types';

export const useCashSessionState = (
  currentUser: User,
  currentBranch: Branch | undefined,
  branches: Branch[],
  allUsers: User[],
  addAuditLog: (entry: AuditLogEntry) => void,
  triggerRealtimeBroadcast: () => void
) => {
  // Sesi Kas Cabang Harian (branch_cash_sessions)
  const [cashSessions, setCashSessions] = useState<BranchCashSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved sessions', e);
    }
    return [];
  });
  const cashSessionsRef = useRef<BranchCashSession[]>(cashSessions);
  useEffect(() => {
    cashSessionsRef.current = cashSessions;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(cashSessions));
    } catch (e) {
      console.error(e);
    }
  }, [cashSessions]);

  // Mutasi Kas Antar-Kasir (cashier_cash_transfers)
  const [cashTransfers, setCashTransfers] = useState<CashierCashTransfer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved transfers', e);
    }
    return [];
  });
  const cashTransfersRef = useRef<CashierCashTransfer[]>(cashTransfers);
  useEffect(() => {
    cashTransfersRef.current = cashTransfers;
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(cashTransfers));
    } catch (e) {
      console.error(e);
    }
  }, [cashTransfers]);

  // Open Cash Session
  const openCashSession = async (params: {
    businessDate: string;
    bandarUserId: string;
    computerBeginningCash?: number;
    notes?: string;
  }): Promise<{ success: boolean; session?: BranchCashSession; error?: string }> => {
    if (currentUser.role !== 'AUDIT_CABANG' && currentUser.role !== 'AUDIT_PUSAT' && currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Hanya role Audit Cabang atau Audit Pusat yang berwenang menunjuk Kasir Bandar.' };
    }

    const branch = currentBranch || branches[0];
    if (!branch) {
      return { success: false, error: 'Cabang tidak valid.' };
    }

    const bandarUser = allUsers.find(u => u.id === params.bandarUserId);
    const bandarName = bandarUser?.name || 'Kasir Bandar';

    try {
      const res = await supabaseService.openCashSession({
        branchId: branch.id,
        businessDate: params.businessDate,
        bandarUserId: params.bandarUserId,
        assignedBy: currentUser.id,
        computerBeginningCash: params.computerBeginningCash,
        notes: params.notes,
      });

      if (!res) {
        return { success: false, error: 'Gagal membuka sesi kas cabang di database.' };
      }

      const sessionWithNames: BranchCashSession = {
        ...res,
        branchName: branch.name,
        bandarUserName: bandarName,
        assignedByName: currentUser.name,
      };

      setCashSessions(prev => {
        const filtered = prev.filter(s => !(s.branchId === branch.id && s.businessDate === params.businessDate));
        return [sessionWithNames, ...filtered];
      });

      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'OPEN_CASH_SESSION',
        branchCode: branch.code,
        summary: `Audit Cabang (${currentUser.name}) membuka sesi kas harian tanggal ${params.businessDate} dan menunjuk ${bandarName} sebagai Kasir Bandar.`,
        afterData: sessionWithNames,
        reason: params.notes || 'Penunjukan Kasir Bandar harian',
      };
      addAuditLog(auditEntry);
      supabaseService.insertAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'OPEN_CASH_SESSION',
        branchCode: branch.code,
        summary: auditEntry.summary,
        afterData: sessionWithNames,
        reason: auditEntry.reason,
      });

      triggerRealtimeBroadcast();
      return { success: true, session: sessionWithNames };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
    }
  };

  // Update Kasir Bandar
  const updateCashSessionBandar = async (
    sessionId: string,
    newBandarUserId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await supabaseService.updateCashSessionBandar({
        sessionId,
        newBandarUserId,
      });

      if (!res.success) {
        return { success: false, error: res.error || 'Gagal mengubah Kasir Bandar.' };
      }

      const bandarUser = allUsers.find(u => u.id === newBandarUserId);
      const bandarName = bandarUser?.name || 'Kasir Bandar';

      setCashSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            bandarUserId: newBandarUserId,
            bandarUserName: bandarName,
          };
        }
        return s;
      }));

      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE_SESSION_BANDAR',
        branchCode: currentBranch?.code || 'CBG',
        summary: `Audit Cabang mengubah Kasir Bandar sesi ke ${bandarName}`,
        afterData: { sessionId, newBandarUserId, bandarName },
        reason: 'Perubahan Kasir Bandar sebelum transaksi dimulai',
      };
      addAuditLog(auditEntry);
      supabaseService.insertAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE_SESSION_BANDAR',
        branchCode: currentBranch?.code || 'CBG',
        summary: auditEntry.summary,
        afterData: { sessionId, newBandarUserId, bandarName },
        reason: auditEntry.reason,
      });

      triggerRealtimeBroadcast();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengubah Kasir Bandar.' };
    }
  };

  // Update Saldo Awal Bandar Menurut Komputer
  const updateSessionBeginningCash = async (
    sessionId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_CABANG' && currentUser.role !== 'AUDIT_PUSAT' && currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Hanya role Audit yang berwenang mengisi saldo awal modal bandar.' };
    }

    try {
      const res = await supabaseService.updateSessionBeginningCash(sessionId, amount);
      if (!res.success) {
        return { success: false, error: res.error || 'Gagal menyimpan saldo awal komputer.' };
      }

      setCashSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            computerBeginningCash: amount,
          };
        }
        return s;
      }));

      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE_SESSION_BANDAR',
        branchCode: currentBranch?.code || 'CBG',
        summary: `Audit Cabang (${currentUser.name}) menginput saldo awal bandar komputer: Rp ${amount.toLocaleString('id-ID')}`,
        afterData: { sessionId, computerBeginningCash: amount },
        reason: 'Input saldo awal modal bandar POS',
      };
      addAuditLog(auditEntry);
      supabaseService.insertAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE_SESSION_BANDAR',
        branchCode: currentBranch?.code || 'CBG',
        summary: auditEntry.summary,
        afterData: { sessionId, computerBeginningCash: amount },
        reason: auditEntry.reason,
      });

      triggerRealtimeBroadcast();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan saldo awal komputer.' };
    }
  };

  const getCashSession = (branchId: string, businessDate: string): BranchCashSession | undefined => {
    return cashSessionsRef.current.find(s => s.branchId === branchId && s.businessDate === businessDate);
  };

  return {
    cashSessions,
    setCashSessions,
    cashSessionsRef,
    cashTransfers,
    setCashTransfers,
    cashTransfersRef,
    openCashSession,
    updateCashSessionBandar,
    updateSessionBeginningCash,
    getCashSession,
  };
};
