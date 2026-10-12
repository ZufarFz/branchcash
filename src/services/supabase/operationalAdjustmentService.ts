import { getSupabaseClient } from './client';
import { CashierOperationalAdjustment, AdjustmentType } from '../../types';

export const operationalAdjustmentService = {
  /**
   * Ambil daftar penyesuaian operasional kasir
   */
  async fetchOperationalAdjustments(params: {
    branchId?: string;
    businessDate?: string;
    cashierId?: string;
    reportId?: string;
  }): Promise<CashierOperationalAdjustment[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      let query = supabase
        .from('cashier_operational_adjustments')
        .select(`
          id,
          report_id,
          branch_id,
          cashier_id,
          business_date,
          type,
          amount,
          notes,
          created_by,
          created_at,
          updated_at,
          cashier:users!cashier_operational_adjustments_cashier_id_fkey ( id, name ),
          creator:users!cashier_operational_adjustments_created_by_fkey ( id, name )
        `)
        .order('created_at', { ascending: false });

      if (params.reportId) {
        query = query.eq('report_id', params.reportId);
      } else {
        if (params.branchId) query = query.eq('branch_id', params.branchId);
        if (params.businessDate) query = query.eq('business_date', params.businessDate);
        if (params.cashierId) query = query.eq('cashier_id', params.cashierId);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((item: any) => ({
        id: item.id,
        reportId: item.report_id || undefined,
        branchId: item.branch_id,
        cashierId: item.cashier_id,
        cashierName: item.cashier?.name,
        businessDate: item.business_date,
        type: item.type as AdjustmentType,
        amount: Number(item.amount) || 0,
        notes: item.notes,
        createdBy: item.created_by,
        createdByName: item.creator?.name,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Audit Cabang menginput penyesuaian operasional kasir (Pengeluaran/Pemasukan)
   */
  async createOperationalAdjustment(payload: {
    branchId: string;
    cashierId: string;
    businessDate: string;
    type: AdjustmentType;
    amount: number;
    notes: string;
    createdBy: string;
    reportId?: string;
  }): Promise<{ success: boolean; data?: CashierOperationalAdjustment; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client belum terhubung.' };

    try {
      const record = {
        branch_id: payload.branchId,
        cashier_id: payload.cashierId,
        business_date: payload.businessDate,
        type: payload.type,
        amount: payload.amount,
        notes: payload.notes.trim(),
        created_by: payload.createdBy,
        report_id: payload.reportId || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('cashier_operational_adjustments')
        .insert(record)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          id: data.id,
          reportId: data.report_id,
          branchId: data.branch_id,
          cashierId: data.cashier_id,
          businessDate: data.business_date,
          type: data.type as AdjustmentType,
          amount: Number(data.amount) || 0,
          notes: data.notes,
          createdBy: data.created_by,
          createdAt: data.created_at,
        },
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menyimpan transaksi penyesuaian.' };
    }
  },

  /**
   * Hapus transaksi penyesuaian (Audit Cabang)
   */
  async deleteOperationalAdjustment(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client belum terhubung.' };

    try {
      const { error } = await supabase
        .from('cashier_operational_adjustments')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghapus penyesuaian.' };
    }
  },
};
