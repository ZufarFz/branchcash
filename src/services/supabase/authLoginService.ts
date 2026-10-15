import { getSupabaseClient } from './client';
import { User, UserRole } from '../../types';

export const authLoginService = {
  /**
   * Supabase Auth: Sign In with Email or Username and Password
   */
  async signInWithPassword(identifier: string, password: string): Promise<{ user: User | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { 
        user: null, 
        error: 'Supabase client belum terkonfigurasi. Mohon periksa variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env' 
      };
    }

    try {
      const trimmedIdentifier = identifier.trim();
      let emailToAuth = trimmedIdentifier;

      if (!trimmedIdentifier.includes('@')) {
        const cleanUsername = trimmedIdentifier.toLowerCase().replace(/[^a-z0-9_.]/g, '');
        
        try {
          const { data: rpcData } = await supabase
            .rpc('get_email_by_username', { p_username: cleanUsername });

          if (Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0]?.email) {
            emailToAuth = rpcData[0].email;
          } else if (typeof rpcData === 'string' && rpcData.includes('@')) {
            emailToAuth = rpcData;
          }
        } catch {}

        if (emailToAuth === trimmedIdentifier) {
          const { data: userByUsername } = await supabase
            .from('users')
            .select('email, username')
            .ilike('username', cleanUsername)
            .maybeSingle();

          if (userByUsername?.email) {
            emailToAuth = userByUsername.email;
          } else {
            const { data: userByEmailPrefix } = await supabase
              .from('users')
              .select('email')
              .ilike('email', `${cleanUsername}@%`)
              .maybeSingle();

            if (userByEmailPrefix?.email) {
              emailToAuth = userByEmailPrefix.email;
            } else {
              emailToAuth = `${cleanUsername}@branchcash.internal`;
            }
          }
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'Username atau password salah. Silakan coba lagi.';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Akun belum aktif atau menunggu persetujuan Administrator.';
        }
        return { user: null, error: msg };
      }

      if (!data.user) {
        return { user: null, error: 'Gagal mengautentikasi pengguna.' };
      }

      const { data: profile } = await supabase
        .from('users')
        .select(`
          id,
          name,
          username,
          email,
          role,
          branch_id,
          status,
          branches ( id, code, name )
        `)
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        if (profile.status === 'PENDING') {
          await supabase.auth.signOut();
          return {
            user: null,
            error: 'Akun Anda sedang menunggu persetujuan (approval) Administrator.'
          };
        }
        if (profile.status === 'INACTIVE') {
          await supabase.auth.signOut();
          return {
            user: null,
            error: 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.'
          };
        }

        const loggedInUser: User = {
          id: profile.id,
          name: profile.name,
          username: profile.username || profile.email?.split('@')[0],
          email: profile.email,
          role: profile.role,
          branchId: profile.branch_id || undefined,
          branchName: (profile as any).branches?.name || undefined,
          status: profile.status || 'ACTIVE',
        };
        return { user: loggedInUser, error: null };
      }

      const meta = data.user.user_metadata || {};
      const fallbackUser: User = {
        id: data.user.id,
        name: meta.name || data.user.email?.split('@')[0] || 'Pengguna',
        username: meta.username || data.user.email?.split('@')[0],
        email: data.user.email || emailToAuth,
        role: (meta.role as UserRole) || 'KASIR',
        branchId: meta.branch_id || undefined,
        status: (meta.role === 'AUDIT_PUSAT' || meta.role === 'AUDIT_PUSAT_ADMIN' ? 'ACTIVE' : 'PENDING'),
      };

      try {
        await supabase.from('users').upsert({
          id: fallbackUser.id,
          username: fallbackUser.username,
          email: fallbackUser.email,
          name: fallbackUser.name,
          role: fallbackUser.role,
          branch_id: fallbackUser.branchId || null,
          status: fallbackUser.status,
        });
      } catch {}

      if (fallbackUser.status === 'PENDING') {
        await supabase.auth.signOut();
        return {
          user: null,
          error: 'Akun Anda sedang menunggu persetujuan (approval) Administrator.'
        };
      }

      return { user: fallbackUser, error: null };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Terjadi kesalahan sistem saat proses masuk.' };
    }
  },

  async signOut(): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: null };
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Gagal keluar sesi.' };
    }
  },

  async getCurrentAuthUser(): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user) return null;

      const { data: profile } = await supabase
        .from('users')
        .select(`
          id,
          name,
          username,
          email,
          role,
          branch_id,
          status,
          branches ( id, code, name )
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          username: profile.username || profile.email?.split('@')[0],
          email: profile.email,
          role: profile.role,
          branchId: profile.branch_id || undefined,
          branchName: (profile as any).branches?.name || undefined,
          status: profile.status || 'ACTIVE',
        };
      }

      const meta = session.user.user_metadata || {};
      return {
        id: session.user.id,
        name: meta.name || session.user.email?.split('@')[0] || 'Pengguna',
        email: session.user.email || '',
        role: (meta.role as UserRole) || 'KASIR',
        branchId: meta.branch_id || undefined,
        status: 'ACTIVE',
      };
    } catch {
      return null;
    }
  }
};
