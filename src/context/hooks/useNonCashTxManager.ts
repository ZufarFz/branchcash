import React, { useRef } from 'react';
import { NonCashTransaction, CashReport, Branch, User } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { generateUUID } from '../types';

export const useNonCashTxManager = (
  currentUser: User,
  currentBranch: Branch | undefined,
  branches: Branch[],
  reportsRef: React.MutableRefObject<CashReport[]>,
  updateReportsState: (updater: (prev: CashReport[]) => CashReport[]) => void,
  triggerRealtimeBroadcast: () => void
) => {
  // Registry of local non-cash transactions (SAVING, FAILED, or recently SAVED)
  const localTxRegistryRef = useRef<Map<string, { tx: NonCashTransaction; reportId: string; updatedAt: number }>>(new Map());
  const activeSaveQueueCountRef = useRef<number>(0);
  const txSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Add Non-Cash Transaction
  const addNonCashTransaction = async (
    reportId: string, 
    tx: Omit<NonCashTransaction, 'id' | 'reportId'>,
    skipAlert: boolean = false
  ): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'KASIR') {
      const msg = 'Akses ditolak: Hanya Kasir yang berwenang menambah transaksi non-tunai.';
      if (!skipAlert) alert(msg);
      return { success: false, message: msg };
    }

    const txId = (tx as any).id || generateUUID();
    const newTx: NonCashTransaction = {
      ...tx,
      id: txId,
      reportId,
      createdAt: (tx as any).createdAt || new Date().toISOString(),
      syncStatus: 'SAVING',
      syncError: undefined,
    };

    const existingReportCheck = reportsRef.current.find(r => r.id === reportId);
    if (!existingReportCheck) {
      const msg = 'Laporan kas tidak ditemukan.';
      if (!skipAlert) alert(msg);
      return { success: false, message: msg };
    }

    localTxRegistryRef.current.set(txId, {
      tx: newTx,
      reportId,
      updatedAt: Date.now(),
    });

    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const alreadyExists = r.nonCashTransactions.some(t => t.id === txId);
      const nonCashTransactions = alreadyExists
        ? r.nonCashTransactions.map(t => (t.id === txId ? newTx : t))
        : [...r.nonCashTransactions, newTx];

      const totalNonCash = nonCashTransactions.reduce((acc, curr) => acc + curr.amount, 0);
      const totalPhysical = r.totalCash + totalNonCash;
      const varianceTunai = r.computerCashTunai !== null ? r.totalCash - r.computerCashTunai : null;
      const varianceNonTunai = r.computerCashNonTunai !== null ? totalNonCash - r.computerCashNonTunai : null;
      const variance = r.computerCashTotal !== null ? totalPhysical - r.computerCashTotal : null;

      return {
        ...r,
        nonCashTransactions,
        totalNonCash,
        totalPhysical,
        varianceTunai,
        varianceNonTunai,
        variance,
        updatedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
    }));

    activeSaveQueueCountRef.current += 1;

    return new Promise<{ success: boolean; message: string }>((resolve) => {
      txSaveQueueRef.current = txSaveQueueRef.current
        .catch(() => {})
        .then(async () => {
          try {
            if (!localTxRegistryRef.current.has(txId)) {
              resolve({ success: true, message: 'Transaksi dibatalkan/dihapus.' });
              return;
            }

            if (!supabaseService.isConfigured()) {
              const savedTx: NonCashTransaction = { ...newTx, syncStatus: 'SAVED', syncError: undefined };
              localTxRegistryRef.current.set(txId, { tx: savedTx, reportId, updatedAt: Date.now() });
              updateReportsState(prev => prev.map(r => {
                if (r.id !== reportId) return r;
                return {
                  ...r,
                  nonCashTransactions: r.nonCashTransactions.map(t => (t.id === txId ? savedTx : t)),
                };
              }));
              resolve({ success: true, message: 'Tersimpan secara lokal.' });
              return;
            }

            const latestReportObj = reportsRef.current.find(r => r.id === reportId);
            const branch = currentBranch || branches[0] || { id: currentUser.branchId || 'branch-01' };
            const res = await supabaseService.addNonCashTransaction(newTx, branch.id, currentUser.id, latestReportObj);

            if (!localTxRegistryRef.current.has(txId)) {
              resolve({ success: true, message: 'Transaksi dihapus.' });
              return;
            }

            if (!res.success) {
              const failedTx: NonCashTransaction = {
                ...newTx,
                syncStatus: 'FAILED',
                syncError: res.message || 'Gagal menyimpan ke database',
              };
              localTxRegistryRef.current.set(txId, {
                tx: failedTx,
                reportId,
                updatedAt: Date.now(),
              });

              updateReportsState(prev => prev.map(r => {
                if (r.id !== reportId) return r;
                return {
                  ...r,
                  nonCashTransactions: r.nonCashTransactions.map(t => (t.id === txId ? failedTx : t)),
                };
              }));

              if (!skipAlert) {
                alert(`❌ [SUPABASE DITOLAK / GAGAL]\n\n${res.message}`);
              }
              resolve({ success: false, message: res.message });
              return;
            }

            const savedTx: NonCashTransaction = {
              ...newTx,
              syncStatus: 'SAVED',
              syncError: undefined,
            };
            localTxRegistryRef.current.set(txId, {
              tx: savedTx,
              reportId,
              updatedAt: Date.now(),
            });

            updateReportsState(prev => prev.map(r => {
              if (r.id !== reportId) return r;
              return {
                ...r,
                nonCashTransactions: r.nonCashTransactions.map(t => (t.id === txId ? savedTx : t)),
              };
            }));

            triggerRealtimeBroadcast();

            if (!skipAlert) {
              alert(`✅ [SUPABASE BERHASIL DITERIMA]\n\nTransaksi Rp ${tx.amount.toLocaleString('id-ID')} (${tx.bank} - ${tx.paymentMethod}) sukses TERCATAT DI DATABASE SUPABASE!`);
            }
            resolve({ success: true, message: res.message });
          } catch (err: any) {
            const errMsg = err?.message || 'Gagal menyimpan transaksi';
            const failedTx: NonCashTransaction = {
              ...newTx,
              syncStatus: 'FAILED',
              syncError: errMsg,
            };
            if (localTxRegistryRef.current.has(txId)) {
              localTxRegistryRef.current.set(txId, {
                tx: failedTx,
                reportId,
                updatedAt: Date.now(),
              });
              updateReportsState(prev => prev.map(r => {
                if (r.id !== reportId) return r;
                return {
                  ...r,
                  nonCashTransactions: r.nonCashTransactions.map(t => (t.id === txId ? failedTx : t)),
                };
              }));
            }
            resolve({ success: false, message: errMsg });
          } finally {
            activeSaveQueueCountRef.current = Math.max(0, activeSaveQueueCountRef.current - 1);
          }
        });
    });
  };

  // Delete Non-Cash Transaction
  const deleteNonCashTransaction = (reportId: string, txId: string) => {
    if (currentUser.role !== 'KASIR') {
      console.warn('Unauthorized: Only Kasir can delete non-cash transactions');
      return;
    }

    localTxRegistryRef.current.delete(txId);

    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      if (r.status === 'APPROVED') return r;

      const nonCashTransactions = r.nonCashTransactions.filter(t => t.id !== txId);
      const totalNonCash = nonCashTransactions.reduce((acc, curr) => acc + curr.amount, 0);
      const totalPhysical = r.totalCash + totalNonCash;
      const varianceTunai = r.computerCashTunai !== null ? r.totalCash - r.computerCashTunai : null;
      const varianceNonTunai = r.computerCashNonTunai !== null ? totalNonCash - r.computerCashNonTunai : null;
      const variance = r.computerCashTotal !== null ? totalPhysical - r.computerCashTotal : null;

      return {
        ...r,
        nonCashTransactions,
        totalNonCash,
        totalPhysical,
        varianceTunai,
        varianceNonTunai,
        variance,
        updatedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
    }));

    supabaseService.deleteNonCashTransaction(txId);
    triggerRealtimeBroadcast();
  };

  // Update Non-Cash Transaction Amount
  const updateNonCashTransaction = async (reportId: string, txId: string, newAmount: number): Promise<boolean> => {
    if (currentUser.role !== 'KASIR') {
      console.warn('Unauthorized: Only Kasir can update non-cash transactions');
      return false;
    }

    const existingReg = localTxRegistryRef.current.get(txId);
    if (existingReg) {
      localTxRegistryRef.current.set(txId, {
        ...existingReg,
        tx: { ...existingReg.tx, amount: newAmount },
        updatedAt: Date.now(),
      });
    }

    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      if (r.status === 'APPROVED') return r;

      const nonCashTransactions = r.nonCashTransactions.map(t => 
        t.id === txId ? { ...t, amount: newAmount } : t
      );
      const totalNonCash = nonCashTransactions.reduce((acc, curr) => acc + curr.amount, 0);
      const totalPhysical = r.totalCash + totalNonCash;
      const varianceTunai = r.computerCashTunai !== null ? r.totalCash - r.computerCashTunai : null;
      const varianceNonTunai = r.computerCashNonTunai !== null ? totalNonCash - r.computerCashNonTunai : null;
      const variance = r.computerCashTotal !== null ? totalPhysical - r.computerCashTotal : null;

      return {
        ...r,
        nonCashTransactions,
        totalNonCash,
        totalPhysical,
        varianceTunai,
        varianceNonTunai,
        variance,
        updatedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
    }));

    const success = await supabaseService.updateNonCashTransaction(txId, newAmount);
    triggerRealtimeBroadcast();
    return success;
  };

  return {
    localTxRegistryRef,
    activeSaveQueueCountRef,
    addNonCashTransaction,
    deleteNonCashTransaction,
    updateNonCashTransaction,
  };
};
