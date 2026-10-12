import { 
  getSupabaseClient, 
  isValidUUID, 
  generateUUID, 
  cachedBanksListRef, 
  cachedMethodsListRef, 
  verifiedReportIdMap, 
  verifiedUserBranchMap 
} from './client';
import { NonCashTransaction, CashReport } from '../../types';

export const nonCashService = {
  /**
   * Add non-cash transaction to Supabase
   */
  async addNonCashTransaction(
    tx: NonCashTransaction, 
    branchId: string, 
    cashierId: string, 
    reportObj?: CashReport
  ): Promise<{ success: boolean; message: string; error?: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Koneksi Supabase belum dikonfigurasi.' };
    }

    try {
      const validTxId = isValidUUID(tx.id) ? tx.id : generateUUID();

      let validCashierId = isValidUUID(cashierId) ? cashierId : null;
      if (!validCashierId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          validCashierId = authData.user.id;
        }
      }

      let validBranchId = (validCashierId && verifiedUserBranchMap.get(validCashierId)) || (isValidUUID(branchId) ? branchId : null);
      if (validCashierId && !verifiedUserBranchMap.has(validCashierId)) {
        const { data: uData } = await supabase
          .from('users')
          .select('id, branch_id, role')
          .eq('id', validCashierId)
          .maybeSingle();

        if (!uData) {
          const { data: authUser } = await supabase.auth.getUser();
          if (!validBranchId) {
            const { data: bData } = await supabase.from('branches').select('id').limit(1).maybeSingle();
            if (bData?.id) validBranchId = bData.id;
          }
          await supabase.from('users').upsert({
            id: validCashierId,
            username: authUser?.user?.email?.split('@')[0] || 'kasir',
            email: authUser?.user?.email || 'kasir@branchcash.local',
            name: authUser?.user?.user_metadata?.name || 'Kasir Cabang',
            role: 'KASIR',
            branch_id: validBranchId,
            status: 'ACTIVE'
          });
        } else if (uData?.branch_id && isValidUUID(uData.branch_id)) {
          validBranchId = uData.branch_id;
        } else if (uData && validBranchId) {
          await supabase.from('users').update({ 
            branch_id: validBranchId,
            role: uData.role || 'KASIR'
          }).eq('id', validCashierId);
        }

        if (validBranchId) {
          verifiedUserBranchMap.set(validCashierId, validBranchId);
        }
      }

      if (!validBranchId) {
        const { data: bData } = await supabase.from('branches').select('id').limit(1).maybeSingle();
        if (bData?.id) {
          validBranchId = bData.id;
          if (validCashierId) verifiedUserBranchMap.set(validCashierId, validBranchId);
        }
      }

      if (!validCashierId || !validBranchId) {
        return { success: false, message: 'Gagal mendapatkan cashier_id atau branch_id yang valid di Supabase.' };
      }

      let targetReportId: string | null = verifiedReportIdMap.get(tx.reportId) || null;

      if (!targetReportId && isValidUUID(tx.reportId)) {
        const { data: existingReport } = await supabase
          .from('cash_reports')
          .select('id')
          .eq('id', tx.reportId)
          .maybeSingle();
        if (existingReport?.id) {
          targetReportId = existingReport.id;
          verifiedReportIdMap.set(tx.reportId, targetReportId);
        }
      }

      if (!targetReportId) {
        const bizDate = reportObj?.businessDate || new Date().toISOString().split('T')[0];
        const { data: matchedReport } = await supabase
          .from('cash_reports')
          .select('id')
          .eq('cashier_id', validCashierId)
          .eq('branch_id', validBranchId)
          .eq('business_date', bizDate)
          .maybeSingle();

        if (matchedReport?.id) {
          targetReportId = matchedReport.id;
          verifiedReportIdMap.set(tx.reportId, targetReportId);
        } else {
          targetReportId = isValidUUID(tx.reportId) ? tx.reportId : generateUUID();
          const fallbackYyMMdd = bizDate.replace(/-/g, '').slice(2);
          const fallbackReportNumber = `CR-${fallbackYyMMdd}-${(reportObj?.branchCode || 'BR').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
          const { error: repError } = await supabase.from('cash_reports').upsert({
            id: targetReportId,
            report_number: reportObj?.reportNumber || fallbackReportNumber,
            business_date: bizDate,
            branch_id: validBranchId,
            cashier_id: validCashierId,
            status: reportObj?.status || 'DRAFT',
            total_physical: reportObj?.totalPhysical || tx.amount,
            total_non_cash: reportObj?.totalNonCash || tx.amount,
            notes: reportObj?.notes || null,
          });

          if (repError) {
            console.error('Error creating cash_report in Supabase:', repError);
            return { success: false, message: `Gagal membuat laporan kas di Supabase: ${repError.message}` };
          }
          verifiedReportIdMap.set(tx.reportId, targetReportId);
        }
      }

      let validBankId: string | null = isValidUUID(tx.bank) ? tx.bank : null;
      if (!validBankId) {
        if (!cachedBanksListRef.list || cachedBanksListRef.list.length === 0) {
          const { data: allBanks, error: bError } = await supabase.from('banks').select('id, name');
          if (bError) {
            return { success: false, message: `Gagal membaca tabel banks di Supabase: ${bError.message}` };
          }
          cachedBanksListRef.list = allBanks || [];
        }
        if (cachedBanksListRef.list.length > 0) {
          const match = cachedBanksListRef.list.find(b => 
            b.name.toLowerCase() === tx.bank.toLowerCase() || 
            b.name.toLowerCase().includes(tx.bank.toLowerCase()) ||
            tx.bank.toLowerCase().includes(b.name.toLowerCase())
          );
          validBankId = match ? match.id : cachedBanksListRef.list[0].id;
        }
      }

      let validMethodId: string | null = isValidUUID(tx.paymentMethod) ? tx.paymentMethod : null;
      if (!validMethodId) {
        if (!cachedMethodsListRef.list || cachedMethodsListRef.list.length === 0) {
          const { data: allMethods, error: mError } = await supabase.from('payment_methods').select('id, name');
          if (mError) {
            return { success: false, message: `Gagal membaca tabel payment_methods di Supabase: ${mError.message}` };
          }
          cachedMethodsListRef.list = allMethods || [];
        }
        if (cachedMethodsListRef.list.length > 0) {
          const match = cachedMethodsListRef.list.find(m => 
            m.name.toLowerCase() === tx.paymentMethod.toLowerCase() || 
            m.name.toLowerCase().includes(tx.paymentMethod.toLowerCase()) ||
            tx.paymentMethod.toLowerCase().includes(m.name.toLowerCase())
          );
          validMethodId = match ? match.id : cachedMethodsListRef.list[0].id;
        }
      }

      if (!validBankId || !validMethodId) {
        return { success: false, message: 'Bank atau Metode Pembayaran tidak ditemukan di Supabase.' };
      }

      const { error: insertError } = await supabase.from('non_cash_transactions').upsert({
        id: validTxId,
        report_id: targetReportId,
        branch_id: validBranchId,
        cashier_id: validCashierId,
        bank_id: validBankId,
        payment_method_id: validMethodId,
        amount: tx.amount,
      });

      if (insertError) {
        return { 
          success: false, 
          message: `Gagal menyimpan ke tabel non_cash_transactions Supabase: ${insertError.message}` 
        };
      }

      if (reportObj) {
        await supabase.from('cash_reports').update({
          total_non_cash: reportObj.totalNonCash,
          total_physical: reportObj.totalPhysical,
        }).eq('id', targetReportId);
      }

      return { success: true, message: 'Berhasil tersimpan di Supabase database!' };
    } catch (err: any) {
      console.error('Exception in addNonCashTransaction:', err);
      return { success: false, message: `Error terdeteksi: ${err?.message || 'Gagal menyimpan ke Supabase'}` };
    }
  },

  /**
   * Delete non-cash transaction from Supabase
   */
  async deleteNonCashTransaction(txId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('non_cash_transactions').delete().eq('id', txId);
    } catch (err) {
      console.warn('Failed to delete non-cash transaction in Supabase:', err);
    }
  },

  /**
   * Update non-cash transaction amount in Supabase
   */
  async updateNonCashTransaction(txId: string, newAmount: number): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('non_cash_transactions')
        .update({ amount: newAmount })
        .eq('id', txId);

      return !error;
    } catch (err) {
      console.warn('Exception updating non-cash transaction in Supabase:', err);
      return false;
    }
  },

  /**
   * Reconcile non-cash transaction by Perbankan
   */
  async reconcileTransaction(
    txId: string, 
    status: 'MATCHED' | 'UNMATCHED' | 'PENDING', 
    notes?: string,
    auditorId?: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const validAuditorId = isValidUUID(auditorId) ? auditorId : null;
      await supabase.from('non_cash_transactions').update({
        match_status: status,
        match_notes: notes || null,
        matched_at: status !== 'PENDING' ? new Date().toISOString() : null,
        matched_by: validAuditorId,
      }).eq('id', txId);
    } catch (err) {
      console.warn('Failed to reconcile transaction in Supabase:', err);
    }
  }
};
