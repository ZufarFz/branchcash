import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Database, 
  Banknote, 
  Building2, 
  CreditCard, 
  Building,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { DenomMasterTab } from './DenomMasterTab';
import { BankMasterTab } from './BankMasterTab';
import { PaymentMethodMasterTab } from './PaymentMethodMasterTab';
import { BranchMasterTab } from './BranchMasterTab';

export type MasterSubTab = 'denoms' | 'banks' | 'payment_methods' | 'branches';

interface MasterDataViewProps {
  initialSubTab?: MasterSubTab;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({ initialSubTab = 'denoms' }) => {
  const { currentUser, masterDenoms, banks, paymentMethods, branches } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>(initialSubTab);

  const isSuperAdmin = currentUser.role === 'AUDIT_PUSAT_ADMIN';

  // Metrics for overview cards
  const activeBanksCount = banks.filter((b) => b.isActive).length;
  const activeMethodsCount = paymentMethods.filter((p) => p.isActive).length;
  const activeBranchesCount = branches.filter((b) => b.isActive).length;

  const tabConfigs = [
    {
      id: 'denoms' as MasterSubTab,
      label: 'Pecahan Tunai',
      description: 'Pecahan kertas & koin',
      icon: Banknote,
      count: masterDenoms.length,
      countLabel: 'pecahan',
    },
    {
      id: 'banks' as MasterSubTab,
      label: 'Bank & Rekening',
      description: 'Rekening bank operasional',
      icon: Building2,
      count: activeBanksCount,
      countLabel: 'bank aktif',
    },
    {
      id: 'payment_methods' as MasterSubTab,
      label: 'Metode Non-Tunai',
      description: 'EDC, QRIS, & Transfer',
      icon: CreditCard,
      count: activeMethodsCount,
      countLabel: 'metode aktif',
    },
    {
      id: 'branches' as MasterSubTab,
      label: 'Kantor Cabang',
      description: 'Daftar cabang operasional',
      icon: Building,
      count: activeBranchesCount,
      countLabel: 'cabang aktif',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Role Notice if not AUDIT_PUSAT_ADMIN */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">Mode Pratinjau Terbatas</h4>
            <p>
              Pengelolaan master data merupakan kewenangan khusus <strong>Super Admin (AUDIT_PUSAT_ADMIN)</strong>. Akun Anda tidak memiliki hak ubah data master.
            </p>
          </div>
        </div>
      )}

      {/* Page Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0 mt-0.5">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Pengelolaan Master Data
              </h1>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                Pusat Konfigurasi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Konfigurasi master pecahan uang tunai, bank mitra & rekening operasional, metode transaksi non-tunai, serta unit cabang.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sinkronisasi Realtime Aktif</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabConfigs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
                isActive
                  ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {tab.count}
                </span>
              </div>
              <div>
                <h3 className={`text-xs font-bold leading-tight ${isActive ? 'text-indigo-900' : 'text-slate-900'}`}>
                  {tab.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {tab.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Sub-tab Content Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        {activeSubTab === 'denoms' && <DenomMasterTab />}
        {activeSubTab === 'banks' && <BankMasterTab />}
        {activeSubTab === 'payment_methods' && <PaymentMethodMasterTab />}
        {activeSubTab === 'branches' && <BranchMasterTab />}
      </div>
    </div>
  );
};
