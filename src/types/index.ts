/**
 * BranchCash - Core Types & Definitions
 * Based on PRD v1.1
 */

export type UserRole = 
  | 'KASIR'
  | 'SPV'
  | 'KEPALA_CABANG'
  | 'AUDIT_CABANG'
  | 'PERBANKAN'
  | 'AUDIT_PUSAT'
  | 'AUDIT_PUSAT_ADMIN';

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'REJECTED' | 'APPROVED';

export type MatchStatus = 'PENDING' | 'MATCHED' | 'UNMATCHED';

export interface Branch {
  id: string;
  code: string;
  name: string;
  city?: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  branchId?: string; // null for central roles (Perbankan, Audit Pusat)
  branchName?: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt?: string;
}

export type DenomType = 'KERTAS' | 'KOIN' | 'MIX';

export interface DenomConfig {
  id: string;
  code: string;
  nominal?: number | null; // e.g. 100000, 50000 for KERTAS, or null for KOIN/MIX
  label: string;
  type: DenomType;
  sortOrder: number;
  isActive?: boolean;
}

export interface DenomBreakdownItem {
  id: string; // Unique timestamp/uuid string
  subtotal: number; // Subtotal nominal per inputan
  calculatedPcs?: number; // Jumlah lembar jika uang kertas
  note?: string; // Catatan opsional (misal: "Setoran Pagi", "Uang Rusak", "Laci 1")
  createdAt?: string;
}

export interface CashDenominationItem {
  id?: string;
  denomId: string;
  denomCode?: string;
  denomLabel?: string;
  denomType?: DenomType;
  denomValue?: number; // Base nominal for KERTAS
  subtotal: number; // Total nominal uang (Rp)
  calculatedPcs?: number; // Calculated pieces for KERTAS (subtotal / denomValue)
  breakdown?: DenomBreakdownItem[]; // Rincian multi-inputan kasir (disimpan format JSONB di DB, setiap rincian dapat memiliki catatan/note)
}

export type TxSyncStatus = 'SAVING' | 'SAVED' | 'FAILED';

export interface NonCashTransaction {
  id: string;
  reportId: string;
  bank: string; // Bank / Mesin EDC
  paymentMethod: string; // Metode Pembayaran
  amount: number; // Nominal (Rp)
  cashierName?: string;
  createdAt?: string;
  syncStatus?: TxSyncStatus;
  syncError?: string;
}

export interface CashReport {
  id: string;
  cashSessionId?: string; // Himpunan sesi kas cabang harian
  reportNumber: string;
  businessDate: string; // YYYY-MM-DD
  branchId: string;
  branchName: string;
  branchCode: string;
  cashierId: string;
  cashierName: string;
  cashierRole?: string;
  status: ReportStatus;
  submittedDate?: string;
  
  // Physical Cash Denominations
  denominations: CashDenominationItem[];
  totalCash: number; // Sum of denom
  
  // Non-Cash
  nonCashTransactions: NonCashTransaction[];
  totalNonCash: number; // Sum of non-cash
  
  // Total Physical Cash Recorded by Branch
  totalPhysical: number; // totalCash + totalNonCash
  
  // Computer Cash (Entered exclusively by Audit Cabang - Tunai & Non-Tunai)
  computerCashTunai: number | null;
  computerCashNonTunai: number | null;
  computerCashTotal: number | null; // computerCashTunai + computerCashNonTunai
  computerCashEnteredBy?: string;
  computerCashRole?: string;
  computerCashEnteredAt?: string;
  
  // Variances: Physical - Computer Cash
  varianceTunai: number | null; // totalCash - (computerCashTunai || 0)
  varianceNonTunai: number | null; // totalNonCash - (computerCashNonTunai || 0)
  variance: number | null; // totalPhysical - (computerCashTotal || 0)

  // Verification Tracking (Audit Cabang / Audit Pusat - decision seen via status)
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedRole?: string;
  
  // Penyesuaian Operasional Kasir Non-POS (Diinput Audit Cabang)
  totalExpenseAdjustment?: number;
  totalIncomeAdjustment?: number;

  // Timestamps & Single Unified Notes Column
  createdDate: string;
  updatedDate: string;
  notes?: string;
}

export type AdjustmentType = 'EXPENSE' | 'INCOME';

export interface CashierOperationalAdjustment {
  id: string;
  reportId?: string;
  branchId: string;
  cashierId: string;
  cashierName?: string;
  cashierRole?: string;
  businessDate: string;
  type: AdjustmentType;
  amount: number;
  notes: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BranchCashSession {
  id: string;
  branchId: string;
  branchName?: string;
  businessDate: string; // YYYY-MM-DD
  bandarUserId: string;
  bandarUserName?: string;
  bandarRole?: string;
  assignedBy: string;
  assignedByName?: string;
  assignedByRole?: string;
  actingCashierUserId?: string | null;
  actingCashierUserName?: string | null;
  actingCashierRole?: string | null;
  status: ReportStatus;
  computerBeginningCash?: number;
  transferCount?: number;
  reportCount?: number;
  hasTransactions?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CashTransferType = 'MODAL' | 'SETOR';
export type CashTransferDirection = 'IN' | 'OUT';
export type CashTransferStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface CashierCashTransfer {
  id: string;
  cashSessionId: string;
  branchId: string;
  businessDate: string;
  userId: string;
  userName?: string;
  userRole?: string;
  partnerUserId: string;
  partnerUserName?: string;
  partnerRole?: string;
  transferType: CashTransferType;
  direction: CashTransferDirection;
  amount: number;
  referenceTransferId?: string;
  status: CashTransferStatus;
  confirmedAt?: string;
  confirmedBy?: string;
  confirmedByName?: string;
  confirmedRole?: string;
  notes?: string;
  createdAt: string;
}

export type AuditAction = 
  | 'CREATE_REPORT'
  | 'EDIT_REPORT'
  | 'SUBMIT_REPORT'
  | 'INPUT_COMPUTER_CASH'
  | 'OPEN_CASH_SESSION'
  | 'UPDATE_SESSION_BANDAR'
  | 'TRANSFER_CASH_MODAL'
  | 'TRANSFER_CASH_SETOR'
  | 'CONFIRM_CASH_TRANSFER'
  | 'REJECT_CASH_TRANSFER'
  | 'RESUBMIT_REJECTED_MODAL'
  | 'UPDATE_MASTER_DATA'
  | 'REVIEW_SPV'
  | 'REVIEW_KACAB'
  | 'RECONCILE_NON_CASH'
  | 'APPROVE_REPORT'
  | 'REJECT_REPORT'
  | 'UPDATE_STATUS'
  | 'FORCE_EDIT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  reportId?: string;
  reportNumber?: string;
  branchCode?: string;
  beforeData?: any;
  afterData?: any;
  reason?: string;
  summary: string;
}

export interface BankOption {
  id: string;
  name: string;
  code?: string;
  color?: string;
  isActive?: boolean;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

