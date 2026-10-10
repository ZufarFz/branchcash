import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CashReport, 
  AuditLogEntry, 
  Branch, 
  User, 
  DenomConfig, 
  BankOption, 
  PaymentMethodOption, 
  BranchCashSession, 
  CashierCashTransfer, 
  NonCashTransaction 
} from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { STORAGE_KEYS } from '../types';

export const useSupabaseSync = (
  isAuthenticated: boolean,
  updateReportsState: (updater: (prev: CashReport[]) => CashReport[]) => void,
  localTxRegistryRef: React.MutableRefObject<Map<string, { tx: NonCashTransaction; reportId: string; updatedAt: number }>>,
  activeSaveQueueCountRef: React.MutableRefObject<number>,
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>,
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>,
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setMasterDenoms: React.Dispatch<React.SetStateAction<DenomConfig[]>>,
  setBanks: React.Dispatch<React.SetStateAction<BankOption[]>>,
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethodOption[]>>,
  setCashSessions: React.Dispatch<React.SetStateAction<BranchCashSession[]>>,
  setCashTransfers: React.Dispatch<React.SetStateAction<CashierCashTransfer[]>>
) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured);
  const realtimeChannelRef = useRef<any>(null);

  const triggerRealtimeBroadcast = useCallback(() => {
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'db_change',
          payload: { timestamp: Date.now() },
        });
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }
    }
  }, []);

  const refreshFromSupabase = useCallback(async () => {
    if (!supabaseService.isConfigured()) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const [
        supaReports, 
        supaLogs, 
        supaBranches, 
        supaUsers, 
        supaDenoms, 
        supaBanks, 
        supaMethods,
        supaSessions,
        supaTransfers
      ] = await Promise.all([
        supabaseService.fetchReports(),
        supabaseService.fetchAuditLogs(),
        supabaseService.fetchBranches(),
        supabaseService.fetchUsers(),
        supabaseService.fetchMasterDenoms(),
        supabaseService.fetchBanks(),
        supabaseService.fetchPaymentMethods(),
        supabaseService.fetchCashSessions(),
        supabaseService.fetchCashTransfers(),
      ]);

      if (supaReports !== null) {
        const now = Date.now();
        localTxRegistryRef.current.forEach((entry, txId) => {
          if (entry.tx.syncStatus === 'SAVED' && now - entry.updatedAt > 20000) {
            localTxRegistryRef.current.delete(txId);
          }
        });

        updateReportsState(prevReports => {
          const supaReportIds = new Set(supaReports.map(r => r.id));
          const localOnlyReports = prevReports.filter(
            pr => !supaReportIds.has(pr.id) && pr.nonCashTransactions.some(t => t.syncStatus === 'SAVING' || t.syncStatus === 'FAILED')
          );

          const mergedSupaReports = supaReports.map(supaRep => {
            const prevRep = prevReports.find(pr => pr.id === supaRep.id);
            const mergedTxs: NonCashTransaction[] = supaRep.nonCashTransactions.map(dbTx => {
              const localEntry = localTxRegistryRef.current.get(dbTx.id);
              const prevTx = prevRep?.nonCashTransactions.find(pt => pt.id === dbTx.id);
              if (localEntry?.tx.syncStatus === 'SAVING' || prevTx?.syncStatus === 'SAVING') {
                return { ...dbTx, syncStatus: 'SAVING' as const };
              }
              return { ...dbTx, syncStatus: 'SAVED' as const };
            });

            const existingIds = new Set(mergedTxs.map(t => t.id));

            localTxRegistryRef.current.forEach((entry) => {
              if (entry.reportId === supaRep.id && !existingIds.has(entry.tx.id)) {
                mergedTxs.push(entry.tx);
                existingIds.add(entry.tx.id);
              }
            });

            if (prevRep) {
              prevRep.nonCashTransactions.forEach(pt => {
                if (!existingIds.has(pt.id) && (pt.syncStatus === 'SAVING' || pt.syncStatus === 'FAILED')) {
                  mergedTxs.push(pt);
                  existingIds.add(pt.id);
                }
              });
            }

            if (mergedTxs.length === supaRep.nonCashTransactions.length) {
              return {
                ...supaRep,
                nonCashTransactions: mergedTxs,
              };
            }

            const totalNonCash = mergedTxs.reduce((acc, curr) => acc + curr.amount, 0);
            const totalPhysical = supaRep.totalCash + totalNonCash;
            const varianceTunai = supaRep.computerCashTunai !== null ? supaRep.totalCash - supaRep.computerCashTunai : null;
            const varianceNonTunai = supaRep.computerCashNonTunai !== null ? totalNonCash - supaRep.computerCashNonTunai : null;
            const variance = supaRep.computerCashTotal !== null ? totalPhysical - supaRep.computerCashTotal : null;

            return {
              ...supaRep,
              nonCashTransactions: mergedTxs,
              totalNonCash,
              totalPhysical,
              varianceTunai,
              varianceNonTunai,
              variance,
            };
          });

          return [...localOnlyReports, ...mergedSupaReports];
        });
      }

      if (supaLogs !== null) setAuditLogs(supaLogs);
      if (supaBranches !== null) {
        setBranches(supaBranches);
        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(supaBranches));
      }
      if (supaUsers !== null) {
        setAllUsers(supaUsers);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(supaUsers));
      }
      if (supaDenoms !== null && supaDenoms.length > 0) setMasterDenoms(supaDenoms);
      if (supaBanks !== null && supaBanks.length > 0) setBanks(supaBanks);
      if (supaMethods !== null && supaMethods.length > 0) setPaymentMethods(supaMethods);
      if (supaSessions !== null) setCashSessions(supaSessions);
      if (supaTransfers !== null) setCashTransfers(supaTransfers);

      setIsSupabaseConnected(true);
    } catch (e) {
      console.warn('Supabase synchronization warning:', e);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [updateReportsState, localTxRegistryRef, setAuditLogs, setBranches, setAllUsers, setMasterDenoms, setBanks, setPaymentMethods, setCashSessions, setCashTransfers]);

  const refreshRef = useRef(refreshFromSupabase);
  useEffect(() => {
    refreshRef.current = refreshFromSupabase;
  }, [refreshFromSupabase]);

  useEffect(() => {
    refreshRef.current();

    if (!supabaseService.isConfigured()) return;
    const client = supabaseService.getSupabaseClient();
    if (!client) return;

    const channel = client.channel('branchcash-global-realtime', {
      config: { broadcast: { self: false } }
    });

    const triggerRefresh = () => {
      if (activeSaveQueueCountRef.current > 0) return;
      refreshRef.current();
    };

    channel
      .on('broadcast', { event: 'db_change' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'non_cash_transactions' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_reports' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_report_denominations' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_cash_sessions' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cashier_cash_transfers' }, triggerRefresh)
      .subscribe((status) => {
        console.log('Supabase Realtime Channel Status:', status);
      });

    realtimeChannelRef.current = channel;

    const handleFocus = () => {
      if (activeSaveQueueCountRef.current > 0) return;
      refreshRef.current();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      client.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      realtimeChannelRef.current = null;
    };
  }, [isAuthenticated, activeSaveQueueCountRef]);

  return {
    isSyncing,
    setIsSyncing,
    isSupabaseConnected,
    refreshFromSupabase,
    triggerRealtimeBroadcast,
  };
};
