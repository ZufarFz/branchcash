import { getSupabaseClient, generateUUID } from './client';
import { BranchCashSession, ReportStatus } from '../../types';

export const cashSessionService = {
  /**
   * Fetch branch cash sessions
   */
  async fetchCashSessions(branchId?: string, businessDate?: string): Promise<BranchCashSession[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      let query = supabase.from('branch_cash_sessions').select('*');
      if (branchId) query = query.eq('branch_id', branchId);
      if (businessDate) query = query.eq('business_date', businessDate);

      const { data, error } = await query.order('business_date', { ascending: false });
      if (error) {
        console.warn('Failed to fetch branch cash sessions:', error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      const [branchesRes, usersRes, transfersRes, reportsRes] = await Promise.all([
        supabase.from('branches').select('id, name'),
        supabase.from('users').select('id, name'),
        supabase.from('cashier_cash_transfers').select('id, cash_session_id'),
        supabase.from('cash_reports').select('id, cash_session_id'),
      ]);

      const branchesMap = new Map((branchesRes.data || []).map((b: any) => [b.id, b.name]));
      const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u.name]));

      const transferCountMap = new Map<string, number>();
      (transfersRes.data || []).forEach((t: any) => {
        if (t.cash_session_id) {
          transferCountMap.set(t.cash_session_id, (transferCountMap.get(t.cash_session_id) || 0) + 1);
        }
      });

      const reportCountMap = new Map<string, number>();
      (reportsRes.data || []).forEach((r: any) => {
        if (r.cash_session_id) {
          reportCountMap.set(r.cash_session_id, (reportCountMap.get(r.cash_session_id) || 0) + 1);
        }
      });

      return data.map((row: any) => {
        const transferCount = transferCountMap.get(row.id) || 0;
        const reportCount = reportCountMap.get(row.id) || 0;
        const hasTransactions = transferCount > 0;

        return {
          id: row.id,
          branchId: row.branch_id,
          branchName: branchesMap.get(row.branch_id) || 'Cabang',
          businessDate: row.business_date,
          bandarUserId: row.bandar_user_id,
          bandarUserName: usersMap.get(row.bandar_user_id) || 'Kasir Bandar',
          assignedBy: row.assigned_by,
          assignedByName: usersMap.get(row.assigned_by) || 'Audit Cabang',
          status: row.status as ReportStatus,
          computerBeginningCash: row.computer_beginning_cash != null ? Number(row.computer_beginning_cash) : 0,
          transferCount,
          reportCount,
          hasTransactions,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch (err) {
      console.warn('fetchCashSessions error:', err);
      return [];
    }
  },

  /**
   * Open or assign daily branch cash session with Bandar cashier
   */
  async openCashSession(params: {
    branchId: string;
    businessDate: string;
    bandarUserId: string;
    assignedBy: string;
    computerBeginningCash?: number;
  }): Promise<BranchCashSession | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const sessionId = generateUUID();
      const payload = {
        id: sessionId,
        branch_id: params.branchId,
        business_date: params.businessDate,
        bandar_user_id: params.bandarUserId,
        assigned_by: params.assignedBy,
        status: 'DRAFT',
        computer_beginning_cash: params.computerBeginningCash ?? 0,
      };

      const { data, error } = await supabase
        .from('branch_cash_sessions')
        .upsert(payload, { onConflict: 'branch_id,business_date' })
        .select()
        .single();

      if (error) {
        console.error('Failed to open cash session:', error.message);
        return null;
      }

      // Hubungkan laporan kas kasir yang dibuat sebelum sesi dibuka
      await supabase
        .from('cash_reports')
        .update({ cash_session_id: data.id })
        .eq('branch_id', params.branchId)
        .eq('business_date', params.businessDate)
        .is('cash_session_id', null);

      return {
        id: data.id,
        branchId: data.branch_id,
        businessDate: data.business_date,
        bandarUserId: data.bandar_user_id,
        assignedBy: data.assigned_by,
        status: data.status as ReportStatus,
        computerBeginningCash: data.computer_beginning_cash != null ? Number(data.computer_beginning_cash) : 0,
        transferCount: 0,
        reportCount: 0,
        hasTransactions: false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('openCashSession error:', err);
      return null;
    }
  },

  /**
   * Update Bandar Cashier for an existing session
   */
  async updateCashSessionBandar(params: {
    sessionId: string;
    newBandarUserId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Database belum terkonfigurasi' };

    try {
      const { data: transfers } = await supabase
        .from('cashier_cash_transfers')
        .select('id')
        .eq('cash_session_id', params.sessionId)
        .limit(1);

      if (transfers && transfers.length > 0) {
        return {
          success: false,
          error: 'Kasir Bandar tidak dapat diubah karena sudah ada transaksi mutasi kas/modal pada sesi ini.',
        };
      }

      const { error } = await supabase
        .from('branch_cash_sessions')
        .update({
          bandar_user_id: params.newBandarUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.sessionId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengubah Kasir Bandar' };
    }
  },

  /**
   * Update beginning cash according to POS for an existing session
   */
  async updateSessionBeginningCash(
    sessionId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Database belum terkonfigurasi' };

    try {
      const { error } = await supabase
        .from('branch_cash_sessions')
        .update({
          computer_beginning_cash: amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan saldo awal komputer' };
    }
  }
};
