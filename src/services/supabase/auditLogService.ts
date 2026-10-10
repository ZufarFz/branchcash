import { getSupabaseClient, handleJwtError } from './client';
import { AuditLogEntry } from '../../types';

export const auditLogService = {
  /**
   * Fetch audit logs from Supabase
   */
  async fetchAuditLogs(): Promise<AuditLogEntry[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.message.toLowerCase().includes('jwt expired')) {
          await handleJwtError(error.message);
        } else {
          console.warn('Supabase fetch audit logs warning:', error.message);
        }
        return null;
      }

      if (!data || data.length === 0) return [];

      return data.map((item: any) => ({
        id: item.id,
        timestamp: new Date(item.created_at).toLocaleString('id-ID'),
        userId: item.user_id || '',
        userName: item.user_name || 'System',
        userRole: item.user_role || 'AUDIT_PUSAT',
        action: item.action,
        reportId: item.report_id || undefined,
        reportNumber: item.report_number || item.report_id || '-',
        branchCode: item.branch_code || 'CBG',
        summary: item.reason || '',
        beforeData: item.before_data || undefined,
        afterData: item.after_data || undefined,
        reason: item.reason || '',
      }));
    } catch (err) {
      console.warn('Failed to load audit logs from Supabase:', err);
      return null;
    }
  },

  /**
   * Insert new audit log entry
   */
  async insertAuditLog(log: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('audit_logs').insert({
        report_id: log.reportId || null,
        user_id: log.userId || null,
        user_name: log.userName,
        user_role: log.userRole,
        action: log.action,
        before_data: log.beforeData || null,
        after_data: log.afterData || null,
        reason: log.reason || log.summary || '-',
      });
    } catch (err) {
      console.warn('Failed to insert audit log to Supabase:', err);
    }
  }
};
