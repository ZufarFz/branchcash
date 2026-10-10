import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient';

export const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Lightweight caches to accelerate rapid sequential non-cash transaction saves
export const cachedBanksListRef: { list: Array<{ id: string; code: string; name: string }> | null } = { list: null };
export const cachedMethodsListRef: { list: Array<{ id: string; code: string; name: string }> | null } = { list: null };
export const verifiedReportIdMap = new Map<string, string>(); // clientReportId -> dbReportId
export const verifiedUserBranchMap = new Map<string, string>(); // cashierId -> branchId

export const isConfigured = (): boolean => {
  return isSupabaseConfigured;
};

export const handleJwtError = async (errorMsg?: string): Promise<boolean> => {
  if (!errorMsg || !errorMsg.toLowerCase().includes('jwt expired')) return false;
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    console.warn('Supabase JWT expired detected, attempting automatic token refresh...');
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.warn('Session refresh failed or token revoked. Signing out to clear expired token.');
      await supabase.auth.signOut();
      return false;
    }
    console.info('Supabase JWT token successfully refreshed!');
    return true;
  } catch {
    await supabase.auth.signOut();
    return false;
  }
};

export { getSupabaseClient };
