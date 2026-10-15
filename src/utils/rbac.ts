import { UserRole } from '../types';

export interface RolePermissions {
  roleNameId: string;
  roleDescription: string;
  workLocation: 'Cabang' | 'Kantor Pusat';
  allowedTabs: string[];
  defaultTab: string;
  
  // Specific capabilities
  canInputCash: boolean;
  canInputNonCash: boolean;
  canSubmitReport: boolean;
  canEditBeforeApproval: boolean;
  
  // Computer cash
  canInputComputerCash: boolean;
  
  // Branch reviews
  canReviewSpv: boolean;
  canReviewKacab: boolean;
  
  // Banking
  canReconcileBanking: boolean;
  
  // Final Audit & Approvals
  canApproveReport: boolean;
  canRejectReport: boolean;
  canForceEdit: boolean;
  
  // Data Scope
  canViewAllBranches: boolean;
  canViewAuditLogs: boolean;
  
  // Super Admin Capabilities
  canManageMasterData: boolean;
  canApproveUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  KASIR: {
    roleNameId: 'Kasir',
    roleDescription: 'Pencatatan kas fisik pecahan uang dan transaksi non-tunai cabang',
    workLocation: 'Cabang',
    allowedTabs: ['mutasi-kas', 'input-tunai', 'input-non-tunai', 'profile'],
    defaultTab: 'mutasi-kas',
    canInputCash: true,
    canInputNonCash: true,
    canSubmitReport: true,
    canEditBeforeApproval: true,
    canInputComputerCash: false, // PRD Bab 2 & 9: Kasir tidak menginput Computer Cash
    canReviewSpv: false,
    canReviewKacab: false,
    canReconcileBanking: false,
    canApproveReport: false,
    canRejectReport: false,
    canForceEdit: false,
    canViewAllBranches: false, // Hanya cabang sendiri
    canViewAuditLogs: false,
    canManageMasterData: false,
    canApproveUsers: false,
  },

  SPV: {
    roleNameId: 'Supervisor (SPV)',
    roleDescription: 'Supervisi dan review laporan kasir pada level cabang',
    workLocation: 'Cabang',
    allowedTabs: ['dashboard-cabang', 'profile'],
    defaultTab: 'dashboard-cabang',
    canInputCash: false,
    canInputNonCash: false,
    canSubmitReport: false,
    canEditBeforeApproval: false,
    canInputComputerCash: false,
    canReviewSpv: true,
    canReviewKacab: false,
    canReconcileBanking: false,
    canApproveReport: false, // PRD: Hanya Audit Pusat yang dapat approval final
    canRejectReport: false,
    canForceEdit: false,
    canViewAllBranches: false,
    canViewAuditLogs: true,
    canManageMasterData: false,
    canApproveUsers: false,
  },

  KEPALA_CABANG: {
    roleNameId: 'Kepala Cabang',
    roleDescription: 'Monitoring closing harian dan review operasional cabang',
    workLocation: 'Cabang',
    allowedTabs: ['dashboard-cabang', 'profile'],
    defaultTab: 'dashboard-cabang',
    canInputCash: false,
    canInputNonCash: false,
    canSubmitReport: false,
    canEditBeforeApproval: false,
    canInputComputerCash: false,
    canReviewSpv: false,
    canReviewKacab: true,
    canReconcileBanking: false,
    canApproveReport: false, // PRD: Hanya Audit Pusat yang dapat approval final
    canRejectReport: false,
    canForceEdit: false,
    canViewAllBranches: false,
    canViewAuditLogs: true,
    canManageMasterData: false,
    canApproveUsers: false,
  },

  AUDIT_CABANG: {
    roleNameId: 'Audit Cabang',
    roleDescription: 'Verifikasi kas level cabang dan input nominal Computer Cash / POS',
    workLocation: 'Cabang',
    allowedTabs: ['dashboard-audit-cabang', 'penunjukan-bandar', 'mutasi-kas', 'audit-cabang-pos', 'kas-operasional', 'profile'],
    defaultTab: 'dashboard-audit-cabang',
    canInputCash: false,
    canInputNonCash: false,
    canSubmitReport: false,
    canEditBeforeApproval: false,
    canInputComputerCash: true, // PRD Bab 2 & 9: Nominal Computer Cash diinput oleh Audit Cabang
    canReviewSpv: false,
    canReviewKacab: false,
    canReconcileBanking: false,
    canApproveReport: false, // PRD: Audit Cabang TIDAK memiliki kewenangan approval final laporan
    canRejectReport: false,
    canForceEdit: false,
    canViewAllBranches: false,
    canViewAuditLogs: true,
    canManageMasterData: false,
    canApproveUsers: false,
  },

