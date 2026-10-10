-- ==============================================================================
-- 🚀 BRANCHCASH MASTER DATABASE SETUP (ALL-IN-ONE)
-- PRD Version: 1.1 Enterprise Cash Management
-- PostgreSQL 15+ / Supabase Cloud
-- 
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard -> Project Anda -> Menu 'SQL Editor'
-- 2. Buat New Query, paste seluruh isi file ini, lalu klik 'Run' (Ctrl + Enter)
-- 3. Seluruh schema, enum, tabel, trigger auto-lock, audit log, RLS policies,
--    dan master seed data akan dibuat dan langsung siap digunakan.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS & ENUMS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role enum sesuai PRD Bab 2
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'KASIR', 
    'SPV', 
    'KEPALA_CABANG', 
    'AUDIT_CABANG', 
    'PERBANKAN', 
    'AUDIT_PUSAT'
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

-- ==============================================================================
-- 2. MASTER DATA TABLES
-- ==============================================================================

-- Tabel Cabang
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  address TEXT NOT NULL,
  phone VARCHAR(50),
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

-- Tabel Master Bank
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Master Metode Pembayaran Non-Tunai
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. OPERATIONAL & TRANSACTION TABLES
-- ==============================================================================

-- Tabel Sesi Kas Harian Cabang (branch_cash_sessions)
-- Dibuka oleh Audit Cabang untuk menunjuk Kasir Bandar dan menjadi wadah induk laporan cabang
CREATE TABLE IF NOT EXISTS public.branch_cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  business_date DATE NOT NULL,
  bandar_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status report_status NOT NULL DEFAULT 'DRAFT',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_branch_cash_session UNIQUE (branch_id, business_date)
);

-- Tabel Utama: Laporan Kas Harian (cash_reports)
-- Menyimpan rekapitulasi kas fisik, angka pembanding POS (computer cash), dan status review/verifikasi
CREATE TABLE IF NOT EXISTS public.cash_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_session_id UUID REFERENCES public.branch_cash_sessions(id) ON DELETE RESTRICT,
  report_number VARCHAR(100) UNIQUE NOT NULL,
  business_date DATE NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status report_status NOT NULL DEFAULT 'DRAFT',
  
  -- Kas Fisik Kasir (Tunai + Non-Tunai)
  total_physical NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_non_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Computer Cash / POS (Diinput khusus oleh Audit Cabang)
  computer_cash_tunai NUMERIC(15, 2) DEFAULT NULL,
  computer_cash_non_tunai NUMERIC(15, 2) DEFAULT NULL,
  computer_cash_total NUMERIC(15, 2) DEFAULT NULL,
  computer_cash_updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  computer_cash_updated_at TIMESTAMPTZ DEFAULT NULL,

  -- Review Bertingkat Cabang
  spv_reviewed_by VARCHAR(150) DEFAULT NULL,
  spv_reviewed_at TIMESTAMPTZ DEFAULT NULL,
  spv_notes TEXT DEFAULT NULL,

  kacab_reviewed_by VARCHAR(150) DEFAULT NULL,
  kacab_reviewed_at TIMESTAMPTZ DEFAULT NULL,
  kacab_notes TEXT DEFAULT NULL,

  -- Verifikasi Final / Keputusan Audit (APPROVED / REJECTED)
  verified_at TIMESTAMPTZ DEFAULT NULL,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT NULL,

  submitted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Aturan Bisnis: 1 Kasir hanya memiliki 1 Laporan per Tanggal Bisnis
  CONSTRAINT unique_cashier_business_date UNIQUE (cashier_id, business_date)
);

-- Tabel Rincian Fisik Pecahan Kas (cash_report_denominations)
CREATE TABLE IF NOT EXISTS public.cash_report_denominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.cash_reports(id) ON DELETE CASCADE,
  denom_id UUID NOT NULL REFERENCES public.master_denoms(id) ON DELETE RESTRICT,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  breakdown JSONB DEFAULT '[]'::jsonb, -- Rincian multi-input kasir dengan catatan opsional
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_report_denom UNIQUE (report_id, denom_id)
);

