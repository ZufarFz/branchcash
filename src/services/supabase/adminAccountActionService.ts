import { getSupabaseClient } from './client';
import { UserRole } from '../../types';

export interface AdminCreateUserParams {
  username: string;
  name: string;
  role: UserRole;
  branchId?: string;
  password: string;
}

export interface AdminBatchResultItem {
  username: string;
  name: string;
  role: UserRole;
  success: boolean;
  error?: string;
}

export const adminAccountActionService = {
  /**
   * Reset password pengguna langsung oleh Audit Pusat Admin via Postgres RPC
   */
  async resetPassword(
    targetUserId: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Koneksi database belum terkonfigurasi.' };
    }

    try {
      const cleanPass = newPassword.trim();
      if (cleanPass.length < 6) {
        return { success: false, error: 'Password baru minimal harus 6 karakter.' };
      }

      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        p_target_user_id: targetUserId,
        p_new_password: cleanPass,
      });

      if (error) {
        return { success: false, error: error.message || 'Gagal mereset password pengguna.' };
      }

      return {
        success: true,
        message: data?.message || 'Password berhasil direset.',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Terjadi kesalahan sistem saat mereset password.' };
    }
  },

  /**
   * Daftarkan akun baru yang langsung berstatus ACTIVE oleh Audit Pusat Admin
   */
  async createUser(
    params: AdminCreateUserParams
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Koneksi database belum terkonfigurasi.' };
    }

    try {
      const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_username: cleanUsername,
        p_name: params.name.trim(),
        p_role: params.role,
        p_branch_id: params.branchId || null,
        p_password: params.password.trim(),
      });

      if (error) {
        return { success: false, error: error.message || 'Gagal mendaftarkan akun pengguna.' };
      }

      return { success: true, user: data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Terjadi kesalahan sistem saat membuat akun pengguna.' };
    }
  },

  /**
   * Batch eksekusi pendaftaran pengguna dari array hasil import Excel
   */
  async batchCreateUsers(
    items: AdminCreateUserParams[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{
    successCount: number;
    failCount: number;
    results: AdminBatchResultItem[];
  }> {
    const results: AdminBatchResultItem[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const res = await this.createUser(item);

      if (res.success) {
        successCount++;
        results.push({
          username: item.username,
          name: item.name,
          role: item.role,
          success: true,
        });
      } else {
        failCount++;
        results.push({
          username: item.username,
          name: item.name,
          role: item.role,
          success: false,
          error: res.error,
        });
      }

      onProgress?.(i + 1, items.length);
    }

    return { successCount, failCount, results };
  },
};
