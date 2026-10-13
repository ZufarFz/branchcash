import { 
  getSupabaseClient, 
  isConfigured, 
  handleJwtError, 
  isValidUUID, 
  generateUUID 
} from './client';
import { authService } from './authService';
import { masterDataService } from './masterDataService';
import { auditLogService } from './auditLogService';
import { reportFetchService } from './reportFetchService';
import { reportMutationService } from './reportMutationService';
import { nonCashService } from './nonCashService';
import { cashTransferService } from './cashTransferService';
import { operationalAdjustmentService } from './operationalAdjustmentService';

/**
 * Unified Supabase Service combining modular sub-services
 * Following PRD BranchCash v1.1
 */
export const supabaseService = {
  // Client & Diagnostics
  getSupabaseClient,
  isConfigured,
  handleJwtError,

  // Auth & User Management
  signInWithPassword: authService.signInWithPassword.bind(authService),
  signUpWithProfile: authService.signUpWithProfile.bind(authService),
  fetchUsersList: authService.fetchUsersList.bind(authService),
  fetchUsers: authService.fetchUsers.bind(authService),
  updateUserStatus: authService.updateUserStatus.bind(authService),
  updateProfile: authService.updateProfile.bind(authService),
  adminUpdateUser: authService.adminUpdateUser.bind(authService),
  signOut: authService.signOut.bind(authService),
  getCurrentAuthUser: authService.getCurrentAuthUser.bind(authService),

  // Master Data
  fetchBranches: masterDataService.fetchBranches.bind(masterDataService),
  upsertBranch: masterDataService.upsertBranch.bind(masterDataService),
  fetchMasterDenoms: masterDataService.fetchMasterDenoms.bind(masterDataService),
  upsertMasterDenom: masterDataService.upsertMasterDenom.bind(masterDataService),
  fetchBanks: masterDataService.fetchBanks.bind(masterDataService),
  upsertBank: masterDataService.upsertBank.bind(masterDataService),
  fetchPaymentMethods: masterDataService.fetchPaymentMethods.bind(masterDataService),
  upsertPaymentMethod: masterDataService.upsertPaymentMethod.bind(masterDataService),

  // Reports
  fetchReports: reportFetchService.fetchReports.bind(reportFetchService),
  createReport: reportMutationService.createReport.bind(reportMutationService),
  updateDenominations: reportMutationService.updateDenominations.bind(reportMutationService),
  submitReport: reportMutationService.submitReport.bind(reportMutationService),
  inputComputerCash: reportMutationService.inputComputerCash.bind(reportMutationService),
  approveReport: reportMutationService.approveReport.bind(reportMutationService),
  rejectReport: reportMutationService.rejectReport.bind(reportMutationService),
  updateReportStatus: reportMutationService.updateReportStatus.bind(reportMutationService),
  forceEditReport: reportMutationService.forceEditReport.bind(reportMutationService),

  // Operational Adjustments (Pengeluaran & Pemasukan Non-POS Kasir)
  fetchOperationalAdjustments: operationalAdjustmentService.fetchOperationalAdjustments.bind(operationalAdjustmentService),
  createOperationalAdjustment: operationalAdjustmentService.createOperationalAdjustment.bind(operationalAdjustmentService),
  deleteOperationalAdjustment: operationalAdjustmentService.deleteOperationalAdjustment.bind(operationalAdjustmentService),

  // Non-Cash Transactions
  addNonCashTransaction: nonCashService.addNonCashTransaction.bind(nonCashService),
  deleteNonCashTransaction: nonCashService.deleteNonCashTransaction.bind(nonCashService),
  updateNonCashTransaction: nonCashService.updateNonCashTransaction.bind(nonCashService),
  reconcileTransaction: nonCashService.reconcileTransaction.bind(nonCashService),

  // Cash Sessions & Transfers
  fetchCashSessions: cashTransferService.fetchCashSessions.bind(cashTransferService),
  openCashSession: cashTransferService.openCashSession.bind(cashTransferService),
  updateCashSessionBandar: cashTransferService.updateCashSessionBandar.bind(cashTransferService),
  updateSessionBeginningCash: cashTransferService.updateSessionBeginningCash.bind(cashTransferService),
  fetchCashTransfers: cashTransferService.fetchCashTransfers.bind(cashTransferService),
  recordCashTransferPair: cashTransferService.recordCashTransferPair.bind(cashTransferService),
  confirmCashTransferPair: cashTransferService.confirmCashTransferPair.bind(cashTransferService),
  editAndResubmitTransferPair: cashTransferService.editAndResubmitTransferPair.bind(cashTransferService),

  // Audit Logs
  fetchAuditLogs: auditLogService.fetchAuditLogs.bind(auditLogService),
  insertAuditLog: auditLogService.insertAuditLog.bind(auditLogService),
};

export { 
  isValidUUID, 
  generateUUID, 
  authService, 
  masterDataService, 
  auditLogService, 
  reportFetchService, 
  reportMutationService, 
  operationalAdjustmentService,
  nonCashService, 
  cashTransferService 
};