-- Tabel Transaksi Non-Tunai (non_cash_transactions)
CREATE TABLE IF NOT EXISTS public.non_cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.cash_reports(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Mutasi Silang Kas Antar-Kasir (cashier_cash_transfers)
-- Mencatat penyerahan modal (Bandar -> Harian) dan setoran (Harian -> Bandar) dengan double-entry silang
CREATE TABLE IF NOT EXISTS public.cashier_cash_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_session_id UUID NOT NULL REFERENCES public.branch_cash_sessions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  business_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  partner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('MODAL', 'SETOR')),
  direction VARCHAR(5) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount NUMERIC(15, 2) NOT NULL,
  reference_transfer_id UUID DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  confirmed_at TIMESTAMPTZ DEFAULT NULL,
  confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Audit Trail & Log (audit_logs)
-- Rekam jejak immutable yang mencatat seluruh aksi, before-data, and after-data
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.cash_reports(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name VARCHAR(150) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_branch_cash_sessions_lookup ON public.branch_cash_sessions(branch_id, business_date);
CREATE INDEX IF NOT EXISTS idx_cash_reports_session_id ON public.cash_reports(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_reports_branch_date ON public.cash_reports(branch_id, business_date);
CREATE INDEX IF NOT EXISTS idx_cash_reports_cashier ON public.cash_reports(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_reports_status ON public.cash_reports(status);
CREATE INDEX IF NOT EXISTS idx_non_cash_report ON public.non_cash_transactions(report_id);
CREATE INDEX IF NOT EXISTS idx_denoms_report ON public.cash_report_denominations(report_id);
CREATE INDEX IF NOT EXISTS idx_cashier_transfers_session ON public.cashier_cash_transfers(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cashier_transfers_user ON public.cashier_cash_transfers(user_id, business_date);
CREATE INDEX IF NOT EXISTS idx_cashier_transfers_ref ON public.cashier_cash_transfers(reference_transfer_id);
CREATE INDEX IF NOT EXISTS idx_cashier_transfers_status ON public.cashier_cash_transfers(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_report ON public.audit_logs(report_id);

-- ==============================================================================
-- 4. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

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

-- Trigger: Sinkronisasi akun baru dari auth.users ke public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'KASIR';
  v_branch_id UUID := NULL;
  v_username VARCHAR(50);
  v_name VARCHAR(150);
  v_status VARCHAR(20) := 'PENDING';
  v_meta_role TEXT;
  v_meta_branch TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),
    'Pengguna'
  );

  v_username := LOWER(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  )));
  v_username := REGEXP_REPLACE(v_username, '[^a-z0-9_.]', '', 'g');

  v_meta_role := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'KASIR')));
  IF v_meta_role IN ('KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG', 'PERBANKAN', 'AUDIT_PUSAT') THEN
    v_role := v_meta_role::user_role;
  ELSE
    v_role := 'KASIR';
  END IF;

  -- Role AUDIT_PUSAT (Super Admin) otomatis aktif jika pertama kali dibuat, role lain wajib di-ACC
  IF v_role = 'AUDIT_PUSAT' THEN
    v_status := 'ACTIVE';
  ELSE
    v_status := 'PENDING';
  END IF;

  v_meta_branch := NEW.raw_user_meta_data->>'branch_id';
  IF v_meta_branch IS NOT NULL AND v_meta_branch ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    IF EXISTS (SELECT 1 FROM public.branches WHERE id = v_meta_branch::UUID) THEN
      v_branch_id := v_meta_branch::UUID;
    END IF;
  END IF;

  IF v_branch_id IS NULL AND v_role NOT IN ('AUDIT_PUSAT', 'PERBANKAN') THEN
    SELECT id INTO v_branch_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.users (id, username, email, name, role, branch_id, status)
  VALUES (NEW.id, v_username, NEW.email, v_name, v_role, v_branch_id, v_status)
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    branch_id = COALESCE(EXCLUDED.branch_id, public.users.branch_id),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Rekalkulasi otomatis total fisik uang saat denominasi atau non-tunai diinput
CREATE OR REPLACE FUNCTION public.recalc_report_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_report_id UUID;
  v_physical NUMERIC(15, 2);
  v_non_cash NUMERIC(15, 2);
