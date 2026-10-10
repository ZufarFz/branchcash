import { getSupabaseClient, isValidUUID, generateUUID } from './client';
import { CashierCashTransfer } from '../../types';

export const cashTransferPairService = {
  /**
   * Fetch internal cashier cash transfers
   */
  async fetchCashTransfers(cashSessionId?: string): Promise<CashierCashTransfer[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      let query = supabase.from('cashier_cash_transfers').select('*');
      if (cashSessionId) {
        query = query.eq('cash_session_id', cashSessionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.warn('Failed to fetch cash transfers:', error.message);
        return [];
      }

      const { data: usersData } = await supabase.from('users').select('id, name');
      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u.name]));

      return (data || []).map((row: any) => ({
        id: row.id,
        cashSessionId: row.cash_session_id,
        branchId: row.branch_id,
        businessDate: row.business_date,
        userId: row.user_id,
        userName: usersMap.get(row.user_id) || 'Kasir',
        partnerUserId: row.partner_user_id,
        partnerUserName: usersMap.get(row.partner_user_id) || 'Kasir Lawan',
        transferType: row.transfer_type,
        direction: row.direction,
        amount: Number(row.amount),
        referenceTransferId: row.reference_transfer_id || undefined,
        status: (row.status as any) || 'PENDING',
        confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).toLocaleString('id-ID') : undefined,
        confirmedBy: row.confirmed_by || undefined,
        confirmedByName: row.confirmed_by ? usersMap.get(row.confirmed_by) : undefined,
        notes: row.notes || undefined,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('fetchCashTransfers error:', err);
      return [];
    }
  },

  /**
   * Record a double-entry cash transfer pair
   */
  async recordCashTransferPair(params: {
    cashSessionId: string;
    branchId: string;
    businessDate: string;
    fromUserId: string;
    toUserId: string;
    transferType: 'MODAL' | 'SETOR';
    amount: number;
    notes?: string;
  }): Promise<{ success: boolean; senderId?: string; recipientId?: string; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database belum terkonfigurasi' };
    }

    try {
      const senderTransferId = generateUUID();
      const recipientTransferId = generateUUID();
      const absAmount = Math.abs(params.amount);

      const senderRow = {
        id: senderTransferId,
        cash_session_id: params.cashSessionId,
        branch_id: params.branchId,
        business_date: params.businessDate,
        user_id: params.fromUserId,
        partner_user_id: params.toUserId,
        transfer_type: params.transferType,
        direction: 'OUT',
        amount: -absAmount,
        reference_transfer_id: recipientTransferId,
        status: 'PENDING',
        notes: params.notes || null,
      };

      const recipientRow = {
        id: recipientTransferId,
        cash_session_id: params.cashSessionId,
        branch_id: params.branchId,
        business_date: params.businessDate,
        user_id: params.toUserId,
        partner_user_id: params.fromUserId,
        transfer_type: params.transferType,
        direction: 'IN',
        amount: absAmount,
        reference_transfer_id: senderTransferId,
        status: 'PENDING',
        notes: params.notes || null,
      };

      const { error } = await supabase
        .from('cashier_cash_transfers')
        .insert([senderRow, recipientRow]);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        senderId: senderTransferId,
        recipientId: recipientTransferId,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mencatat transfer kas' };
    }
  },

  /**
   * Confirm or Reject an incoming cash transfer pair
   */
  async confirmCashTransferPair(params: {
    transferId: string;
    confirmedByUserId: string;
    action: 'CONFIRM' | 'REJECT';
  }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };

    try {
      const { data: targetTransfer } = await supabase
        .from('cashier_cash_transfers')
        .select('id, reference_transfer_id, status')
        .eq('id', params.transferId)
        .maybeSingle();

      if (!targetTransfer || (targetTransfer.status && targetTransfer.status !== 'PENDING')) {
        return { success: true };
      }

      const newStatus = params.action === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED';
      const now = new Date().toISOString();

      const idsToUpdate = [targetTransfer.id];
      if (targetTransfer.reference_transfer_id) {
        idsToUpdate.push(targetTransfer.reference_transfer_id);
      }

      const validConfirmedBy = isValidUUID(params.confirmedByUserId) ? params.confirmedByUserId : null;

      await supabase
        .from('cashier_cash_transfers')
        .update({
          status: newStatus,
          confirmed_at: now,
          confirmed_by: validConfirmedBy,
        })
        .in('id', idsToUpdate);

      return { success: true };
    } catch (err: any) {
      console.warn('confirmCashTransferPair warning:', err);
      return { success: true };
    }
  },

  /**
   * Edit and resubmit a rejected cash transfer
   */
  async editAndResubmitTransferPair(params: {
    transferId: string;
    newAmount: number;
    newNotes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };

    try {
      const { data: targetTransfer } = await supabase
        .from('cashier_cash_transfers')
        .select('*')
        .eq('id', params.transferId)
        .maybeSingle();

      if (!targetTransfer) return { success: true };

      if (targetTransfer.status === 'CONFIRMED') {
        return { 
          success: false, 
          error: 'Mutasi kas yang sudah diterima (sah) tidak dapat diubah nominalnya ataupun statusnya.' 
        };
      }

      const cleanAmount = Math.abs(params.newAmount);

      await supabase
        .from('cashier_cash_transfers')
        .update({
          amount: -cleanAmount,
          notes: params.newNotes || null,
          status: 'PENDING',
          confirmed_at: null,
          confirmed_by: null,
        })
        .eq('id', targetTransfer.id);

      if (targetTransfer.reference_transfer_id) {
        await supabase
          .from('cashier_cash_transfers')
          .update({
            amount: cleanAmount,
            notes: params.newNotes || null,
            status: 'PENDING',
            confirmed_at: null,
            confirmed_by: null,
          })
          .eq('id', targetTransfer.reference_transfer_id);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengajukan ulang mutasi kas.' };
    }
  }
};
