import { 
  ShieldCheck, 
  Coins, 
  CreditCard, 
  Landmark, 
  History, 
  Calculator, 
  Store,
  ArrowLeftRight,
  Crown
} from 'lucide-react';
import { UserRole } from '../../../types';

export type SidebarTab = 
  | 'admin-pusat' 
  | 'dashboard-cabang' 
  | 'input-tunai' 
  | 'input-non-tunai' 
  | 'mutasi-kas'
  | 'audit-cabang-pos' 
  | 'penunjukan-bandar'
  | 'perbankan' 
  | 'audit-log';

export interface MenuItemConfig {
  id: SidebarTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  badge: string | null;
  badgeColor: string;
}

export interface MenuSectionConfig {
  title: string;
  items: MenuItemConfig[];
}

export const getSidebarMenuSections = (
  role: UserRole,
  pendingApprovalCount: number,
  allNonCashCount: number,
  totalAuditLogs: number,
  pendingTransferConfirmCount: number
): MenuSectionConfig[] => {
  return [
    {
      title: 'Dashboard Utama',
      items: [
        {
          id: 'admin-pusat',
          label: 'Dashboard Admin Pusat',
          shortLabel: 'Admin Pusat',
          description: 'Monitoring cabang, approval & force edit',
          icon: ShieldCheck,
          badge: pendingApprovalCount > 0 ? `${pendingApprovalCount}` : null,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        },
        {
          id: 'dashboard-cabang',
          label: 'Dashboard Cabang',
          shortLabel: 'Cabang',
          description: 'Closing harian, review SPV & Kacab',
          icon: Store,
          badge: null,
          badgeColor: '',
        },
      ],
    },
    {
      title: role === 'AUDIT_CABANG' ? 'Audit & Kas Cabang' : 'Input Kasir (Cabang)',
      items: [
        {
          id: 'input-tunai',
          label: 'Input Uang Tunai',
          shortLabel: 'Kas Tunai',
          description: 'Pecahan fisik Rp 100rb s/d koin Rp 100',
          icon: Coins,
          badge: null,
          badgeColor: '',
        },
        {
          id: 'input-non-tunai',
          label: 'Input Transaksi Non Tunai',
          shortLabel: 'Non-Tunai',
          description: 'Pencatatan EDC, QRIS, & Transfer bank',
          icon: CreditCard,
          badge: null,
          badgeColor: '',
        },
        {
          id: 'mutasi-kas',
          label: 'Pengelolaan Modal & Setor',
          shortLabel: 'Modal & Setor',
          description: 'Serah terima modal bandar & setoran kasir',
          icon: ArrowLeftRight,
          badge: pendingTransferConfirmCount > 0 ? `${pendingTransferConfirmCount} Butuh ACC` : null,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        },
        {
          id: 'audit-cabang-pos',
          label: 'Input Computer Cash',
          shortLabel: 'POS Kasir',
          description: 'Kewenangan khusus Audit Cabang (POS)',
          icon: Calculator,
          badge: 'POS',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        },
        {
          id: 'penunjukan-bandar',
          label: 'Penunjukan Kasir Bandar',
          shortLabel: 'Kasir Bandar',
          description: 'Tunjuk kasir bandar modal harian cabang',
          icon: Crown,
          badge: 'BANDAR',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        },
      ],
    },
    {
      title: 'Pusat & Rekonsiliasi',
      items: [
        {
          id: 'perbankan',
          label: 'Rekonsiliasi Perbankan',
          shortLabel: 'Perbankan',
          description: 'Rekap & monitoring transaksi non-tunai',
          icon: Landmark,
          badge: allNonCashCount > 0 ? `${allNonCashCount}` : null,
          badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        },
        {
          id: 'audit-log',
          label: 'Jejak Audit (Audit Log)',
          shortLabel: 'Audit Trail',
          description: 'Log riwayat seluruh aksi & perubahan',
          icon: History,
          badge: totalAuditLogs > 0 ? `${totalAuditLogs}` : null,
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        },
      ],
    },
  ];
};