BEGIN
  v_report_id := COALESCE(NEW.report_id, OLD.report_id);

  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_physical
  FROM public.cash_report_denominations
  WHERE report_id = v_report_id;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_non_cash
  FROM public.non_cash_transactions
  WHERE report_id = v_report_id;

  UPDATE public.cash_reports
  SET 
    total_physical = v_physical + v_non_cash,
    total_non_cash = v_non_cash,
    updated_at = NOW()
  WHERE id = v_report_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_recalc_denoms ON public.cash_report_denominations;
CREATE TRIGGER trigger_recalc_denoms
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_report_denominations
  FOR EACH ROW EXECUTE FUNCTION public.recalc_report_totals();

DROP TRIGGER IF EXISTS trigger_recalc_non_cash ON public.non_cash_transactions;
CREATE TRIGGER trigger_recalc_non_cash
  AFTER INSERT OR UPDATE OR DELETE ON public.non_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.recalc_report_totals();

-- Trigger: Enforce Auto-Lock pada Laporan APPROVED & Validasi Wewenang
CREATE OR REPLACE FUNCTION public.enforce_approved_report_lock()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := public.current_user_role();

  -- Jika laporan sudah APPROVED, tolak update apa pun kecuali oleh AUDIT_PUSAT (Force Edit)
  IF OLD.status = 'APPROVED' THEN
    IF v_role != 'AUDIT_PUSAT' THEN
      RAISE EXCEPTION 'Akses Ditolak: Laporan kas sudah berstatus APPROVED dan OTOMATIS TERKUNCI. Hanya Audit Pusat yang berwenang melakukan koreksi melalui Force Edit.';
    END IF;
  END IF;

  -- Validasi Approval/Rejection: Hanya Audit Cabang atau Audit Pusat
  IF NEW.status IN ('APPROVED', 'REJECTED') AND OLD.status != NEW.status THEN
    IF v_role NOT IN ('AUDIT_CABANG', 'AUDIT_PUSAT') THEN
      RAISE EXCEPTION 'Akses Ditolak: Verifikasi (Approve / Reject) laporan hanya dapat dilakukan oleh Audit Cabang atau Audit Pusat.';
    END IF;
    NEW.verified_at := NOW();
    NEW.verified_by := auth.uid();
  END IF;

  -- Validasi Input Computer Cash: Kasir Dilarang
  IF (NEW.computer_cash_total IS DISTINCT FROM OLD.computer_cash_total) THEN
    IF v_role NOT IN ('AUDIT_CABANG', 'AUDIT_PUSAT') THEN
      RAISE EXCEPTION 'Akses Ditolak: Kasir dilarang menginput atau mengubah nilai Computer Cash/POS.';
    END IF;
    NEW.computer_cash_updated_by := auth.uid();
    NEW.computer_cash_updated_at := NOW();
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_lock ON public.cash_reports;
CREATE TRIGGER trigger_enforce_lock
  BEFORE UPDATE ON public.cash_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_report_lock();

-- Trigger: Kunci Mutasi Kas yang Sudah Berstatus CONFIRMED (Permanen & Immutable)
CREATE OR REPLACE FUNCTION public.protect_confirmed_cash_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika transaksi sebelumnya sudah CONFIRMED, tolak update apa pun pada nominal, transfer_type, atau status
  IF OLD.status = 'CONFIRMED' THEN
    RAISE EXCEPTION 'Akses Ditolak: Mutasi kas yang sudah berstatus CONFIRMED (sah) terkunci secara permanen dan tidak dapat diubah nominalnya atau statusnya.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_confirmed_transfer ON public.cashier_cash_transfers;
