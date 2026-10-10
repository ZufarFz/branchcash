import { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { INITIAL_EMPTY_USER, STORAGE_KEYS } from '../types';

export const useAuthState = (
  setIsSyncing: (val: boolean) => void,
  refreshFromSupabase: () => Promise<void>
) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('branchcash_auth_active') === 'true';
    } catch {
      return false;
    }
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved users', e);
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved user', e);
    }
    return INITIAL_EMPTY_USER;
  });

  // Sync currentUser to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Check Supabase Auth session on initialization & listen to auth state changes
  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      setAuthLoading(true);
      try {
        if (supabaseService.isConfigured()) {
          const client = supabaseService.getSupabaseClient();
          if (client) {
            const { data } = client.auth.onAuthStateChange(async (event, session) => {
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                  const authUser = await supabaseService.getCurrentAuthUser();
                  if (authUser) {
                    setCurrentUser(authUser);
                    setIsAuthenticated(true);
                    localStorage.setItem('branchcash_auth_active', 'true');
                  }
                }
              } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                localStorage.removeItem('branchcash_auth_active');
              }
            });
            authSubscription = data.subscription;
          }

          const authUser = await supabaseService.getCurrentAuthUser();
          if (authUser) {
            setCurrentUser(authUser);
            setIsAuthenticated(true);
            localStorage.setItem('branchcash_auth_active', 'true');
          } else {
            const wasActive = localStorage.getItem('branchcash_auth_active') === 'true';
            if (!wasActive) {
              setIsAuthenticated(false);
            }
          }
        }
      } catch (err) {
        console.warn('Auth init check warning:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    try {
      const res = await supabaseService.signInWithPassword(identifier, password);
      if (res.error) {
        return { success: false, error: res.error };
      }
      if (res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        localStorage.setItem('branchcash_auth_active', 'true');
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        await refreshFromSupabase();
        return { success: true };
      }
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Gagal masuk.' };
    } finally {
      setIsSyncing(false);
    }
  };

  const register = async (params: {
    name: string;
    username?: string;
    email: string;
    password: string;
    role: UserRole;
    branchId?: string;
  }): Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean; needsApproval?: boolean }> => {
    setIsSyncing(true);
    try {
      const res = await supabaseService.signUpWithProfile(params);
      if (res.error) {
        return { success: false, error: res.error };
      }
      if (res.user) {
        if (!res.needsEmailConfirmation && !res.needsApproval) {
          setCurrentUser(res.user);
          setIsAuthenticated(true);
          localStorage.setItem('branchcash_auth_active', 'true');
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        }
        await refreshFromSupabase();
        return { 
          success: true, 
          needsEmailConfirmation: res.needsEmailConfirmation,
          needsApproval: res.needsApproval 
        };
      }
      return { success: false, error: 'Gagal membuat akun.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Gagal mendaftar.' };
    } finally {
      setIsSyncing(false);
    }
  };

  const approveUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    try {
      const res = await supabaseService.updateUserStatus(userId, 'ACTIVE');
      if (res.success) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'ACTIVE' } : u));
      }
      return res;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Gagal mengaktifkan akun pengguna.' };
    } finally {
      setIsSyncing(false);
    }
  };

  const rejectUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    try {
      const res = await supabaseService.updateUserStatus(userId, 'INACTIVE');
      if (res.success) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'INACTIVE' } : u));
      }
      return res;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Gagal menolak akun pengguna.' };
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    try {
      if (supabaseService.isConfigured()) {
        await supabaseService.signOut();
      }
    } catch (e) {
      console.warn('Sign out warning:', e);
    } finally {
      setIsAuthenticated(false);
      localStorage.removeItem('branchcash_auth_active');
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.clear();
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (err) {
        console.warn('Error clearing auth tokens:', err);
      }
      setCurrentUser(INITIAL_EMPTY_USER);
    }
  };

  const quickDevLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('branchcash_auth_active', 'true');
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  };

  return {
    isAuthenticated,
    setIsAuthenticated,
    authLoading,
    allUsers,
    setAllUsers,
    currentUser,
    setCurrentUser,
    login,
    register,
    approveUser,
    rejectUser,
    logout,
    quickDevLogin,
  };
};