  PERBANKAN: {
    roleNameId: 'Perbankan (Kantor Pusat)',
    roleDescription: 'Pencocokan dan rekonsiliasi transaksi non-tunai dengan mutasi bank',
    workLocation: 'Kantor Pusat',
    allowedTabs: ['perbankan', 'profile'],
    defaultTab: 'perbankan',
    canInputCash: false,
    canInputNonCash: false,
    canSubmitReport: false,
    canEditBeforeApproval: false,
    canInputComputerCash: false,
    canReviewSpv: false,
    canReviewKacab: false,
    canReconcileBanking: true, // PRD Bab 2 & 8 & 12
    canApproveReport: false,
    canRejectReport: false,
    canForceEdit: false,
    canViewAllBranches: true,
    canViewAuditLogs: false,
    canManageMasterData: false,
    canApproveUsers: false,
  },

  AUDIT_PUSAT: {
    roleNameId: 'Audit Pusat (Kantor Pusat)',
    roleDescription: 'Approval final, reject, force edit, dan pengawasan seluruh cabang',
    workLocation: 'Kantor Pusat',
    allowedTabs: ['admin-pusat', 'user-management', 'penunjukan-bandar', 'mutasi-kas', 'audit-cabang-pos', 'kas-operasional', 'perbankan', 'audit-log', 'profile'],
    defaultTab: 'admin-pusat',
    canInputCash: false,
    canInputNonCash: false,
    canSubmitReport: false,
    canEditBeforeApproval: false,
    canInputComputerCash: false,
    canReviewSpv: false,
    canReviewKacab: false,
    canReconcileBanking: false, // Read-only audit view for perbankan
    canApproveReport: true, // PRD Bab 2 & 10: Hanya Audit Pusat yang dapat approval final
    canRejectReport: true,
    canForceEdit: true, // PRD Bab 10: Force Edit dengan alasan wajib & audit log
    canViewAllBranches: true,
    canViewAuditLogs: true,
    canManageMasterData: false, // Master data dikunci khusus Super Admin (AUDIT_PUSAT_ADMIN)
    canApproveUsers: true, // Persetujuan akun dapat dilakukan oleh Audit Pusat maupun Super Admin
  },

  AUDIT_PUSAT_ADMIN: {
    roleNameId: 'Super Admin (Audit Pusat)',
    roleDescription: 'Super Admin: Akses penuh approval, kelola master data, & persetujuan akun',
    workLocation: 'Kantor Pusat',
    allowedTabs: ['admin-pusat', 'user-management', 'master-data', 'penunjukan-bandar', 'mutasi-kas', 'audit-cabang-pos', 'kas-operasional', 'perbankan', 'audit-log', 'profile'],
    defaultTab: 'admin-pusat',
    canInputCash: false,
    canInputNonCash: false,
    canSubmitReport: false,
    canEditBeforeApproval: false,
    canInputComputerCash: false,
    canReviewSpv: false,
    canReviewKacab: false,
    canReconcileBanking: false,
    canApproveReport: true,
    canRejectReport: true,
    canForceEdit: true,
    canViewAllBranches: true,
    canViewAuditLogs: true,
    canManageMasterData: true,
    canApproveUsers: true,
  }
};

/**
 * Helper to check if a role is authorized for a specific tab
 */
export function isTabAuthorized(role: UserRole, tab: string, isActingCashier?: boolean): boolean {
  // Jika SPV ditugaskan sebagai acting cashier, berikan wewenang akses tab kasir
  if (isActingCashier && ['input-tunai', 'input-non-tunai', 'mutasi-kas'].includes(tab)) {
    return true;
  }
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.allowedTabs.includes(tab);
}

/**
 * Returns descriptive PRD explanation why a role is restricted from an action
 */
export function getRestrictedExplanation(role: UserRole, targetActivity: string): string {
  switch (targetActivity) {
    case 'COMPUTER_CASH':
      return 'Berdasarkan PRD Bab 2 & Bab 9: "Kasir tidak menginput Computer Cash. Nominal Computer Cash/POS hanya diinput oleh Audit Cabang sebagai data pembanding."';
    case 'FINAL_APPROVAL':
      return 'Berdasarkan PRD Bab 2 & Bab 10: "Approval final hanya dapat dilakukan oleh Audit Pusat. Audit Cabang, SPV, dan Kepala Cabang tidak memiliki kewenangan approval/reject final laporan."';
    case 'BANK_RECONCILE':
      return 'Berdasarkan PRD Bab 2 & Bab 8: "Pencocokan transaksi non-tunai per transaksi merupakan tugas utama role Perbankan yang berada di kantor pusat."';
    case 'FORCE_EDIT':
      return 'Berdasarkan PRD Bab 10: "Jika laporan APPROVED perlu dikoreksi, Force Edit hanya dapat dilakukan oleh Audit Pusat dengan alasan perubahan wajib dan dicatat pada Audit Log."';
    case 'ADMIN_PUSAT':
      return 'Berdasarkan PRD Bab 12: "Dashboard Admin Pusat hanya dapat diakses oleh role di Kantor Pusat (Audit Pusat) untuk pengawasan seluruh cabang."';
    case 'BRANCH_OTHER':
      return 'Berdasarkan PRD Bab 13: "Pengguna cabang tidak dapat melihat data cabang lain melalui akses normal."';
    default:
      return 'Aktivitas ini dibatasi sesuai hak akses peran Anda pada PRD BranchCash v1.1.';
  }
}
