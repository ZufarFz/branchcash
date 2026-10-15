-- ==============================================================================
-- 🚀 BRANCHCASH DATABASE SETUP - PART 1/5: EXTENSIONS & ENUMS
-- PRD Version: 1.1 Enterprise Cash Management
-- PostgreSQL 15+ / Supabase Cloud
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
-- Role enum sesuai PRD Bab 2
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'KASIR', 
    'SPV', 
    'KEPALA_CABANG', 
    'AUDIT_CABANG', 
    'PERBANKAN', 
    'AUDIT_PUSAT',
    'AUDIT_PUSAT_ADMIN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status laporan kas sesuai PRD Bab 6
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'DRAFT', 
    'SUBMITTED', 
    'REJECTED', 
    'APPROVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status pencocokan non-tunai perbankan sesuai PRD Bab 8
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM (
    'PENDING', 
    'MATCHED', 
    'UNMATCHED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. CORE AUTH HELPER FUNCTIONS (Dibutuhkan lebih awal oleh RLS & Triggers)
-- Helper: Ambil role pengguna saat ini dari public.users berdasarkan auth.uid()
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Ambil branch_id pengguna saat ini
DROP FUNCTION IF EXISTS public.current_user_branch_id() CASCADE;
CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS UUID AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  SELECT branch_id INTO v_branch_id FROM public.users WHERE id = auth.uid();
  RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Cek apakah pengguna saat ini adalah SPV yang ditugaskan sebagai Kasir (acting cashier)
DROP FUNCTION IF EXISTS public.is_acting_cashier(UUID, DATE, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.is_acting_cashier(
  p_branch_id UUID, 
  p_business_date DATE, 
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL OR p_branch_id IS NULL OR p_business_date IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.branch_cash_sessions s
    JOIN public.users u ON u.id = p_user_id
    WHERE s.branch_id = p_branch_id
      AND s.business_date = p_business_date
      AND s.acting_cashier_user_id = p_user_id
      AND u.role = 'SPV'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

