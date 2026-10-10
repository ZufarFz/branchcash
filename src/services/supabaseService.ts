/**
 * Supabase Service Facade
 * Modularized per PRD BranchCash v1.1 and modularity standard (200-300 lines limit).
 * All implementation logic is organized inside `src/services/supabase/`.
 */
export { 
  supabaseService,
  isValidUUID,
  generateUUID,
  authService,
  masterDataService,
  auditLogService,
  reportFetchService,
  reportMutationService,
  nonCashService,
  cashTransferService,
} from './supabase';
