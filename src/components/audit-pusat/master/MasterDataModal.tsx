import React, { useState } from 'react';
import { X, Database, Banknote, Building2, CreditCard, Building } from 'lucide-react';
import { DenomMasterTab } from './DenomMasterTab';
import { BankMasterTab } from './BankMasterTab';
import { PaymentMethodMasterTab } from './PaymentMethodMasterTab';
import { BranchMasterTab } from './BranchMasterTab';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'denoms' | 'banks' | 'payment_methods' | 'branches';

export const MasterDataModal: React.FC<MasterDataModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('denoms');

  if (!isOpen) return null;

  const tabOptions = [
    { id: 'denoms' as TabType, label: 'Pecahan Tunai', icon: Banknote },
    { id: 'banks' as TabType, label: 'Bank & Rekening', icon: Building2 },
    { id: 'payment_methods' as TabType, label: 'Metode Non-Tunai', icon: CreditCard },
    { id: 'branches' as TabType, label: 'Cabang', icon: Building },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pengelolaan Master Data
              </h3>
              <p className="text-xs text-slate-500">
                Pusat konfigurasi pecahan, bank mitra, metode transaksi, dan cabang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-200 bg-slate-100/50 shrink-0 overflow-x-auto">
          {tabOptions.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'denoms' && <DenomMasterTab />}
          {activeTab === 'banks' && <BankMasterTab />}
          {activeTab === 'payment_methods' && <PaymentMethodMasterTab />}
          {activeTab === 'branches' && <BranchMasterTab />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 shrink-0">
          <span>Perubahan langsung tersinkronisasi ke seluruh sistem cabang & perbankan.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