CREATE TRIGGER trigger_protect_confirmed_transfer
  BEFORE UPDATE ON public.cashier_cash_transfers
  FOR EACH ROW EXECUTE FUNCTION public.protect_confirmed_cash_transfer();


-- Trigger: Audit Logging Otomatis pada Perubahan cash_reports
CREATE OR REPLACE FUNCTION public.log_cash_report_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name VARCHAR(150);
  v_role user_role;
  v_action VARCHAR(100);
  v_reason TEXT;
BEGIN
  SELECT name, role INTO v_user_name, v_role FROM public.users WHERE id = auth.uid();
  v_user_name := COALESCE(v_user_name, 'System / Trigger');
  v_role := COALESCE(v_role, 'AUDIT_PUSAT');

  IF OLD.status = 'APPROVED' AND NEW.status = 'APPROVED' THEN
    v_action := 'FORCE_EDIT';
    v_reason := COALESCE(current_setting('app.force_edit_reason', true), 'Koreksi audit pada laporan yang sudah disetujui');
  ELSIF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    v_action := 'APPROVE_REPORT';
    v_reason := COALESCE(NEW.notes, 'Approval laporan kas cabang oleh Audit');
  ELSIF NEW.status = 'REJECTED' AND OLD.status != 'REJECTED' THEN
    v_action := 'REJECT_REPORT';
    v_reason := COALESCE(NEW.notes, 'Laporan ditolak oleh Audit');
  ELSIF NEW.computer_cash_total IS DISTINCT FROM OLD.computer_cash_total THEN
    v_action := 'INPUT_COMPUTER_CASH';
    v_reason := COALESCE(NEW.notes, 'Input Computer Cash/POS oleh Audit Cabang');
  ELSE
    v_action := 'UPDATE_REPORT';
    v_reason := 'Pembaruan data laporan kas';
  END IF;

  INSERT INTO public.audit_logs (
    report_id,
    user_id,
    user_name,
    user_role,
    action,
    before_data,
    after_data,
    reason,
    created_at
  ) VALUES (
    NEW.id,
    auth.uid(),
    v_user_name,
    v_role,
    v_action,
    to_jsonb(OLD),
    to_jsonb(NEW),
    v_reason,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_log_report_changes ON public.cash_reports;
CREATE TRIGGER trigger_log_report_changes
  AFTER UPDATE ON public.cash_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_cash_report_changes();

-- Trigger: Cegah Pengubahan Kasir Bandar Jika Sesi Tersebut Sudah Memiliki Transaksi
CREATE OR REPLACE FUNCTION public.check_session_bandar_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.bandar_user_id IS DISTINCT FROM NEW.bandar_user_id THEN
    IF EXISTS (SELECT 1 FROM public.cashier_cash_transfers WHERE cash_session_id = OLD.id) THEN
      RAISE EXCEPTION 'Kasir Bandar tidak dapat diubah karena sudah ada transaksi transfer modal/setoran pada sesi ini.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.cash_reports WHERE cash_session_id = OLD.id) THEN
      RAISE EXCEPTION 'Kasir Bandar tidak dapat diubah karena kasir cabang sudah mulai membuat laporan kas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_session_bandar ON public.branch_cash_sessions;
CREATE TRIGGER trg_check_session_bandar
  BEFORE UPDATE ON public.branch_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_session_bandar_immutable();

-- Trigger: Immutability Audit Logs (Dilarang Mengedit atau Menghapus Audit Log)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Akses Ditolak: Tabel audit_logs bersifat IMMUTABLE. Catatan audit tidak dapat diubah atau dihapus.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_log_immutable ON public.audit_logs;
CREATE TRIGGER trigger_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- Trigger: Cegah Hard Delete pada Seluruh Tabel Master (Wajib Soft Delete is_active / status)
CREATE OR REPLACE FUNCTION public.prevent_master_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Akses Ditolak: Tabel master tidak dapat dihapus permanen. Gunakan soft delete (nonaktifkan is_active atau status).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_delete_master_denoms ON public.master_denoms;
CREATE TRIGGER trg_prevent_delete_master_denoms
  BEFORE DELETE ON public.master_denoms
  FOR EACH ROW EXECUTE FUNCTION public.prevent_master_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_banks ON public.banks;
CREATE TRIGGER trg_prevent_delete_banks
  BEFORE DELETE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_master_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_payment_methods ON public.payment_methods;
CREATE TRIGGER trg_prevent_delete_payment_methods
  BEFORE DELETE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.prevent_master_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_branches ON public.branches;
CREATE TRIGGER trg_prevent_delete_branches
  BEFORE DELETE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.prevent_master_hard_delete();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_denoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_cash_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_report_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 Policies: Master Data (branches, banks, payment_methods, master_denoms)
-- Read: branches (authenticated + anon), banks/methods/denoms (authenticated)
DROP POLICY IF EXISTS "branches_select_policy" ON public.branches;
CREATE POLICY "branches_select_policy" ON public.branches FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "banks_select_policy" ON public.banks;
CREATE POLICY "banks_select_policy" ON public.banks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "methods_select_policy" ON public.payment_methods;
CREATE POLICY "methods_select_policy" ON public.payment_methods FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "denoms_master_select_policy" ON public.master_denoms;
CREATE POLICY "denoms_master_select_policy" ON public.master_denoms FOR SELECT TO authenticated USING (true);

-- Write: INSERT & UPDATE Khusus AUDIT_PUSAT
DROP POLICY IF EXISTS "master_denoms_insert_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_insert_policy" ON public.master_denoms
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "master_denoms_update_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_update_policy" ON public.master_denoms
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "banks_insert_policy" ON public.banks;
CREATE POLICY "banks_insert_policy" ON public.banks
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "banks_update_policy" ON public.banks;
CREATE POLICY "banks_update_policy" ON public.banks
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "payment_methods_insert_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_insert_policy" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "payment_methods_update_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_update_policy" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "branches_insert_policy" ON public.branches;
CREATE POLICY "branches_insert_policy" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "branches_update_policy" ON public.branches;
CREATE POLICY "branches_update_policy" ON public.branches
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');




-- 5.2 Policies: public.users
CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own_policy" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'AUDIT_PUSAT');

-- 5.3 Policies: cash_reports (Dengan Isolasi Kasir Antar Akun)
CREATE POLICY "cash_reports_select_policy" ON public.cash_reports
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'PERBANKAN')
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR (
      public.current_user_role() IN ('SPV', 'KEPALA_CABANG', 'AUDIT_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "cash_reports_insert_policy" ON public.cash_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.current_user_role() = 'KASIR'
      AND branch_id = public.current_user_branch_id()
      AND cashier_id = auth.uid()
      AND status IN ('DRAFT', 'SUBMITTED')
      AND computer_cash_total IS NULL
    )
    OR public.current_user_role() = 'AUDIT_PUSAT'
  );

