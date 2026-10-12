-- ==============================================================================
-- 🚀 BRANCHCASH DATABASE SETUP - PART 2/5: MASTER TABLES & RLS
-- PRD Version: 1.1 Enterprise Cash Management
-- PostgreSQL 15+ / Supabase Cloud
-- ==============================================================================

-- ==============================================================================
-- 1. MASTER DATA TABLES
-- ==============================================================================

-- Tabel Cabang
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  address TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Profil Pengguna (Tersinkronisasi dengan auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  role user_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Master Denominasi Pecahan Uang Rupiah (Pecahan Kertas, Koin Gabungan, MIX)
CREATE TABLE IF NOT EXISTS public.master_denoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  nominal NUMERIC(15, 2) DEFAULT NULL, -- Null untuk KOIN & MIX
  label VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('KERTAS', 'KOIN', 'MIX')),
  sort_order INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Tabel Master Bank (Nama unik dan dapat menggunakan spasi)
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Master Metode Pembayaran Non-Tunai (Nama unik dan dapat menggunakan spasi)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper: Pencarian email akun berdasarkan username (Digunakan oleh Login)
DROP FUNCTION IF EXISTS public.get_email_by_username(TEXT);
DROP FUNCTION IF EXISTS public.get_email_by_username;
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TABLE (email VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT u.email
  FROM public.users u
  WHERE LOWER(u.username) = LOWER(TRIM(p_username))
     OR LOWER(u.email) = LOWER(TRIM(p_username))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES UNTUK MASTER DATA
-- ==============================================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_denoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 2.1 Policies: Master branches
DROP POLICY IF EXISTS "branches_select_policy" ON public.branches;
CREATE POLICY "branches_select_policy" ON public.branches FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "branches_insert_policy" ON public.branches;
CREATE POLICY "branches_insert_policy" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "branches_update_policy" ON public.branches;
CREATE POLICY "branches_update_policy" ON public.branches
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

-- 2.2 Policies: Master banks
DROP POLICY IF EXISTS "banks_select_policy" ON public.banks;
CREATE POLICY "banks_select_policy" ON public.banks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "banks_insert_policy" ON public.banks;
CREATE POLICY "banks_insert_policy" ON public.banks
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "banks_update_policy" ON public.banks;
CREATE POLICY "banks_update_policy" ON public.banks
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

-- 2.3 Policies: Master payment_methods
DROP POLICY IF EXISTS "methods_select_policy" ON public.payment_methods;
CREATE POLICY "methods_select_policy" ON public.payment_methods FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payment_methods_insert_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_insert_policy" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "payment_methods_update_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_update_policy" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

-- 2.4 Policies: Master master_denoms
DROP POLICY IF EXISTS "denoms_master_select_policy" ON public.master_denoms;
CREATE POLICY "denoms_master_select_policy" ON public.master_denoms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "master_denoms_insert_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_insert_policy" ON public.master_denoms
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "master_denoms_update_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_update_policy" ON public.master_denoms
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

-- 2.5 Policies: public.users (RBAC Anti-Fraud & Proteksi Super Admin)
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'AUDIT_PUSAT_ADMIN'
    OR (
      public.current_user_role() != 'AUDIT_PUSAT_ADMIN'
      AND role != 'AUDIT_PUSAT_ADMIN'
    )
  );

DROP POLICY IF EXISTS "users_anon_select_policy" ON public.users;
CREATE POLICY "users_anon_select_policy" ON public.users
  FOR SELECT TO anon
  USING (role != 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_own_policy" ON public.users;
CREATE POLICY "users_update_own_policy" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN'));

GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;
