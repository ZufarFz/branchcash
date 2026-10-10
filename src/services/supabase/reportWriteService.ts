import { getSupabaseClient, isValidUUID } from './client';
import { CashReport, CashDenominationItem } from '../../types';

export const reportWriteService = {
  /**
   * Create cash report in Supabase
   */
  async createReport(report: CashReport): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('cash_reports').upsert({
        id: report.id,
        cash_session_id: report.cashSessionId || null,
        report_number: report.reportNumber,
        business_date: report.businessDate,
        branch_id: report.branchId,
        cashier_id: report.cashierId,
        status: report.status,
        total_physical: report.totalPhysical,
        total_non_cash: report.totalNonCash,
        notes: report.notes || null,
      });

      if (report.denominations && report.denominations.length > 0) {
        await this.updateDenominations(report.id, report.denominations);
      }
    } catch (err) {
      console.warn('Failed to create report in Supabase:', err);
    }
  },

  /**
   * Update denominations in Supabase
   * Hanya simpan denom yang terisi (subtotal > 0). Denom yang 0 dihapus atau tidak disimpan.
   */
  async updateDenominations(reportId: string, denoms: CashDenominationItem[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const filledDenoms = denoms.filter(d => (d.subtotal || 0) > 0);

      const { data: masterData } = await supabase
        .from('master_denoms')
        .select('id, code, nominal');

      const masterMap = new Map<string, string>();
      (masterData || []).forEach((m: any) => {
        masterMap.set(String(m.id), String(m.id));
        if (m.code) masterMap.set(String(m.code).toUpperCase(), String(m.id));
        if (m.nominal) masterMap.set(String(m.nominal), String(m.id));
      });

      const denomRows: Array<{
        report_id: string;
        denom_id: string;
        subtotal: number;
        breakdown?: any;
      }> = [];

      for (const d of filledDenoms) {
        let validDenomId: string | null = null;
        if (isValidUUID(d.denomId)) {
          validDenomId = d.denomId;
        } else if (d.denomCode && masterMap.has(d.denomCode.toUpperCase())) {
          validDenomId = masterMap.get(d.denomCode.toUpperCase())!;
        } else if (d.denomValue && masterMap.has(String(d.denomValue))) {
          validDenomId = masterMap.get(String(d.denomValue))!;
        } else if (masterMap.has(d.denomId.replace('denom-', ''))) {
          validDenomId = masterMap.get(d.denomId.replace('denom-', ''))!;
        }

        if (validDenomId) {
          denomRows.push({
            report_id: reportId,
            denom_id: validDenomId,
            subtotal: d.subtotal,
            breakdown: d.breakdown && d.breakdown.length > 0 ? d.breakdown : null,
          });
        }
      }

      await supabase
        .from('cash_report_denominations')
        .delete()
        .eq('report_id', reportId);

      if (denomRows.length > 0) {
        await supabase
          .from('cash_report_denominations')
          .insert(denomRows);
      }
    } catch (err) {
      console.warn('Failed to update denominations in Supabase:', err);
    }
  },

  /**
   * Submit report by Cashier
   */
  async submitReport(reportId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('cash_reports').update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      }).eq('id', reportId);
    } catch (err) {
      console.warn('Failed to submit report in Supabase:', err);
    }
  },

  /**
   * Input Computer Cash by Audit Cabang (Tunai & Non-Tunai)
   */
  async inputComputerCash(
    reportId: string, 
    tunai: number, 
    nonTunai: number, 
    notes?: string, 
    auditorId?: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, message: 'Koneksi Supabase belum terhubung.' };

    const totalComp = tunai + nonTunai;
    try {
      let validAuditorId: string | null = isValidUUID(auditorId) ? auditorId : null;
      if (!validAuditorId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id && isValidUUID(authData.user.id)) {
          validAuditorId = authData.user.id;
        }
      }

      if (validAuditorId) {
        const { data: userExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', validAuditorId)
          .maybeSingle();
        if (!userExists) {
          validAuditorId = null;
        }
      }

      let targetReportId = reportId;
      if (!isValidUUID(reportId)) {
        const { data: matchedReport } = await supabase
          .from('cash_reports')
          .select('id')
          .eq('id', reportId)
          .maybeSingle();
        
        if (matchedReport?.id) {
          targetReportId = matchedReport.id;
        } else {
          const { data: matchedByNum } = await supabase
            .from('cash_reports')
            .select('id')
            .eq('report_number', reportId)
            .maybeSingle();
          if (matchedByNum?.id) {
            targetReportId = matchedByNum.id;
          }
        }
      }

      const now = new Date().toISOString();

      const { error: primaryError } = await supabase
        .from('cash_reports')
        .update({
          computer_cash_tunai: tunai,
          computer_cash_non_tunai: nonTunai,
          computer_cash_total: totalComp,
          notes: notes || null,
          computer_cash_updated_by: validAuditorId,
          computer_cash_updated_at: now,
        })
        .eq('id', targetReportId);

      if (primaryError) {
        const { error: fallbackError } = await supabase
          .from('cash_reports')
          .update({
            computer_cash_total: totalComp,
            computer_cash_notes: notes || null,
            computer_cash_updated_by: validAuditorId,
            computer_cash_updated_at: now,
          })
          .eq('id', targetReportId);

        if (fallbackError) {
          return { 
            success: false, 
            message: `Gagal memperbarui Supabase: ${fallbackError.message}` 
          };
        }
      }

      return { success: true, message: 'Berhasil menyimpan Computer Cash ke Supabase!' };
    } catch (err: any) {
      return { success: false, message: `Gagal terhubung ke Supabase: ${err?.message || 'Unknown error'}` };
    }
  }
};