CREATE POLICY "cash_reports_update_policy" ON public.cash_reports
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
      AND status IN ('DRAFT', 'SUBMITTED', 'REJECTED')
    )
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
    OR (
      public.current_user_role() IN ('SPV', 'KEPALA_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
      AND status IN ('DRAFT', 'SUBMITTED')
    )
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
    OR (
      public.current_user_role() IN ('SPV', 'KEPALA_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "cash_reports_delete_policy" ON public.cash_reports
  FOR DELETE TO authenticated
  USING (
    (public.current_user_role() = 'KASIR' AND cashier_id = auth.uid() AND status = 'DRAFT')
    OR public.current_user_role() = 'AUDIT_PUSAT'
  );

-- 5.4 Policies: cash_report_denominations
CREATE POLICY "denoms_select_policy" ON public.cash_report_denominations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cash_reports r
      WHERE r.id = cash_report_denominations.report_id
      AND (
        public.current_user_role() IN ('AUDIT_PUSAT', 'PERBANKAN')
        OR (
          public.current_user_role() = 'KASIR'
          AND r.cashier_id = auth.uid()
        )
        OR (
          public.current_user_role() IN ('SPV', 'KEPALA_CABANG', 'AUDIT_CABANG')
          AND r.branch_id = public.current_user_branch_id()
        )
      )
    )
  );

CREATE POLICY "denoms_modify_policy" ON public.cash_report_denominations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cash_reports r
      WHERE r.id = cash_report_denominations.report_id
      AND (
        public.current_user_role() = 'AUDIT_PUSAT'
        OR (
          public.current_user_role() = 'KASIR'
          AND r.cashier_id = auth.uid()
          AND r.status IN ('DRAFT', 'SUBMITTED', 'REJECTED')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cash_reports r
      WHERE r.id = cash_report_denominations.report_id
      AND (
        public.current_user_role() = 'AUDIT_PUSAT'
        OR (
          public.current_user_role() = 'KASIR'
          AND r.cashier_id = auth.uid()
          AND r.status IN ('DRAFT', 'SUBMITTED', 'REJECTED')
        )
      )
    )
  );

-- 5.5 Policies: non_cash_transactions
CREATE POLICY "non_cash_select_policy" ON public.non_cash_transactions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'PERBANKAN')
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR (
      public.current_user_role() IN ('SPV', 'KEPALA_CABANG', 'AUDIT_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "non_cash_insert_policy" ON public.non_cash_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR public.current_user_role() = 'AUDIT_PUSAT'
  );

CREATE POLICY "non_cash_update_policy" ON public.non_cash_transactions
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('PERBANKAN', 'AUDIT_PUSAT')
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('PERBANKAN', 'AUDIT_PUSAT')
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
  );

