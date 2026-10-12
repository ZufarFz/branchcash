import { useState } from 'react';
import { Branch, BankOption, PaymentMethodOption, DenomConfig, User } from '../../types';
import { MASTER_BANKS, MASTER_PAYMENT_METHODS, MASTER_DENOMS } from '../../constants/masterData';
import { supabaseService } from '../../services/supabaseService';
import { STORAGE_KEYS } from '../types';

export const useMasterDataState = (
  currentUser: User,
  triggerRealtimeBroadcast: () => void
) => {
  // Branches state (dynamically fetched from Supabase)
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved branches', e);
    }
    return [];
  });

  // Master Data state (loaded dynamically or fallback)
  const [masterDenoms, setMasterDenoms] = useState<DenomConfig[]>(MASTER_DENOMS);
  const [banks, setBanks] = useState<BankOption[]>(MASTER_BANKS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(MASTER_PAYMENT_METHODS);

  // Master Data Operations (Audit Pusat - Soft Delete Only)
  const saveMasterDenom = async (denom: DenomConfig): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang mengelola Master Denominasi.' };
    }
    const res = await supabaseService.upsertMasterDenom(denom);
    if (res.success) {
      setMasterDenoms(prev => {
        const idx = prev.findIndex(d => d.id === denom.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = denom;
          return next;
        }
        return [...prev, denom];
      });
      triggerRealtimeBroadcast();
    }
    return res;
  };

  const toggleMasterDenomActive = async (denomId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang.' };
    }
    const target = masterDenoms.find(d => d.id === denomId);
    if (!target) return { success: false, error: 'Denominasi tidak ditemukan.' };
    const updated = { ...target, isActive: !target.isActive };
    return saveMasterDenom(updated);
  };

  const saveBank = async (bank: BankOption): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang mengelola Master Bank.' };
    }
    const res = await supabaseService.upsertBank(bank);
    if (res.success) {
      setBanks(prev => {
        const idx = prev.findIndex(b => b.id === bank.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = bank;
          return next;
        }
        return [...prev, bank];
      });
      triggerRealtimeBroadcast();
    }
    return res;
  };

  const toggleBankActive = async (bankId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang.' };
    }
    const target = banks.find(b => b.id === bankId);
    if (!target) return { success: false, error: 'Bank tidak ditemukan.' };
    const updated = { ...target, isActive: !target.isActive };
    return saveBank(updated);
  };

  const savePaymentMethod = async (method: PaymentMethodOption): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang mengelola Metode Pembayaran.' };
    }
    const res = await supabaseService.upsertPaymentMethod(method);
    if (res.success) {
      setPaymentMethods(prev => {
        const idx = prev.findIndex(m => m.id === method.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = method;
          return next;
        }
        return [...prev, method];
      });
      triggerRealtimeBroadcast();
    }
    return res;
  };

  const togglePaymentMethodActive = async (methodId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang.' };
    }
    const target = paymentMethods.find(m => m.id === methodId);
    if (!target) return { success: false, error: 'Metode pembayaran tidak ditemukan.' };
    const updated = { ...target, isActive: !target.isActive };
    return savePaymentMethod(updated);
  };

  const saveBranch = async (branch: Branch): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang mengelola Cabang.' };
    }
    const res = await supabaseService.upsertBranch(branch);
    if (res.success) {
      setBranches(prev => {
        const idx = prev.findIndex(b => b.id === branch.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = branch;
          return next;
        }
        return [...prev, branch];
      });
      triggerRealtimeBroadcast();
    }
    return res;
  };

  const toggleBranchActive = async (branchId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'AUDIT_PUSAT_ADMIN') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang.' };
    }
    const target = branches.find(b => b.id === branchId);
    if (!target) return { success: false, error: 'Cabang tidak ditemukan.' };
    const updated: Branch = { ...target, status: target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
    return saveBranch(updated);
  };

  return {
    branches,
    setBranches,
    masterDenoms,
    setMasterDenoms,
    banks,
    setBanks,
    paymentMethods,
    setPaymentMethods,
    saveMasterDenom,
    toggleMasterDenomActive,
    saveBank,
    toggleBankActive,
    savePaymentMethod,
    togglePaymentMethodActive,
    saveBranch,
    toggleBranchActive,
  };
};
