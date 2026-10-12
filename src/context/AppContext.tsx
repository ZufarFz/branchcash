import React, { createContext, useContext, useCallback } from 'react';
import { AppContextType, STORAGE_KEYS } from './types';
import { useAuthState } from './hooks/useAuthState';
import { useMasterDataState } from './hooks/useMasterDataState';
import { useCashSessionState } from './hooks/useCashSessionState';
import { useCashTransferActions } from './hooks/useCashTransferActions';
import { useNonCashTxManager } from './hooks/useNonCashTxManager';
import { useReportState } from './hooks/useReportState';
import { useReportReviewActions } from './hooks/useReportReviewActions';
import { useSupabaseSync } from './hooks/useSupabaseSync';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Forwarder Refs
  const refreshFromSupabaseRef = React.useRef<() => Promise<void>>(async () => {});
  const setIsSyncingRef = React.useRef<(val: boolean) => void>(() => {});
  const realtimeBroadcastRef = React.useRef<() => void>(() => {});
  const addAuditLogRef = React.useRef<(entry: any) => void>(() => {});

  // 2. Auth Hook (provides currentUser, allUsers, auth actions)
  const auth = useAuthState(
    useCallback((val: boolean) => setIsSyncingRef.current(val), []),
    useCallback(() => refreshFromSupabaseRef.current(), [])
  );

  const triggerRealtimeBroadcast = useCallback(() => {
    realtimeBroadcastRef.current();
  }, []);

  // 3. Master Data Hook (branches, banks, payment methods, denoms)
  const masterData = useMasterDataState(auth.currentUser, triggerRealtimeBroadcast);

  // 4. Current Branch calculation
  const currentBranch = masterData.branches.find(b => b.id === auth.currentUser.branchId) 
    || masterData.branches[0] 
    || (auth.currentUser.branchId ? {
      id: auth.currentUser.branchId,
      code: 'CBG-01',
      name: auth.currentUser.branchName || 'Cabang Utama',
      address: 'Alamat Cabang',
      status: 'ACTIVE' as const
    } : undefined);

  // 5. Cash Sessions Hook (sessions, bandar assignment, getSession)
  const cashSession = useCashSessionState(
    auth.currentUser,
    currentBranch,
    masterData.branches,
    auth.allUsers,
    useCallback((entry: any) => addAuditLogRef.current(entry), []),
    triggerRealtimeBroadcast
  );

  // 6. Cash Transfers Hook (transfer, confirm, edit/resubmit)
  const cashTransfer = useCashTransferActions(
    auth.currentUser,
    currentBranch,
    masterData.branches,
    auth.allUsers,
    cashSession.cashSessionsRef,
    cashSession.cashTransfers,
    cashSession.setCashTransfers,
    useCallback((entry: any) => addAuditLogRef.current(entry), []),
    triggerRealtimeBroadcast
  );

  // 7. Reports & Logs State Hook
  const reportState = useReportState(
    auth.currentUser,
    currentBranch,
    masterData.branches,
    masterData.masterDenoms,
    cashSession.cashSessionsRef,
    triggerRealtimeBroadcast
  );
  addAuditLogRef.current = reportState.addAuditLog;

  // 8. Non-Cash Transactions Manager Hook (offline queue & CRUD)
  const nonCash = useNonCashTxManager(
    auth.currentUser,
    currentBranch,
    masterData.branches,
    reportState.reportsRef,
    reportState.updateReportsState,
    triggerRealtimeBroadcast
  );

  // 9. Reviews & Approvals Hook (SPV, Kacab, Perbankan, Audit)
  const reportReviews = useReportReviewActions(
    auth.currentUser,
    reportState.setReports,
    reportState.addLog,
    triggerRealtimeBroadcast
  );

  // 10. Supabase Sync Hook (syncing, realtime channel, tab focus)
  const sync = useSupabaseSync(
    auth.isAuthenticated,
    reportState.updateReportsState,
    nonCash.localTxRegistryRef,
    nonCash.activeSaveQueueCountRef,
    reportState.setAuditLogs,
    masterData.setBranches,
    auth.setAllUsers,
    masterData.setMasterDenoms,
    masterData.setBanks,
    masterData.setPaymentMethods,
    cashSession.setCashSessions,
    cashSession.setCashTransfers
  );
  refreshFromSupabaseRef.current = sync.refreshFromSupabase;
  setIsSyncingRef.current = sync.setIsSyncing;
  realtimeBroadcastRef.current = sync.triggerRealtimeBroadcast;

  // 12. Clear All Data
  const clearAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.REPORTS);
      localStorage.removeItem(STORAGE_KEYS.LOGS);
      localStorage.removeItem(STORAGE_KEYS.BRANCHES);
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem('branchcash_reports_v1');
      localStorage.removeItem('branchcash_audit_logs_v1');
      localStorage.removeItem('branchcash_reports_v2_clean');
      localStorage.removeItem('branchcash_audit_logs_v2_clean');
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
    reportState.setReports([]);
    reportState.setAuditLogs([]);
    sync.refreshFromSupabase();
  };

  const resetToDefaultData = () => {
    clearAllData();
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: auth.isAuthenticated,
        authLoading: auth.authLoading,
        login: auth.login,
        register: auth.register,
        logout: auth.logout,
        quickDevLogin: auth.quickDevLogin,
        currentUser: auth.currentUser,
        setCurrentUser: auth.setCurrentUser,
        allUsers: auth.allUsers,
        approveUser: auth.approveUser,
        rejectUser: auth.rejectUser,
        updateProfile: auth.updateProfile,
        adminUpdateUser: auth.adminUpdateUser,
        branches: masterData.branches,
        currentBranch,
        reports: reportState.reports,
        auditLogs: reportState.auditLogs,
        banks: masterData.banks,
        paymentMethods: masterData.paymentMethods,
        masterDenoms: masterData.masterDenoms,
        saveMasterDenom: masterData.saveMasterDenom,
        toggleMasterDenomActive: masterData.toggleMasterDenomActive,
        saveBank: masterData.saveBank,
        toggleBankActive: masterData.toggleBankActive,
        savePaymentMethod: masterData.savePaymentMethod,
        togglePaymentMethodActive: masterData.togglePaymentMethodActive,
        saveBranch: masterData.saveBranch,
        toggleBranchActive: masterData.toggleBranchActive,
        isSupabaseConnected: sync.isSupabaseConnected,
        isSyncing: sync.isSyncing,
        refreshFromSupabase: sync.refreshFromSupabase,
        clearAllData,
        cashSessions: cashSession.cashSessions,
        cashTransfers: cashSession.cashTransfers,
        openCashSession: cashSession.openCashSession,
        updateCashSessionBandar: cashSession.updateCashSessionBandar,
        transferCash: cashTransfer.transferCash,
        confirmCashTransfer: cashTransfer.confirmCashTransfer,
        editAndResubmitTransfer: cashTransfer.editAndResubmitTransfer,
        getCashSession: cashSession.getCashSession,
        createReport: reportState.createReport,
        updateReportDenominations: reportState.updateReportDenominations,
        addNonCashTransaction: nonCash.addNonCashTransaction,
        deleteNonCashTransaction: nonCash.deleteNonCashTransaction,
        updateNonCashTransaction: nonCash.updateNonCashTransaction,
        submitReport: reportState.submitReport,
        resubmitRevision: reportState.resubmitRevision,
        inputComputerCash: reportState.inputComputerCash,
        reviewSpv: reportReviews.reviewSpv,
        reviewKacab: reportReviews.reviewKacab,
        reconcileNonCashTransaction: reportReviews.reconcileNonCashTransaction,
        approveReport: reportReviews.approveReport,
        rejectReport: reportReviews.rejectReport,
        updateReportStatus: reportReviews.updateReportStatus,
        forceEditReport: reportReviews.forceEditReport,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
