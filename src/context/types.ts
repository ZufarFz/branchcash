import { 
  User, 
  UserRole,
  Branch, 
  CashReport, 
  AuditLogEntry, 
  BankOption, 
  PaymentMethodOption, 
  DenomConfig, 
  NonCashTransaction,
  CashDenominationItem,
  ReportStatus,
  BranchCashSession,
  CashierCashTransfer
} from '../types';

export const INITIAL_EMPTY_USER: User = {
  id: 'guest',
  name: 'Pengguna',
  email: '',
  role: 'KASIR',
  status: 'ACTIVE',
};

export const STORAGE_KEYS = {
  USER: 'branchcash_current_user_v2',
  REPORTS: 'branchcash_reports_v2_clean',
  LOGS: 'branchcash_audit_logs_v2_clean',
  BRANCHES: 'branchcash_branches_v2',
  USERS: 'branchcash_users_v2',
  SESSIONS: 'branchcash_sessions_v2',
  TRANSFERS: 'branchcash_transfers_v2',
};

export const DUMMY_REPORT_IDS = ['rep-001', 'rep-002', 'rep-003', 'rep-004'];
export const DUMMY_LOG_IDS = ['log-01', 'log-02', 'log-03', 'log-04', 'log-05', 'log-06'];

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface AppContextType {
  // Auth state & actions
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    name: string;
    username?: string;
    email: string;
    password: string;
    role: UserRole;
    branchId?: string;
  }) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean; needsApproval?: boolean }>;
  logout: () => Promise<void>;
  quickDevLogin: (user: User) => void;

  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  approveUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  rejectUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  branches: Branch[];
  currentBranch?: Branch;
  reports: CashReport[];
  auditLogs: AuditLogEntry[];
  banks: BankOption[];
  paymentMethods: PaymentMethodOption[];
  masterDenoms: DenomConfig[];
  
  // Master Data CRUD (Khusus Audit Pusat - Soft Delete Only)
  saveMasterDenom: (denom: DenomConfig) => Promise<{ success: boolean; error?: string }>;
  toggleMasterDenomActive: (denomId: string) => Promise<{ success: boolean; error?: string }>;
  saveBank: (bank: BankOption) => Promise<{ success: boolean; error?: string }>;
  toggleBankActive: (bankId: string) => Promise<{ success: boolean; error?: string }>;
  savePaymentMethod: (method: PaymentMethodOption) => Promise<{ success: boolean; error?: string }>;
  togglePaymentMethodActive: (methodId: string) => Promise<{ success: boolean; error?: string }>;
  saveBranch: (branch: Branch) => Promise<{ success: boolean; error?: string }>;
  toggleBranchActive: (branchId: string) => Promise<{ success: boolean; error?: string }>;

  // Supabase Sync States & Actions
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  refreshFromSupabase: () => Promise<void>;
  clearAllData: () => void;

  // Sesi Kas Cabang Harian & Mutasi Kas Silang
  cashSessions: BranchCashSession[];
  cashTransfers: CashierCashTransfer[];
  openCashSession: (params: { businessDate: string; bandarUserId: string; notes?: string }) => Promise<{ success: boolean; session?: BranchCashSession; error?: string }>;
  updateCashSessionBandar: (sessionId: string, newBandarUserId: string) => Promise<{ success: boolean; error?: string }>;
  transferCash: (params: { businessDate: string; toUserId: string; transferType: 'MODAL' | 'SETOR'; amount: number; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  confirmCashTransfer: (transferId: string, action: 'CONFIRM' | 'REJECT') => Promise<{ success: boolean; error?: string }>;
  editAndResubmitTransfer: (transferId: string, newAmount: number, newNotes?: string) => Promise<{ success: boolean; error?: string }>;
  getCashSession: (branchId: string, businessDate: string) => BranchCashSession | undefined;

  // Kasir actions
  createReport: (businessDate: string, notes?: string) => CashReport;
  updateReportDenominations: (reportId: string, denoms: CashDenominationItem[]) => void;
  addNonCashTransaction: (reportId: string, tx: Omit<NonCashTransaction, 'id' | 'reportId'>, skipAlert?: boolean) => Promise<{ success: boolean; message: string }>;
  deleteNonCashTransaction: (reportId: string, txId: string) => void;
  updateNonCashTransaction: (reportId: string, txId: string, newAmount: number) => Promise<boolean>;
  submitReport: (reportId: string) => boolean;
  resubmitRevision: (reportId: string) => Promise<boolean>;

  // Audit Cabang action (Input 2 Nilai: Tunai & Non-Tunai)
  inputComputerCash: (
    reportId: string, 
    computerCashTunai: number, 
    computerCashNonTunai: number, 
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;

  // SPV & Kacab reviews
  reviewSpv: (reportId: string, notes: string) => void;
  reviewKacab: (reportId: string, notes: string) => void;

  // Perbankan actions
  reconcileNonCashTransaction: (
    reportId: string, 
    txId: string, 
    status: 'MATCHED' | 'UNMATCHED' | 'PENDING', 
    notes?: string
  ) => void;

  // Audit Pusat & Cabang actions
  approveReport: (reportId: string) => boolean | Promise<boolean>;
  rejectReport: (reportId: string, reason: string) => boolean | Promise<boolean>;
  updateReportStatus: (reportId: string, status: ReportStatus, reason?: string) => Promise<boolean>;
  forceEditReport: (
    reportId: string, 
    changes: {
      denominations?: CashDenominationItem[];
      computerCashTunai?: number;
      computerCashNonTunai?: number;
      computerCashTotal?: number;
      notes?: string;
    }, 
    reason: string
  ) => boolean;

  // Reset
  resetToDefaultData: () => void;
}
