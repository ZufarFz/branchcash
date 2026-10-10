import React from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_PERMISSIONS, getRestrictedExplanation } from '../../utils/rbac';
import { RoleBadge } from './RoleBadge';
import { ShieldAlert, ArrowRight, Lock, BookOpen } from 'lucide-react';

interface UnauthorizedViewProps {
  targetTab: string;
  onRedirectToAllowedTab: (tab: string) => void;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  targetTab,
  onRedirectToAllowedTab,
}) => {
  const { currentUser } = useApp();
  const permissions = ROLE_PERMISSIONS[currentUser.role];

  const getTargetName = (tab: string) => {
    switch (tab) {
      case 'admin-pusat': return 'Dashboard Admin Pusat';
      case 'dashboard-cabang': return 'Dashboard Cabang (Review SPV / Kacab)';
      case 'input-tunai': return 'Input Fisik Uang Tunai (Kasir)';
      case 'input-non-tunai': return 'Input Transaksi Non Tunai (Kasir)';
      case 'audit-cabang-pos': return 'Input Computer Cash POS (Audit Cabang)';
      case 'perbankan': return 'Rekonsiliasi Perbankan (Divisi Perbankan KP)';
      case 'audit-log': return 'Audit Trail & Log Lengkap';
      default: return tab;
    }
  };

  const getPrdReason = (tab: string) => {
    switch (tab) {
      case 'admin-pusat':
        return getRestrictedExplanation(currentUser.role, 'ADMIN_PUSAT');
      case 'audit-cabang-pos':
        return getRestrictedExplanation(currentUser.role, 'COMPUTER_CASH');
      case 'perbankan':
        return getRestrictedExplanation(currentUser.role, 'BANK_RECONCILE');
      default:
        return 'Hak akses halaman ini dibatasi sesuai aturan pemisahan tugas (Segregation of Duties) pada PRD BranchCash v1.1.';
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
      <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Akses Dibatasi Sesuai PRD BranchCash</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Akses Menuju &ldquo;{getTargetName(targetTab)}&rdquo; Tidak Diizinkan
        </h2>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <span>Peran aktif Anda saat ini:</span>
          <RoleBadge role={currentUser.role} />
          <span className="font-semibold text-slate-800">({currentUser.name})</span>
        </div>
      </div>

      {/* PRD Reference Card */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-left text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-amber-800">
          <BookOpen className="w-4 h-4" />
          <span>Kutipan Aturan PRD v1.1:</span>
        </div>
        <p className="leading-relaxed italic">
          &ldquo;{getPrdReason(targetTab)}&rdquo;
        </p>
      </div>

      {/* Action Button to switch back to permitted page */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onRedirectToAllowedTab(permissions.defaultTab)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors"
        >
          <span>Buka Menu yang Diizinkan untuk {permissions.roleNameId}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
