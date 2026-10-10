import { getSupabaseClient, isValidUUID } from './client';
import { User, UserRole } from '../../types';

export const authUserAdminService = {
  /**
   * Supabase Auth: Register new user account
   */
  async signUpWithProfile(params: {
    name: string;
    username?: string;
    email: string;
    password: string;
    role: UserRole;
    branchId?: string;
  }): Promise<{ user: User | null; error: string | null; needsEmailConfirmation?: boolean; needsApproval?: boolean }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { user: null, error: 'Supabase client belum terkonfigurasi.' };
    }

    try {
      const cleanUsername = (params.username || params.email.split('@')[0])
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '');

      if (cleanUsername) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          return {
            user: null,
            error: `Username "${cleanUsername}" sudah digunakan akun lain.`,
          };
        }
      }

      const validBranchId = isValidUUID(params.branchId) ? params.branchId : null;
      const userMeta: Record<string, any> = {
        name: params.name.trim(),
        username: cleanUsername,
        role: params.role,
      };
      if (validBranchId) {
        userMeta.branch_id = validBranchId;
      }

      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: { data: userMeta }
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('User already registered')) {
          msg = 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.';
        } else if (msg.includes('Password should be at least')) {
          msg = 'Password minimal harus terdiri dari 6 karakter.';
        }
        return { user: null, error: msg };
      }

      if (!data.user) {
        return { user: null, error: 'Gagal membuat akun pengguna di Supabase Auth.' };
      }

      const needsEmailConfirmation = !data.session;
      const isAutoActive = params.role === 'AUDIT_PUSAT';
      const initialStatus: 'ACTIVE' | 'PENDING' = isAutoActive ? 'ACTIVE' : 'PENDING';

      try {
        await supabase.from('users').upsert({
          id: data.user.id,
          username: cleanUsername,
          email: params.email.trim(),
          name: params.name.trim(),
          role: params.role,
          branch_id: validBranchId,
          status: initialStatus,
        });
      } catch {}

      if (!isAutoActive) {
        try {
          await supabase.auth.signOut();
        } catch {}
      }

      const createdUser: User = {
        id: data.user.id,
        name: params.name.trim(),
        username: cleanUsername,
        email: params.email.trim(),
        role: params.role,
        branchId: validBranchId || undefined,
        status: initialStatus,
      };

      return { user: createdUser, error: null, needsEmailConfirmation, needsApproval: !isAutoActive };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Terjadi kesalahan saat pendaftaran akun.' };
    }
  },

  /**
   * Ambil seluruh pengguna (untuk approval akun oleh AUDIT_PUSAT)
   */
  async fetchUsersList(): Promise<User[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          username,
          email,
          role,
          branch_id,
          status,
          created_at,
          branches ( id, code, name )
        `)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username || u.email?.split('@')[0],
        email: u.email,
        role: u.role,
        branchId: u.branch_id || undefined,
        branchName: u.branches?.name || undefined,
        status: u.status || 'PENDING',
        createdAt: u.created_at,
      }));
    } catch {
      return [];
    }
  },

  async fetchUsers(): Promise<User[] | null> {
    return this.fetchUsersList();
  },

  /**
   * ACC / Ubah status pengguna (ACTIVE / INACTIVE)
   */
  async updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase tidak terhubung.' };

    try {
      const { error } = await supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengubah status pengguna.' };
    }
  }
};
