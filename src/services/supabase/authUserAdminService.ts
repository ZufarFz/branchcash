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
        } else if (msg.includes('Database error saving new user')) {
          msg = 'Database error saving new user. Harap jalankan skrip SQL UPDATE #11 di Supabase SQL Editor untuk memperbarui trigger pengguna.';
        }
        return { user: null, error: msg };
      }

      if (!data.user) {
        return { user: null, error: 'Gagal membuat akun pengguna di Supabase Auth.' };
      }

      const needsEmailConfirmation = !data.session;
      const initialStatus: 'ACTIVE' | 'PENDING' = 'PENDING';

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

      // Seluruh akun baru wajib menunggu approval admin, sign out otomatis
      try {
        await supabase.auth.signOut();
      } catch {}

      const createdUser: User = {
        id: data.user.id,
        name: params.name.trim(),
        username: cleanUsername,
        email: params.email.trim(),
        role: params.role,
        branchId: validBranchId || undefined,
        status: initialStatus,
      };

      return { user: createdUser, error: null, needsEmailConfirmation, needsApproval: true };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Terjadi kesalahan saat pendaftaran akun.' };
    }
  },

  /**
   * Ambil seluruh pengguna (untuk approval akun oleh AUDIT_PUSAT/ADMIN)
   */
  async fetchUsersList(callerRole?: UserRole): Promise<User[]> {
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

      let list = data;
      // Isolasi: Jika bukan Super Admin, filter out akun Super Admin
      if (callerRole && callerRole !== 'AUDIT_PUSAT_ADMIN') {
        list = list.filter((u: any) => u.role !== 'AUDIT_PUSAT_ADMIN');
      }

      return list.map((u: any) => ({
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

  async fetchUsers(callerRole?: UserRole): Promise<User[] | null> {
    return this.fetchUsersList(callerRole);
  },

  /**
   * ACC / Ubah status pengguna (ACTIVE / INACTIVE)
   */
  async updateUserStatus(
    userId: string, 
    status: 'ACTIVE' | 'INACTIVE',
    callerRole?: UserRole,
    targetRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase tidak terhubung.' };

    if (callerRole === 'AUDIT_PUSAT' && (targetRole === 'AUDIT_PUSAT' || targetRole === 'AUDIT_PUSAT_ADMIN')) {
      return { success: false, error: 'Hanya Super Admin yang berhak mengubah status akun Audit Pusat.' };
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengubah status pengguna.' };
    }
  },

  /**
   * Pengguna mengedit profil sendiri (HANYA Nama & Password)
   * Wajib konfirmasi password lama demi keamanan & username anti-fraud
   */
  async updateProfile(
    userId: string, 
    email: string, 
    name: string, 
    currentPassword: string, 
    newPassword?: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase tidak terhubung.' };

    if (!currentPassword || !currentPassword.trim()) {
      return { success: false, error: 'Kata sandi saat ini wajib diisi untuk konfirmasi keamanan.' };
    }

    try {
      // 1. Verifikasi kata sandi saat ini
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: currentPassword,
      });

      if (verifyErr) {
        return { success: false, error: 'Kata sandi saat ini (lama) salah. Konfirmasi keamanan gagal.' };
      }

      // 2. Perbarui nama lengkap jika lolos verifikasi
      const cleanName = name.trim();
      const { error: nameError } = await supabase
        .from('users')
        .update({ name: cleanName, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (nameError) return { success: false, error: nameError.message };

      await supabase.auth.updateUser({ data: { name: cleanName } }).catch(() => {});

      // 3. Perbarui kata sandi baru jika diisi
      if (newPassword && newPassword.trim().length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword.trim()
        });
        if (passError) {
          return { success: false, error: `Nama berhasil disimpan, namun sandi baru gagal: ${passError.message}` };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal memperbarui profil.' };
    }
  },

  /**
   * Audit Pusat / Super Admin mengedit profil akun pengguna lain
   */
  async adminUpdateUser(
    userId: string,
    data: { name: string; role: UserRole; branchId?: string | null; status: 'PENDING' | 'ACTIVE' | 'INACTIVE' },
    callerRole?: UserRole,
    targetRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase tidak terhubung.' };

    if (callerRole === 'AUDIT_PUSAT') {
      if (targetRole === 'AUDIT_PUSAT' || targetRole === 'AUDIT_PUSAT_ADMIN') {
        return { success: false, error: 'Audit Pusat tidak memiliki wewenang untuk mengubah data sesama Audit Pusat atau Super Admin.' };
      }
      if (data.role === 'AUDIT_PUSAT' || data.role === 'AUDIT_PUSAT_ADMIN') {
        return { success: false, error: 'Hanya Super Admin yang berhak memberikan peran Audit Pusat atau Super Admin.' };
      }
    }

    try {
      const payload: Record<string, any> = {
        name: data.name.trim(),
        role: data.role,
        branch_id: data.branchId || null,
        status: data.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal memperbarui data pengguna.' };
    }
  }
};
