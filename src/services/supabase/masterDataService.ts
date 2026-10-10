import { 
  getSupabaseClient, 
  handleJwtError, 
  isValidUUID, 
  generateUUID, 
  cachedBanksListRef, 
  cachedMethodsListRef 
} from './client';
import { Branch, DenomConfig, BankOption, PaymentMethodOption } from '../../types';

export const masterDataService = {
  /**
   * Fetch branches from Supabase
   */
  async fetchBranches(): Promise<Branch[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, code, name, city, address, status')
        .order('name', { ascending: true });

      if (error) {
        if (error.message.toLowerCase().includes('jwt expired')) {
          await handleJwtError(error.message);
        } else {
          console.warn('Supabase fetch branches warning:', error.message);
        }
        return null;
      }

      if (!data || data.length === 0) return [];

      return data.map((b: any) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        city: b.city || undefined,
        address: b.address || '',
        status: b.status || 'ACTIVE',
      }));
    } catch (err) {
      console.warn('Failed to fetch branches from Supabase:', err);
      return null;
    }
  },

  /**
   * Upsert branch
   */
  async upsertBranch(branch: Branch): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };
    try {
      const validId = isValidUUID(branch.id) ? branch.id : generateUUID();
      const { error } = await supabase
        .from('branches')
        .upsert({
          id: validId,
          code: branch.code.toUpperCase().trim(),
          name: branch.name.trim(),
          city: branch.city?.trim() || null,
          address: branch.address.trim(),
          status: branch.status || 'ACTIVE',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan cabang.' };
    }
  },

  /**
   * Fetch Master Denominations from Supabase
   */
  async fetchMasterDenoms(): Promise<DenomConfig[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('master_denoms')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.message.toLowerCase().includes('jwt expired')) {
          await handleJwtError(error.message);
        } else {
          console.warn('Supabase fetch master denoms warning:', error.message);
        }
        return null;
      }

      if (!data || data.length === 0) return null;

      return data.map((d: any) => ({
        id: String(d.id),
        code: d.code || String(d.nominal || d.value || d.id),
        nominal: d.nominal !== null && d.nominal !== undefined ? Number(d.nominal) : (d.value ? Number(d.value) : null),
        label: d.label,
        type: (d.type as any) || 'KERTAS',
        sortOrder: Number(d.sort_order || 0),
        isActive: d.is_active ?? true,
      }));
    } catch (err) {
      console.warn('Failed to fetch master denoms from Supabase:', err);
      return null;
    }
  },

  /**
   * Upsert master denom
   */
  async upsertMasterDenom(denom: DenomConfig): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };
    try {
      const validId = isValidUUID(denom.id) ? denom.id : generateUUID();
      const { error } = await supabase
        .from('master_denoms')
        .upsert({
          id: validId,
          code: denom.code.toUpperCase().trim(),
          nominal: denom.nominal !== null && denom.nominal !== undefined ? denom.nominal : null,
          label: denom.label.trim(),
          type: denom.type,
          sort_order: denom.sortOrder || 0,
          is_active: denom.isActive ?? true,
        }, { onConflict: 'id' });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan denominasi.' };
    }
  },

  /**
   * Fetch Master Banks from Supabase
   */
  async fetchBanks(): Promise<BankOption[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, code, name, is_active')
        .order('name', { ascending: true });

      if (error) {
        if (error.message.toLowerCase().includes('jwt expired')) {
          await handleJwtError(error.message);
        } else {
          console.warn('Supabase fetch banks warning:', error.message);
        }
        return null;
      }

      if (!data || data.length === 0) return null;

      const mapped = data.map((b: any) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        isActive: b.is_active ?? true,
      }));
      cachedBanksListRef.list = mapped;
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch banks from Supabase:', err);
      return null;
    }
  },

  /**
   * Upsert bank
   */
  async upsertBank(bank: BankOption): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };
    try {
      const validId = isValidUUID(bank.id) ? bank.id : generateUUID();
      const { error } = await supabase
        .from('banks')
        .upsert({
          id: validId,
          code: bank.code.toUpperCase().trim(),
          name: bank.name.trim(),
          is_active: bank.isActive ?? true,
        }, { onConflict: 'id' });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan bank.' };
    }
  },

  /**
   * Fetch Master Payment Methods from Supabase
   */
  async fetchPaymentMethods(): Promise<PaymentMethodOption[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, code, name, is_active')
        .order('name', { ascending: true });

      if (error) {
        if (error.message.toLowerCase().includes('jwt expired')) {
          await handleJwtError(error.message);
        } else {
          console.warn('Supabase fetch payment methods warning:', error.message);
        }
        return null;
      }

      if (!data || data.length === 0) return null;

      const mapped = data.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        isActive: p.is_active ?? true,
      }));
      cachedMethodsListRef.list = mapped;
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch payment methods from Supabase:', err);
      return null;
    }
  },

  /**
   * Upsert payment method
   */
  async upsertPaymentMethod(method: PaymentMethodOption): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };
    try {
      const validId = isValidUUID(method.id) ? method.id : generateUUID();
      const { error } = await supabase
        .from('payment_methods')
        .upsert({
          id: validId,
          code: method.code.toUpperCase().trim(),
          name: method.name.trim(),
          is_active: method.isActive ?? true,
        }, { onConflict: 'id' });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan metode pembayaran.' };
    }
  }
};
