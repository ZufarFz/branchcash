import { getSupabaseClient, isValidUUID } from './client';
import { ReportStatus, User } from '../../types';
import { auditLogService } from './auditLogService';

export const reportReviewService = {
  /**
   * Approve report (Auto Locks)
   */
  async approveReport(reportId: string, approverId?: string): Promise<{ success: boolean; message?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, message: 'Supabase client not initialized' };

    try {
      let targetReportId = reportId;
      if (!isValidUUID(targetReportId)) {
        const { data: matchedReport } = await supabase
          .from('cash_reports')
          .select('id')
          .eq('report_number', reportId)
          .maybeSingle();
        if (matchedReport?.id) {
          targetReportId = matchedReport.id;
        }
      }

      const validApproverId = isValidUUID(approverId) ? approverId : null;
      const now = new Date().toISOString();

      const { error } = await supabase.from('cash_reports').update({
        status: 'APPROVED',
        verified_at: now,
        verified_by: validApproverId,
      }).eq('id', targetReportId);

      if (error) {
        const { error: legacyError } = await supabase.from('cash_reports').update({
          status: 'APPROVED',
          approved_at: now,
          approved_by: validApproverId,
        }).eq('id', targetReportId);

        if (legacyError) {
          return { success: false, message: legacyError.message };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  },

  /**
   * Reject report
   */
  async rejectReport(reportId: string, reason: string, rejecterId?: string): Promise<{ success: boolean; message?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, message: 'Supabase client not initialized' };

    try {
      let targetReportId = reportId;
      if (!isValidUUID(targetReportId)) {
        const { data: matchedReport } = await supabase
          .from('cash_reports')
          .select('id')
          .eq('report_number', reportId)
          .maybeSingle();
        if (matchedReport?.id) {
          targetReportId = matchedReport.id;
        }
      }

      const validRejecterId = isValidUUID(rejecterId) ? rejecterId : null;
      const now = new Date().toISOString();

      const { error } = await supabase.from('cash_reports').update({
        status: 'REJECTED',
        verified_at: now,
        verified_by: validRejecterId,
        notes: reason,
      }).eq('id', targetReportId);

      if (error) {
        const { error: legacyError } = await supabase.from('cash_reports').update({
          status: 'REJECTED',
          rejected_at: now,
          rejected_by: validRejecterId,
          rejection_reason: reason,
        }).eq('id', targetReportId);

        if (legacyError) {
          return { success: false, message: legacyError.message };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  },

  /**
   * Update report status
   */
  async updateReportStatus(reportId: string, status: ReportStatus): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      let targetReportId = reportId;
      if (!isValidUUID(targetReportId)) {
        const { data: matchedReport } = await supabase
          .from('cash_reports')
          .select('id')
          .eq('report_number', reportId)
          .maybeSingle();
        if (matchedReport?.id) {
          targetReportId = matchedReport.id;
        }
      }
      const { error } = await supabase.from('cash_reports').update({
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', targetReportId);
      return !error;
    } catch (err) {
      console.warn('Failed to update report status in Supabase:', err);
      return false;
    }
  },

  /**
   * Force Edit report by Audit Pusat
   */
  async forceEditReport(
    reportId: string, 
    changes: { computerCashTotal?: number; notes?: string }, 
    reason: string,
    user: User
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const updatePayload: any = {};
      if (changes.computerCashTotal !== undefined) {
        updatePayload.computer_cash_total = changes.computerCashTotal;
      }
      if (changes.notes !== undefined) {
        updatePayload.notes = changes.notes;
      }

      await supabase.from('cash_reports').update(updatePayload).eq('id', reportId);

      await auditLogService.insertAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'FORCE_EDIT',
        reportId: reportId,
        summary: `Force Edit laporan: ${reason}`,
        afterData: changes,
        reason: reason,
      });
    } catch (err) {
      console.warn('Failed to force edit report in Supabase:', err);
    }
  }
};