CREATE POLICY "non_cash_delete_policy" ON public.non_cash_transactions
  FOR DELETE TO authenticated
  USING (
    (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR public.current_user_role() = 'AUDIT_PUSAT'
  );

-- 5.6 Policies: audit_logs
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_CABANG', 'SPV', 'KEPALA_CABANG')
  );

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5.7 Policies: branch_cash_sessions
CREATE POLICY "branch_cash_sessions_select_policy" ON public.branch_cash_sessions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'PERBANKAN')
    OR branch_id = public.current_user_branch_id()
  );

CREATE POLICY "branch_cash_sessions_insert_policy" ON public.branch_cash_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "branch_cash_sessions_update_policy" ON public.branch_cash_sessions
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "branch_cash_sessions_delete_policy" ON public.branch_cash_sessions
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT');

-- 5.8 Policies: cashier_cash_transfers
CREATE POLICY "cashier_cash_transfers_select_policy" ON public.cashier_cash_transfers
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'PERBANKAN')
    OR (
      branch_id = public.current_user_branch_id()
      AND (
        public.current_user_role() IN ('SPV', 'KEPALA_CABANG', 'AUDIT_CABANG')
        OR user_id = auth.uid()
        OR partner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "cashier_cash_transfers_insert_policy" ON public.cashier_cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() IN ('KASIR', 'AUDIT_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  );

CREATE POLICY "cashier_cash_transfers_update_policy" ON public.cashier_cash_transfers
  FOR UPDATE TO authenticated, anon
  USING (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR auth.uid() IS NULL
    OR (
      branch_id = public.current_user_branch_id()
      AND (
        user_id = auth.uid()
        OR partner_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR auth.uid() IS NULL
    OR (
      branch_id = public.current_user_branch_id()
      AND (
        user_id = auth.uid()
        OR partner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "cashier_cash_transfers_delete_policy" ON public.cashier_cash_transfers
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT');

-- ==============================================================================
-- 6. MASTER SEED DATA
-- ==============================================================================

-- Seed Cabang Resmi
INSERT INTO public.branches (id, code, name, city, address, phone, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'CBG-01', 'Cabang Utama Jakarta', 'Jakarta Pusat', 'Jl. Jenderal Sudirman No. 45, Jakarta Pusat', '021-5551234', 'ACTIVE'),
  ('a0000000-0000-0000-0000-000000000002', 'CBG-02', 'Cabang Surabaya Gubeng', 'Surabaya', 'Jl. Raya Gubeng No. 12, Surabaya', '031-5555678', 'ACTIVE'),
  ('a0000000-0000-0000-0000-000000000003', 'CBG-03', 'Cabang Bandung Dago', 'Bandung', 'Jl. Ir. H. Juanda No. 88, Bandung', '022-5559012', 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  status = 'ACTIVE';

-- Seed Master Denominasi Rupiah (Refactored PRD: Kertas, Koin Gabungan, MIX)
INSERT INTO public.master_denoms (id, code, nominal, label, type, sort_order, is_active) VALUES
  ('11111111-0000-0000-0000-000000100000', '100000', 100000, 'Rp 100.000', 'KERTAS', 1, TRUE),
  ('11111111-0000-0000-0000-000000050000', '50000',  50000,  'Rp 50.000',  'KERTAS', 2, TRUE),
  ('11111111-0000-0000-0000-000000020000', '20000',  20000,  'Rp 20.000',  'KERTAS', 3, TRUE),
  ('11111111-0000-0000-0000-000000010000', '10000',  10000,  'Rp 10.000',  'KERTAS', 4, TRUE),
  ('11111111-0000-0000-0000-000000005000', '5000',   5000,   'Rp 5.000',   'KERTAS', 5, TRUE),
  ('11111111-0000-0000-0000-000000002000', '2000',   2000,   'Rp 2.000',   'KERTAS', 6, TRUE),
  ('11111111-0000-0000-0000-000000001000', '1000',   1000,   'Rp 1.000',   'KERTAS', 7, TRUE),
  ('11111111-0000-0000-0000-000000000001', 'KOIN',   NULL,   'Koin (Semua Koin)', 'KOIN', 8, TRUE),
  ('11111111-0000-0000-0000-000000000002', 'MIX',    NULL,   'MIX (Uang Campur)', 'MIX', 9, TRUE)
ON CONFLICT (code) DO UPDATE SET 
  nominal = EXCLUDED.nominal,
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

-- Seed Bank Mitra
INSERT INTO public.banks (id, code, name, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'BCA',     'Bank Central Asia',          TRUE),
  ('b0000000-0000-0000-0000-000000000002', 'Mandiri', 'Bank Mandiri',              TRUE),
  ('b0000000-0000-0000-0000-000000000003', 'BRI',     'Bank Rakyat Indonesia',      TRUE),
  ('b0000000-0000-0000-0000-000000000004', 'BNI',     'Bank Negara Indonesia',      TRUE),
  ('b0000000-0000-0000-0000-000000000005', 'CIMB',    'CIMB Niaga',                 TRUE),
  ('b0000000-0000-0000-0000-000000000006', 'Permata', 'Bank Permata',               TRUE)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = TRUE;

-- Seed Metode Pembayaran
INSERT INTO public.payment_methods (id, code, name, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'QRIS',     'QRIS',                       TRUE),
  ('c0000000-0000-0000-0000-000000000002', 'Debit',    'Kartu Debit',                TRUE),
  ('c0000000-0000-0000-0000-000000000003', 'Credit',   'Kartu Kredit',               TRUE),
  ('c0000000-0000-0000-0000-000000000004', 'Transfer', 'Bank Transfer',              TRUE),
  ('c0000000-0000-0000-0000-000000000005', 'EDC',      'Mesin EDC',                  TRUE)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = TRUE;

-- ==============================================================================
-- SELESAI! Setup Database BranchCash Berhasil.
-- ==============================================================================
