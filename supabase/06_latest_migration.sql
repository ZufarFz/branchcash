-- ==============================================================================
-- ⚡ BRANCHCASH LATEST MIGRATION / LOG UPDATE INCREMENTAL
-- 
-- CARA PENGGUNAAN:
-- File ini HANYA berisi delta/perubahan skema terbaru secara berurutan.
-- Setiap ada perubahan baru, blok skrip ditambahkan di PALING BAWAH.
-- Anda cukup copy-paste blok update terakhir yang belum pernah dijalankan.
-- ==============================================================================


-- ==============================================================================
-- UPDATE #1 - 2026-10-07
-- DESKRIPSI: Pendaftaran Pengguna Wajib Persetujuan (ACC) Admin (Status PENDING)
-- ==============================================================================

-- 1. Perbarui constraint status tabel public.users agar mendukung PENDING
DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
  ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE'));
  ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'PENDING';
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 2. Perbarui trigger handle_new_user agar pendaftar baru default status PENDING
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

  -- Role AUDIT_PUSAT otomatis ACTIVE, role cabang wajib di-ACC oleh Admin
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


-- ==============================================================================
-- UPDATE #2 - 2026-10-07
-- DESKRIPSI: Sesi Kas Cabang Harian (branch_cash_sessions), Penunjukan Kasir Bandar,
--            dan Mutasi Kas Antar-Kasir (cashier_cash_transfers)
-- ==============================================================================

-- 1. Tabel Sesi Kas Harian Cabang (branch_cash_sessions)
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

CREATE INDEX IF NOT EXISTS idx_branch_cash_sessions_lookup 
  ON public.branch_cash_sessions(branch_id, business_date);

-- 2. Tambah Kolom Relasi cash_session_id pada cash_reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'cash_reports' 
      AND column_name = 'cash_session_id'
  ) THEN
    ALTER TABLE public.cash_reports
      ADD COLUMN cash_session_id UUID REFERENCES public.branch_cash_sessions(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cash_reports_session_id 
  ON public.cash_reports(cash_session_id);

-- 3. Tabel Mutasi Silang Kas Antar-Kasir (cashier_cash_transfers)
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
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashier_transfers_session 
  ON public.cashier_cash_transfers(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cashier_transfers_user 
  ON public.cashier_cash_transfers(user_id, business_date);
CREATE INDEX IF NOT EXISTS idx_cashier_transfers_ref 
  ON public.cashier_cash_transfers(reference_transfer_id);

-- 4. RLS Policies untuk branch_cash_sessions
ALTER TABLE public.branch_cash_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "branch_cash_sessions_select_policy" ON public.branch_cash_sessions;
  DROP POLICY IF EXISTS "branch_cash_sessions_insert_policy" ON public.branch_cash_sessions;
  DROP POLICY IF EXISTS "branch_cash_sessions_update_policy" ON public.branch_cash_sessions;
  DROP POLICY IF EXISTS "branch_cash_sessions_delete_policy" ON public.branch_cash_sessions;
END $$;

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

-- 5. RLS Policies untuk cashier_cash_transfers
ALTER TABLE public.cashier_cash_transfers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cashier_cash_transfers_select_policy" ON public.cashier_cash_transfers;
  DROP POLICY IF EXISTS "cashier_cash_transfers_insert_policy" ON public.cashier_cash_transfers;
  DROP POLICY IF EXISTS "cashier_cash_transfers_delete_policy" ON public.cashier_cash_transfers;
END $$;

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

CREATE POLICY "cashier_cash_transfers_delete_policy" ON public.cashier_cash_transfers
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT');


-- ==============================================================================
-- UPDATE #3 - 2026-10-07
-- DESKRIPSI: Konfirmasi/Approval Penerimaan Uang per Transfer Kas &
--            Proteksi Pengubahan Kasir Bandar Jika Sudah Ada Transaksi
-- ==============================================================================

-- 1. Tambah Kolom Status & Konfirmasi pada cashier_cash_transfers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'cashier_cash_transfers' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.cashier_cash_transfers
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
      ADD COLUMN confirmed_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cashier_transfers_status 
  ON public.cashier_cash_transfers(status);

-- 2. Kebijakan RLS UPDATE untuk Konfirmasi Transfer Kas
DO $$ BEGIN
  DROP POLICY IF EXISTS "cashier_cash_transfers_update_policy" ON public.cashier_cash_transfers;
END $$;

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

-- 3. Trigger: Cegah Pengubahan Kasir Bandar Jika Sesi Tersebut Sudah Memiliki Transaksi
CREATE OR REPLACE FUNCTION public.check_session_bandar_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.bandar_user_id IS DISTINCT FROM NEW.bandar_user_id THEN
    -- Periksa apakah sudah ada mutasi transfer kas
    IF EXISTS (SELECT 1 FROM public.cashier_cash_transfers WHERE cash_session_id = OLD.id) THEN
      RAISE EXCEPTION 'Kasir Bandar tidak dapat diubah karena sudah ada transaksi transfer modal/setoran pada sesi ini.';
    END IF;

    -- Periksa apakah sudah ada laporan kas kasir yang berelasi
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


-- ==============================================================================
-- UPDATE #7 - 2026-10-10
-- DESKRIPSI: Immutabilitas Mutasi Kas Sah (CONFIRMED) & Pengajuan Ulang Modal Ditolak
-- ==============================================================================

-- 1. Trigger: Kunci Mutasi Kas yang Sudah Berstatus CONFIRMED (Permanen & Immutable)
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


-- ==============================================================================
-- UPDATE #8 - 2026-10-10
-- DESKRIPSI: Izinkan Akses Publik (anon) KHUSUS untuk Master Cabang (Pendaftaran Akun)
-- ==============================================================================

-- 1. Berikan hak SELECT untuk anon dan authenticated KHUSUS pada tabel branches
DROP POLICY IF EXISTS "branches_select_policy" ON public.branches;
CREATE POLICY "branches_select_policy" ON public.branches 
  FOR SELECT TO authenticated, anon 
  USING (true);

-- 2. Pastikan tabel master lain (banks, payment_methods, master_denoms) TETAP HANYA untuk authenticated
DROP POLICY IF EXISTS "banks_select_policy" ON public.banks;
CREATE POLICY "banks_select_policy" ON public.banks 
  FOR SELECT TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "methods_select_policy" ON public.payment_methods;
CREATE POLICY "methods_select_policy" ON public.payment_methods 
  FOR SELECT TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "denoms_master_select_policy" ON public.master_denoms;
CREATE POLICY "denoms_master_select_policy" ON public.master_denoms 
  FOR SELECT TO authenticated 
  USING (true);


-- ==============================================================================
-- UPDATE #9 - 2026-10-10
-- DESKRIPSI: Wewenang Tambah & Edit Master Data Khusus Audit Pusat (Soft Delete Only)
-- ==============================================================================

-- 1. Policies INSERT & UPDATE pada public.master_denoms
DROP POLICY IF EXISTS "master_denoms_insert_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_insert_policy" ON public.master_denoms
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "master_denoms_update_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_update_policy" ON public.master_denoms
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

-- 2. Policies INSERT & UPDATE pada public.banks
DROP POLICY IF EXISTS "banks_insert_policy" ON public.banks;
CREATE POLICY "banks_insert_policy" ON public.banks
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "banks_update_policy" ON public.banks;
CREATE POLICY "banks_update_policy" ON public.banks
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

-- 3. Policies INSERT & UPDATE pada public.payment_methods
DROP POLICY IF EXISTS "payment_methods_insert_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_insert_policy" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "payment_methods_update_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_update_policy" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

-- 4. Policies INSERT & UPDATE pada public.branches
DROP POLICY IF EXISTS "branches_insert_policy" ON public.branches;
CREATE POLICY "branches_insert_policy" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

DROP POLICY IF EXISTS "branches_update_policy" ON public.branches;
CREATE POLICY "branches_update_policy" ON public.branches
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT');

-- 5. Trigger Cegah Hard Delete pada Seluruh Tabel Master (Wajib Soft Delete is_active / status)
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
-- UPDATE #10 - 2026-10-12
-- DESKRIPSI: Pemisahan Role Super Admin AUDIT_PUSAT_ADMIN & Hak Khusus Master Data
-- ==============================================================================

-- 1. Tambahkan nilai enum AUDIT_PUSAT_ADMIN ke tipe user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AUDIT_PUSAT_ADMIN';

-- 2. Perbarui trigger handle_new_user agar mengenali AUDIT_PUSAT_ADMIN sebagai status ACTIVE
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
  IF v_meta_role IN ('KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG', 'PERBANKAN', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
    v_role := v_meta_role::user_role;
  ELSE
    v_role := 'KASIR';
  END IF;

  -- Role kantor pusat (AUDIT_PUSAT & AUDIT_PUSAT_ADMIN) otomatis ACTIVE
  IF v_role IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
    v_status := 'ACTIVE';
  ELSE
    v_status := 'PENDING';
  END IF;

  v_meta_branch := NEW.raw_user_meta_data->>'branch_id';
  IF v_meta_branch IS NOT NULL AND v_meta_branch <> '' THEN
    BEGIN
      v_branch_id := v_meta_branch::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_branch_id := NULL;
    END;
  END IF;

  INSERT INTO public.users (id, username, email, name, role, branch_id, status)
  VALUES (NEW.id, v_username, NEW.email, v_name, v_role, v_branch_id, v_status)
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(public.users.username, EXCLUDED.username),
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = COALESCE(public.users.role, EXCLUDED.role),
    branch_id = COALESCE(public.users.branch_id, EXCLUDED.branch_id),
    status = COALESCE(public.users.status, EXCLUDED.status),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pastikan trigger HANYA berjalan saat registrasi baru (AFTER INSERT), BUKAN saat login (UPDATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Batasi Mutasi Master Data (INSERT & UPDATE) HANYA untuk AUDIT_PUSAT_ADMIN (Super Admin)
DROP POLICY IF EXISTS "master_denoms_insert_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_insert_policy" ON public.master_denoms
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "master_denoms_update_policy" ON public.master_denoms;
CREATE POLICY "master_denoms_update_policy" ON public.master_denoms
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "banks_insert_policy" ON public.banks;
CREATE POLICY "banks_insert_policy" ON public.banks
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "banks_update_policy" ON public.banks;
CREATE POLICY "banks_update_policy" ON public.banks
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "payment_methods_insert_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_insert_policy" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "payment_methods_update_policy" ON public.payment_methods;
CREATE POLICY "payment_methods_update_policy" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "branches_insert_policy" ON public.branches;
CREATE POLICY "branches_insert_policy" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

DROP POLICY IF EXISTS "branches_update_policy" ON public.branches;
CREATE POLICY "branches_update_policy" ON public.branches
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT_ADMIN')
  WITH CHECK (public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

-- 4. Hak Akses Persetujuan Pengguna (User Approval) HANYA untuk AUDIT_PUSAT_ADMIN
DROP POLICY IF EXISTS "users_update_own_policy" ON public.users;
CREATE POLICY "users_update_own_policy" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'AUDIT_PUSAT_ADMIN');

-- 5. Hak Akses Monitoring & Approval Laporan untuk AUDIT_PUSAT dan AUDIT_PUSAT_ADMIN
DROP POLICY IF EXISTS "cash_reports_select_policy" ON public.cash_reports;
CREATE POLICY "cash_reports_select_policy" ON public.cash_reports
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN', 'PERBANKAN')
    OR (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR (
      public.current_user_role() IN ('SPV', 'KEPALA_CABANG', 'AUDIT_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  );

DROP POLICY IF EXISTS "cash_reports_update_policy" ON public.cash_reports;
CREATE POLICY "cash_reports_update_policy" ON public.cash_reports
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
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
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
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

DROP POLICY IF EXISTS "cash_reports_delete_policy" ON public.cash_reports;
CREATE POLICY "cash_reports_delete_policy" ON public.cash_reports
  FOR DELETE TO authenticated
  USING (
    (public.current_user_role() = 'KASIR' AND cashier_id = auth.uid() AND status = 'DRAFT')
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
  );


-- ==============================================================================
-- UPDATE #11 - 2026-10-12
-- DESKRIPSI: Perbaikan Mutlak Trigger Registrasi Pengguna Baru & Kebijakan INSERT RLS
-- SOLUSI: Mengatasi error "Database error saving new user" saat pendaftaran akun baru
-- ==============================================================================

-- 1. Berikan Policy INSERT pada public.users agar tidak terblokir RLS
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- 2. Pastikan tabel public.users memiliki grants untuk semua role Supabase
GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 3. Perbarui fungsi trigger handle_new_user dengan perlindungan menyeluruh
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
  v_user_count INT := 0;
BEGIN
  -- Seluruh operasi dibungkus blok exception agar tidak pernah menggagalkan pendaftaran auth.users
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
    IF v_username IS NULL OR v_username = '' THEN
      v_username := 'user_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
    END IF;

    -- Cegah error constraint unique jika username sudah terpakai
    SELECT COUNT(*) INTO v_user_count FROM public.users WHERE username = v_username AND id <> NEW.id;
    IF v_user_count > 0 THEN
      v_username := SUBSTRING(v_username, 1, 38) || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6);
    END IF;

    v_meta_role := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'KASIR')));
    BEGIN
      IF v_meta_role IN ('KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG', 'PERBANKAN', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
        v_role := v_meta_role::user_role;
      ELSE
        v_role := 'KASIR';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'KASIR';
    END;

    -- Role AUDIT_PUSAT dan AUDIT_PUSAT_ADMIN otomatis ACTIVE, role cabang berstatus PENDING
    IF v_role IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
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

    -- Jika peran cabang belum memiliki branch_id valid, pasang ke cabang pertama
    IF v_branch_id IS NULL AND v_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN', 'PERBANKAN') THEN
      SELECT id INTO v_branch_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
    END IF;

    INSERT INTO public.users (id, username, email, name, role, branch_id, status)
    VALUES (NEW.id, v_username, NEW.email, v_name, v_role, v_branch_id, v_status)
    ON CONFLICT (id) DO UPDATE SET
      username = COALESCE(public.users.username, EXCLUDED.username),
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = COALESCE(public.users.role, EXCLUDED.role),
      branch_id = COALESCE(public.users.branch_id, EXCLUDED.branch_id),
      status = COALESCE(public.users.status, EXCLUDED.status),
      updated_at = NOW();

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user safe fallback caught error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- 4. Pastikan trigger HANYA aktif saat pendaftaran baru (AFTER INSERT)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- UPDATE #12 - 2026-10-12
-- DESKRIPSI: Wajib Persetujuan (PENDING) untuk Seluruh Akun Baru & Akses Manajemen Pengguna
-- ==============================================================================

-- 1. Perbarui trigger handle_new_user: Seluruh pendaftar baru default status PENDING
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
  v_user_count INT := 0;
BEGIN
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
    IF v_username IS NULL OR v_username = '' THEN
      v_username := 'user_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
    END IF;

    -- Cegah error constraint unique jika username sudah terpakai
    SELECT COUNT(*) INTO v_user_count FROM public.users WHERE username = v_username AND id <> NEW.id;
    IF v_user_count > 0 THEN
      v_username := SUBSTRING(v_username, 1, 38) || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6);
    END IF;

    v_meta_role := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'KASIR')));
    BEGIN
      IF v_meta_role IN ('KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG', 'PERBANKAN', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
        v_role := v_meta_role::user_role;
      ELSE
        v_role := 'KASIR';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'KASIR';
    END;

    -- ATURAN MUTLAK: Seluruh akun pendaftar baru wajib berstatus PENDING dan butuh persetujuan
    v_status := 'PENDING';

    v_meta_branch := NEW.raw_user_meta_data->>'branch_id';
    IF v_meta_branch IS NOT NULL AND v_meta_branch ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      IF EXISTS (SELECT 1 FROM public.branches WHERE id = v_meta_branch::UUID) THEN
        v_branch_id := v_meta_branch::UUID;
      END IF;
    END IF;

    -- Jika peran cabang belum memiliki branch_id valid, pasang ke cabang pertama
    IF v_branch_id IS NULL AND v_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN', 'PERBANKAN') THEN
      SELECT id INTO v_branch_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
    END IF;

    INSERT INTO public.users (id, username, email, name, role, branch_id, status)
    VALUES (NEW.id, v_username, NEW.email, v_name, v_role, v_branch_id, v_status)
    ON CONFLICT (id) DO UPDATE SET
      username = COALESCE(public.users.username, EXCLUDED.username),
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = COALESCE(public.users.role, EXCLUDED.role),
      branch_id = COALESCE(public.users.branch_id, EXCLUDED.branch_id),
      status = COALESCE(public.users.status, EXCLUDED.status),
      updated_at = NOW();

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user safe fallback caught error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- 2. Hak Akses Persetujuan Pengguna (User Approval) untuk AUDIT_PUSAT dan AUDIT_PUSAT_ADMIN
DROP POLICY IF EXISTS "users_update_own_policy" ON public.users;
CREATE POLICY "users_update_own_policy" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() 
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
  );


-- ==============================================================================
-- UPDATE #13 - 2026-10-12
-- DESKRIPSI: Proteksi Anti-Fraud Username & Kebebasan Edit Profil/Pengguna
-- ==============================================================================

-- 1. Trigger fungsi pengaman pembaruan profil pengguna pada public.users
CREATE OR REPLACE FUNCTION public.protect_user_fields_tampering()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  -- DILARANG MENGUBAH USERNAME untuk siapapun (Anti-Fraud & Konsistensi Audit Trail)
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    NEW.username := OLD.username;
  END IF;

  -- Kunci ID dan Email agar tidak berubah
  NEW.id := OLD.id;
  NEW.email := OLD.email;

  -- Dapatkan role pemanggil dari JWT auth
  v_caller_role := public.current_user_role();

  -- Jika bukan Audit Pusat / Super Admin (pengguna biasa mengedit profil sendiri)
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
    -- Kunci role, branch_id, dan status agar tidak bisa dieskalasi mandiri
    NEW.role := OLD.role;
    NEW.branch_id := OLD.branch_id;
    NEW.status := OLD.status;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- UPDATE #14 - 2026-10-12
-- DESKRIPSI: Isolasi Seleksi Super Admin (AUDIT_PUSAT_ADMIN) & Proteksi Edit Sesama Audit Pusat
-- ==============================================================================

-- 1. RLS SELECT pada public.users
-- Supaya:
-- a. User login selalu bisa SELECT dirinya sendiri (id = auth.uid()) tanpa bug saat login
-- b. AUDIT_PUSAT_ADMIN dapat SELECT seluruh user (termasuk sesama superadmin)
-- c. Pengguna selain AUDIT_PUSAT_ADMIN (termasuk AUDIT_PUSAT) TIDAK DAPAT SELECT akun AUDIT_PUSAT_ADMIN
-- d. Anonimous (anon) tetap dapat lookup untuk proses sign-in by username

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

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- 2. Perketat Database Trigger protect_user_fields_tampering()
CREATE OR REPLACE FUNCTION public.protect_user_fields_tampering()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  -- DILARANG MENGUBAH USERNAME untuk siapapun (Anti-Fraud & Konsistensi Audit Trail)
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    NEW.username := OLD.username;
  END IF;

  -- Kunci ID dan Email agar tidak berubah
  NEW.id := OLD.id;
  NEW.email := OLD.email;

  -- Dapatkan role pemanggil dari JWT auth
  v_caller_role := public.current_user_role();

  -- Jika bukan Audit Pusat / Super Admin (pengguna biasa mengedit profil sendiri)
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
    -- Kunci role, branch_id, dan status agar tidak bisa dieskalasi mandiri
    NEW.role := OLD.role;
    NEW.branch_id := OLD.branch_id;
    NEW.status := OLD.status;
  END IF;

  -- Jika pemanggil adalah AUDIT_PUSAT (biasa):
  -- DILARANG mengedit data sesama AUDIT_PUSAT atau AUDIT_PUSAT_ADMIN
  IF v_caller_role = 'AUDIT_PUSAT' AND OLD.id != auth.uid() THEN
    IF OLD.role IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
      RAISE EXCEPTION 'Audit Pusat tidak memiliki wewenang untuk mengubah data sesama Audit Pusat atau Super Admin.';
    END IF;
    -- Dilarang mempromosikan pengguna manapun menjadi AUDIT_PUSAT atau AUDIT_PUSAT_ADMIN
    IF NEW.role IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Hanya Super Admin yang berhak memberikan peran Audit Pusat atau Super Admin.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- UPDATE #15 - 2026-10-12
-- DESKRIPSI: Tabel Mutasi Operasional Kasir (cashier_operational_adjustments) &
--            Kolom total_expense_adjustment / total_income_adjustment pada cash_reports
-- ==============================================================================

-- 1. Tambah 2 kolom penyesuaian operasional pada cash_reports
ALTER TABLE public.cash_reports
  ADD COLUMN IF NOT EXISTS total_expense_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_income_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- 2. Buat tabel cashier_operational_adjustments (Pengeluaran/Pemasukan Non-POS Kasir)
CREATE TABLE IF NOT EXISTS public.cashier_operational_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.cash_reports(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  business_date DATE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  notes TEXT NOT NULL,
  receipt_url TEXT DEFAULT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa
CREATE INDEX IF NOT EXISTS idx_cashier_adj_report ON public.cashier_operational_adjustments(report_id);
CREATE INDEX IF NOT EXISTS idx_cashier_adj_branch_date ON public.cashier_operational_adjustments(branch_id, business_date);
CREATE INDEX IF NOT EXISTS idx_cashier_adj_cashier ON public.cashier_operational_adjustments(cashier_id);

-- 3. Trigger Rekalkulasi Otomatis ke cash_reports saat adjustment dibuat/diubah
CREATE OR REPLACE FUNCTION public.recalc_operational_adjustments()
RETURNS TRIGGER AS $$
DECLARE
  v_report_id UUID;
  v_cashier_id UUID;
  v_business_date DATE;
  v_expense NUMERIC(15, 2);
  v_income NUMERIC(15, 2);
BEGIN
  v_report_id := COALESCE(NEW.report_id, OLD.report_id);
  v_cashier_id := COALESCE(NEW.cashier_id, OLD.cashier_id);
  v_business_date := COALESCE(NEW.business_date, OLD.business_date);

  IF v_report_id IS NULL AND v_cashier_id IS NOT NULL AND v_business_date IS NOT NULL THEN
    SELECT id INTO v_report_id 
    FROM public.cash_reports 
    WHERE cashier_id = v_cashier_id AND business_date = v_business_date 
    LIMIT 1;

    IF TG_OP = 'INSERT' AND v_report_id IS NOT NULL AND NEW.report_id IS NULL THEN
      UPDATE public.cashier_operational_adjustments
      SET report_id = v_report_id
      WHERE id = NEW.id;
    END IF;
  END IF;

  IF v_report_id IS NOT NULL THEN
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)
    INTO v_expense, v_income
    FROM public.cashier_operational_adjustments
    WHERE report_id = v_report_id OR (cashier_id = v_cashier_id AND business_date = v_business_date);

    UPDATE public.cash_reports
    SET 
      total_expense_adjustment = v_expense,
      total_income_adjustment = v_income,
      updated_at = NOW()
    WHERE id = v_report_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_recalc_cashier_adj ON public.cashier_operational_adjustments;
CREATE TRIGGER trg_recalc_cashier_adj
  AFTER INSERT OR UPDATE OR DELETE ON public.cashier_operational_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_operational_adjustments();

-- 4. Sinkronisasi report_id & saldo adjustment saat cash_report dibuat
CREATE OR REPLACE FUNCTION public.sync_adjustments_on_report_create()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cashier_operational_adjustments
  SET report_id = NEW.id
  WHERE cashier_id = NEW.cashier_id 
    AND business_date = NEW.business_date 
    AND report_id IS NULL;

  SELECT 
    COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)
  INTO NEW.total_expense_adjustment, NEW.total_income_adjustment
  FROM public.cashier_operational_adjustments
  WHERE cashier_id = NEW.cashier_id AND business_date = NEW.business_date;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_adj_on_report_create ON public.cash_reports;
CREATE TRIGGER trg_sync_adj_on_report_create
  BEFORE INSERT ON public.cash_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_adjustments_on_report_create();

-- 5. RLS Policies untuk cashier_operational_adjustments
ALTER TABLE public.cashier_operational_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cashier_adj_select_policy" ON public.cashier_operational_adjustments;
CREATE POLICY "cashier_adj_select_policy" ON public.cashier_operational_adjustments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN', 'PERBANKAN')
    OR (
      branch_id = public.current_user_branch_id()
      AND (
        public.current_user_role() IN ('SPV', 'KEPALA_CABANG', 'AUDIT_CABANG')
        OR cashier_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "cashier_adj_insert_policy" ON public.cashier_operational_adjustments;
CREATE POLICY "cashier_adj_insert_policy" ON public.cashier_operational_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  );

DROP POLICY IF EXISTS "cashier_adj_update_policy" ON public.cashier_operational_adjustments;
CREATE POLICY "cashier_adj_update_policy" ON public.cashier_operational_adjustments
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  );

DROP POLICY IF EXISTS "cashier_adj_delete_policy" ON public.cashier_operational_adjustments;
CREATE POLICY "cashier_adj_delete_policy" ON public.cashier_operational_adjustments
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  );

GRANT ALL ON TABLE public.cashier_operational_adjustments TO postgres, authenticated, service_role;

-- ==============================================================================
-- UPDATE #16 - 2026-10-12
-- DESKRIPSI: Relaksasi Pengubahan Kasir Bandar (Hanya Terkunci Jika Ada Transfer Kas)
--            & Penautan Otomatis Sesi Kas pada Laporan Kasir
-- ==============================================================================

-- 1. Perbarui trigger check_session_bandar_immutable:
--    Hanya kunci pengubahan bandar jika ADA data di cashier_cash_transfers.
--    Draft laporan kas kasir TIDAK LAGI mengunci pergantian Kasir Bandar.
CREATE OR REPLACE FUNCTION public.check_session_bandar_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.bandar_user_id IS DISTINCT FROM NEW.bandar_user_id THEN
    -- Kuncian mutlak HANYA jika sudah ada mutasi transfer kas/modal/setoran
    IF EXISTS (SELECT 1 FROM public.cashier_cash_transfers WHERE cash_session_id = OLD.id) THEN
      RAISE EXCEPTION 'Kasir Bandar tidak dapat diubah karena sudah ada transaksi transfer modal/setoran pada sesi ini.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger penautan otomatis cash_session_id saat sesi kas harian dibuka
CREATE OR REPLACE FUNCTION public.sync_cash_reports_on_session_create()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cash_reports
  SET cash_session_id = NEW.id
  WHERE branch_id = NEW.branch_id
    AND business_date = NEW.business_date
    AND cash_session_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_reports_on_session_create ON public.branch_cash_sessions;
CREATE TRIGGER trg_sync_reports_on_session_create
  AFTER INSERT OR UPDATE ON public.branch_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_cash_reports_on_session_create();

-- 3. Trigger penautan otomatis cash_session_id saat cash_report dibuat
CREATE OR REPLACE FUNCTION public.auto_link_session_on_report_create()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF NEW.cash_session_id IS NULL THEN
    SELECT id INTO v_session_id
    FROM public.branch_cash_sessions
    WHERE branch_id = NEW.branch_id AND business_date = NEW.business_date
    LIMIT 1;

    IF v_session_id IS NOT NULL THEN
      NEW.cash_session_id := v_session_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_link_session_on_report ON public.cash_reports;
CREATE TRIGGER trg_auto_link_session_on_report
  BEFORE INSERT ON public.cash_reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_session_on_report_create();

-- ==============================================================================
-- UPDATE #17 - 2026-10-12
-- DESKRIPSI: Penyederhanaan Kolom Database:
--            1. Tabel banks: Hapus logo & code, name dibuat UNIQUE.
--            2. Tabel payment_methods: Hapus code, name dibuat UNIQUE.
--            3. Tabel branches: Hapus phone.
--            4. Tabel branch_cash_sessions: Hapus notes.
--            5. Tabel cash_reports: Hapus review bertingkat SPV/Kacab & submitted_at.
--            6. Tabel cashier_operational_adjustments: Hapus receipt_url.
-- ==============================================================================

-- 1. Tabel banks: Hapus logo & code, jadikan name UNIQUE
ALTER TABLE public.banks DROP COLUMN IF EXISTS logo;
ALTER TABLE public.banks DROP COLUMN IF EXISTS code CASCADE;
DO $$ BEGIN
  ALTER TABLE public.banks ADD CONSTRAINT unique_bank_name UNIQUE (name);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 2. Tabel payment_methods: Hapus code, jadikan name UNIQUE
ALTER TABLE public.payment_methods DROP COLUMN IF EXISTS code CASCADE;
DO $$ BEGIN
  ALTER TABLE public.payment_methods ADD CONSTRAINT unique_payment_method_name UNIQUE (name);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 3. Tabel branches: Hapus phone
ALTER TABLE public.branches DROP COLUMN IF EXISTS phone;

-- 4. Tabel branch_cash_sessions: Hapus notes
ALTER TABLE public.branch_cash_sessions DROP COLUMN IF EXISTS notes;

-- 5. Tabel cash_reports: Hapus review bertingkat SPV/Kacab & submitted_at
ALTER TABLE public.cash_reports
  DROP COLUMN IF EXISTS spv_reviewed_by,
  DROP COLUMN IF EXISTS spv_reviewed_at,
  DROP COLUMN IF EXISTS spv_notes,
  DROP COLUMN IF EXISTS kacab_reviewed_by,
  DROP COLUMN IF EXISTS kacab_reviewed_at,
  DROP COLUMN IF EXISTS kacab_notes,
  DROP COLUMN IF EXISTS submitted_at;

-- 6. Tabel cashier_operational_adjustments: Hapus receipt_url
ALTER TABLE public.cashier_operational_adjustments DROP COLUMN IF EXISTS receipt_url;

-- ==============================================================================
-- UPDATE #20 - 2026-10-13: Saldo Awal Bandar Menurut Komputer (computer_beginning_cash)
-- DESKRIPSI: Menambahkan kolom computer_beginning_cash pada tabel branch_cash_sessions
--            untuk mencatat saldo awal modal kasir bandar harian menurut sistem POS/Komputer.
-- ==============================================================================

ALTER TABLE public.branch_cash_sessions
  ADD COLUMN IF NOT EXISTS computer_beginning_cash NUMERIC(15, 2) DEFAULT 0;

-- ==============================================================================
-- UPDATE #21 - 2026-10-13: Penyesuaian Kolom total_physical Murni Kas Fisik Tunai
-- DESKRIPSI: 1. Memperbarui fungsi trigger recalc_report_totals() agar kolom total_physical
--               pada tabel cash_reports murni menyimpan total kas fisik uang tunai (kertas + koin),
--               bukan penjumlahan tunai + non-tunai.
--            2. Menyinkronkan data lama pada cash_reports agar total_physical sesuai
--               dengan SUM(subtotal) dari tabel cash_report_denominations (Rp 0 jika tunai kosong).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.recalc_report_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_report_id UUID;
  v_physical NUMERIC(15, 2);
  v_non_cash NUMERIC(15, 2);
BEGIN
  v_report_id := COALESCE(NEW.report_id, OLD.report_id);

  IF TG_TABLE_NAME = 'cash_report_denominations' THEN
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_physical
    FROM public.cash_report_denominations
    WHERE report_id = v_report_id;

    UPDATE public.cash_reports
    SET 
      total_physical = v_physical,
      updated_at = NOW()
    WHERE id = v_report_id;

  ELSIF TG_TABLE_NAME = 'non_cash_transactions' THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_non_cash
    FROM public.non_cash_transactions
    WHERE report_id = v_report_id;

    UPDATE public.cash_reports
    SET 
      total_non_cash = v_non_cash,
      updated_at = NOW()
    WHERE id = v_report_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pasang ulang triggers untuk memastikan mengarah ke fungsi terbaru
DROP TRIGGER IF EXISTS trigger_recalc_denoms ON public.cash_report_denominations;
CREATE TRIGGER trigger_recalc_denoms
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_report_denominations
  FOR EACH ROW EXECUTE FUNCTION public.recalc_report_totals();

DROP TRIGGER IF EXISTS trigger_recalc_non_cash ON public.non_cash_transactions;
CREATE TRIGGER trigger_recalc_non_cash
  AFTER INSERT OR UPDATE OR DELETE ON public.non_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.recalc_report_totals();

-- Sinkronisasi baris data yang ada saat ini: reset total_physical agar murni kas tunai
UPDATE public.cash_reports cr
SET total_physical = COALESCE((
  SELECT SUM(subtotal)
  FROM public.cash_report_denominations crd
  WHERE crd.report_id = cr.id
), 0);

-- ==============================================================================
-- UPDATE #22 - 2026-10-13
-- DESKRIPSI: Izinkan update status/role pengguna langsung dari Supabase Studio /
--            SQL Editor (auth.uid() IS NULL) dan Auto-Promote Admin Pertama saat Registrasi
-- ==============================================================================

-- 1. Perbarui trigger proteksi tampering agar membolehkan DBA / SQL Editor / Supabase Studio
--    mengubah status, role, dan branch_id pengguna tanpa dibatalkan secara diam-diam.
CREATE OR REPLACE FUNCTION public.protect_user_fields_tampering()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  -- DILARANG MENGUBAH USERNAME jika dipanggil dari sesi auth JWT pengguna
  IF auth.uid() IS NOT NULL AND NEW.username IS DISTINCT FROM OLD.username THEN
    NEW.username := OLD.username;
  END IF;

  -- Kunci ID dan Email agar tidak berubah
  NEW.id := OLD.id;
  NEW.email := OLD.email;

  -- Jika perubahan dilakukan langsung dari SQL Editor / Supabase Studio / Service Role / DBA (auth.uid() IS NULL),
  -- izinkan langsung tanpa pembatasan anti-tampering JWT
  IF auth.uid() IS NULL THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- Dapatkan role pemanggil dari JWT auth
  v_caller_role := public.current_user_role();

  -- Jika bukan Audit Pusat / Super Admin (pengguna biasa mengedit profil sendiri)
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
    -- Kunci role, branch_id, dan status agar tidak bisa dieskalasi mandiri
    NEW.role := OLD.role;
    NEW.branch_id := OLD.branch_id;
    NEW.status := OLD.status;
  END IF;

  -- Jika pemanggil adalah AUDIT_PUSAT (biasa):
  -- DILARANG mengedit data sesama AUDIT_PUSAT atau AUDIT_PUSAT_ADMIN
  IF v_caller_role = 'AUDIT_PUSAT' AND OLD.id != auth.uid() THEN
    IF OLD.role IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
      RAISE EXCEPTION 'Audit Pusat tidak memiliki wewenang untuk mengubah data sesama Audit Pusat atau Super Admin.';
    END IF;
    -- Dilarang mempromosikan pengguna manapun menjadi AUDIT_PUSAT atau AUDIT_PUSAT_ADMIN
    IF NEW.role IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Hanya Super Admin yang berhak memberikan peran Audit Pusat atau Super Admin.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pasang ulang trigger
DROP TRIGGER IF EXISTS trg_protect_user_tampering ON public.users;
CREATE TRIGGER trg_protect_user_tampering
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields_tampering();

-- 2. Perbarui trigger handle_new_user agar otomatis menjadikan pendaftar pertama
--    sebagai AUDIT_PUSAT_ADMIN dan langsung ACTIVE jika sistem belum memiliki Super Admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'KASIR';
  v_branch_id UUID := NULL;
  v_name TEXT;
  v_username TEXT;
  v_meta_role TEXT;
  v_meta_branch TEXT;
  v_status VARCHAR(20);
BEGIN
  BEGIN
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    
    v_meta_role := NEW.raw_user_meta_data->>'role';
    BEGIN
      IF v_meta_role IS NOT NULL AND v_meta_role IN ('KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG', 'PERBANKAN', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
        v_role := v_meta_role::user_role;
      ELSE
        v_role := 'KASIR';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'KASIR';
    END;

    -- JIKA SISTEM BELUM MEMILIKI AUDIT_PUSAT_ADMIN AKTIF (Bootstrap awal sistem):
    -- Otomatis jadikan pendaftar pertama sebagai AUDIT_PUSAT_ADMIN dan langsung ACTIVE
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'AUDIT_PUSAT_ADMIN' AND status = 'ACTIVE') THEN
      v_role := 'AUDIT_PUSAT_ADMIN';
      v_status := 'ACTIVE';
      v_branch_id := NULL;
    ELSE
      -- Pendaftar berikutnya wajib melalui persetujuan Administrator
      v_status := 'PENDING';
    END IF;

    v_meta_branch := NEW.raw_user_meta_data->>'branch_id';
    IF v_meta_branch IS NOT NULL AND v_meta_branch ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      IF EXISTS (SELECT 1 FROM public.branches WHERE id = v_meta_branch::UUID) THEN
        v_branch_id := v_meta_branch::UUID;
      END IF;
    END IF;

    -- Jika peran cabang belum memiliki branch_id valid, pasang ke cabang pertama
    IF v_branch_id IS NULL AND v_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN', 'PERBANKAN') THEN
      SELECT id INTO v_branch_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
    END IF;

    INSERT INTO public.users (id, username, email, name, role, branch_id, status)
    VALUES (NEW.id, v_username, NEW.email, v_name, v_role, v_branch_id, v_status)
    ON CONFLICT (id) DO UPDATE SET
      username = COALESCE(public.users.username, EXCLUDED.username),
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = COALESCE(public.users.role, EXCLUDED.role),
      branch_id = COALESCE(public.users.branch_id, EXCLUDED.branch_id),
      status = COALESCE(public.users.status, EXCLUDED.status),
      updated_at = NOW();

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user safe fallback caught error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- ==============================================================================
-- UPDATE #23 - 2026-10-15
-- DESKRIPSI: Role Snapshotting Transaksi & Delegasi Wewenang SPV Merangkap Kasir
-- ==============================================================================

-- 1. Tambah Kolom Snapshot Peran & Kolom SPV Merangkap Kasir
ALTER TABLE public.branch_cash_sessions 
  ADD COLUMN IF NOT EXISTS assigned_by_role VARCHAR(50) DEFAULT 'AUDIT_CABANG',
  ADD COLUMN IF NOT EXISTS bandar_role VARCHAR(50) DEFAULT 'KASIR',
  ADD COLUMN IF NOT EXISTS acting_cashier_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS acting_cashier_role VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.cash_reports
  ADD COLUMN IF NOT EXISTS cashier_role VARCHAR(50) DEFAULT 'KASIR',
  ADD COLUMN IF NOT EXISTS computer_cash_role VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_role VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.cashier_cash_transfers
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT 'KASIR',
  ADD COLUMN IF NOT EXISTS partner_role VARCHAR(50) DEFAULT 'KASIR',
  ADD COLUMN IF NOT EXISTS confirmed_role VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.cashier_operational_adjustments
  ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'AUDIT_CABANG',
  ADD COLUMN IF NOT EXISTS cashier_role VARCHAR(50) DEFAULT 'KASIR';

-- 2. Helper Function: Cek Apakah Pengguna Adalah SPV Merangkap Kasir yang Sah
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

-- 3. Triggers Otomatisasi Snapshot Peran (Immutable History)

-- 3.1 Trigger Snapshot Sesi Kas
CREATE OR REPLACE FUNCTION public.snapshot_session_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_by IS NOT NULL THEN
    SELECT role::TEXT INTO NEW.assigned_by_role FROM public.users WHERE id = NEW.assigned_by;
  END IF;
  IF NEW.bandar_user_id IS NOT NULL THEN
    SELECT role::TEXT INTO NEW.bandar_role FROM public.users WHERE id = NEW.bandar_user_id;
  END IF;
  IF NEW.acting_cashier_user_id IS NOT NULL THEN
    SELECT role::TEXT INTO NEW.acting_cashier_role FROM public.users WHERE id = NEW.acting_cashier_user_id;
  ELSE
    NEW.acting_cashier_role := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_snapshot_session_roles ON public.branch_cash_sessions;
CREATE TRIGGER trg_snapshot_session_roles
  BEFORE INSERT OR UPDATE ON public.branch_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_session_roles();

-- 3.2 Trigger Snapshot Laporan Kas
CREATE OR REPLACE FUNCTION public.snapshot_report_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (NEW.cashier_id IS DISTINCT FROM OLD.cashier_id) OR NEW.cashier_role IS NULL THEN
    SELECT role::TEXT INTO NEW.cashier_role FROM public.users WHERE id = NEW.cashier_id;
  END IF;

  IF NEW.computer_cash_updated_by IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.computer_cash_updated_by IS DISTINCT FROM NEW.computer_cash_updated_by OR NEW.computer_cash_role IS NULL) THEN
    SELECT role::TEXT INTO NEW.computer_cash_role FROM public.users WHERE id = NEW.computer_cash_updated_by;
  END IF;

  IF NEW.verified_by IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.verified_by IS DISTINCT FROM NEW.verified_by OR NEW.verified_role IS NULL) THEN
    SELECT role::TEXT INTO NEW.verified_role FROM public.users WHERE id = NEW.verified_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_snapshot_report_roles ON public.cash_reports;
CREATE TRIGGER trg_snapshot_report_roles
  BEFORE INSERT OR UPDATE ON public.cash_reports
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_report_roles();

-- 3.3 Trigger Snapshot Mutasi Transfer Kas
CREATE OR REPLACE FUNCTION public.snapshot_transfer_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.user_role IS NULL THEN
    SELECT role::TEXT INTO NEW.user_role FROM public.users WHERE id = NEW.user_id;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.partner_role IS NULL THEN
    SELECT role::TEXT INTO NEW.partner_role FROM public.users WHERE id = NEW.partner_user_id;
  END IF;

  IF NEW.confirmed_by IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.confirmed_by IS DISTINCT FROM NEW.confirmed_by OR NEW.confirmed_role IS NULL) THEN
    SELECT role::TEXT INTO NEW.confirmed_role FROM public.users WHERE id = NEW.confirmed_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_snapshot_transfer_roles ON public.cashier_cash_transfers;
CREATE TRIGGER trg_snapshot_transfer_roles
  BEFORE INSERT OR UPDATE ON public.cashier_cash_transfers
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_transfer_roles();

-- 3.4 Trigger Snapshot Penyesuaian Kas Operasional
CREATE OR REPLACE FUNCTION public.snapshot_adjustment_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.created_by_role IS NULL THEN
    SELECT role::TEXT INTO NEW.created_by_role FROM public.users WHERE id = NEW.created_by;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.cashier_role IS NULL THEN
    SELECT role::TEXT INTO NEW.cashier_role FROM public.users WHERE id = NEW.cashier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_snapshot_adjustment_roles ON public.cashier_operational_adjustments;
CREATE TRIGGER trg_snapshot_adjustment_roles
  BEFORE INSERT OR UPDATE ON public.cashier_operational_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_adjustment_roles();

-- 4. Pembaruan Kebijakan RLS (Mendukung SPV yang Ditugaskan sebagai Acting Cashier)

-- 4.1 RLS: cash_reports
DROP POLICY IF EXISTS "cash_reports_insert_policy" ON public.cash_reports;
CREATE POLICY "cash_reports_insert_policy" ON public.cash_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (public.current_user_role() = 'KASIR' OR public.is_acting_cashier(branch_id, business_date, auth.uid()))
      AND branch_id = public.current_user_branch_id()
      AND cashier_id = auth.uid()
      AND status IN ('DRAFT', 'SUBMITTED')
      AND computer_cash_total IS NULL
    )
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
  );

DROP POLICY IF EXISTS "cash_reports_update_policy" ON public.cash_reports;
CREATE POLICY "cash_reports_update_policy" ON public.cash_reports
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      (public.current_user_role() = 'KASIR' OR public.is_acting_cashier(branch_id, business_date, auth.uid()))
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
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      (public.current_user_role() = 'KASIR' OR public.is_acting_cashier(branch_id, business_date, auth.uid()))
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

DROP POLICY IF EXISTS "cash_reports_delete_policy" ON public.cash_reports;
CREATE POLICY "cash_reports_delete_policy" ON public.cash_reports
  FOR DELETE TO authenticated
  USING (
    (
      (public.current_user_role() = 'KASIR' OR public.is_acting_cashier(branch_id, business_date, auth.uid())) 
      AND cashier_id = auth.uid() 
      AND status = 'DRAFT'
    )
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
  );

-- 4.2 RLS: cash_report_denominations
DROP POLICY IF EXISTS "denoms_modify_policy" ON public.cash_report_denominations;
CREATE POLICY "denoms_modify_policy" ON public.cash_report_denominations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cash_reports r
      WHERE r.id = cash_report_denominations.report_id
      AND (
        public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
        OR (
          (public.current_user_role() = 'KASIR' OR public.is_acting_cashier(r.branch_id, r.business_date, auth.uid()))
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
        public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
        OR (
          (public.current_user_role() = 'KASIR' OR public.is_acting_cashier(r.branch_id, r.business_date, auth.uid()))
          AND r.cashier_id = auth.uid()
          AND r.status IN ('DRAFT', 'SUBMITTED', 'REJECTED')
        )
      )
    )
  );

-- 4.3 RLS: non_cash_transactions
DROP POLICY IF EXISTS "non_cash_insert_policy" ON public.non_cash_transactions;
CREATE POLICY "non_cash_insert_policy" ON public.non_cash_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (
        public.current_user_role() = 'KASIR'
        OR EXISTS (
          SELECT 1 FROM public.cash_reports r
          WHERE r.id = non_cash_transactions.report_id
            AND public.is_acting_cashier(r.branch_id, r.business_date, auth.uid())
        )
      )
      AND cashier_id = auth.uid()
    )
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
  );

DROP POLICY IF EXISTS "non_cash_update_policy" ON public.non_cash_transactions;
CREATE POLICY "non_cash_update_policy" ON public.non_cash_transactions
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('PERBANKAN', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      (
        public.current_user_role() = 'KASIR'
        OR EXISTS (
          SELECT 1 FROM public.cash_reports r
          WHERE r.id = non_cash_transactions.report_id
            AND public.is_acting_cashier(r.branch_id, r.business_date, auth.uid())
        )
      )
      AND cashier_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('PERBANKAN', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      (
        public.current_user_role() = 'KASIR'
        OR EXISTS (
          SELECT 1 FROM public.cash_reports r
          WHERE r.id = non_cash_transactions.report_id
            AND public.is_acting_cashier(r.branch_id, r.business_date, auth.uid())
        )
      )
      AND cashier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "non_cash_delete_policy" ON public.non_cash_transactions;
CREATE POLICY "non_cash_delete_policy" ON public.non_cash_transactions
  FOR DELETE TO authenticated
  USING (
    (
      (
        public.current_user_role() = 'KASIR'
        OR EXISTS (
          SELECT 1 FROM public.cash_reports r
          WHERE r.id = non_cash_transactions.report_id
            AND public.is_acting_cashier(r.branch_id, r.business_date, auth.uid())
        )
      )
      AND cashier_id = auth.uid()
    )
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
  );

-- 4.4 RLS: cashier_cash_transfers
DROP POLICY IF EXISTS "cashier_cash_transfers_insert_policy" ON public.cashier_cash_transfers;
CREATE POLICY "cashier_cash_transfers_insert_policy" ON public.cashier_cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
    OR (
      (
        public.current_user_role() IN ('KASIR', 'AUDIT_CABANG')
        OR public.is_acting_cashier(branch_id, business_date, auth.uid())
      )
      AND branch_id = public.current_user_branch_id()
    )
  );

-- 5. Backfill Data Historis yang Sudah Ada
UPDATE public.branch_cash_sessions s
SET 
  assigned_by_role = COALESCE(s.assigned_by_role, (SELECT role::TEXT FROM public.users WHERE id = s.assigned_by), 'AUDIT_CABANG'),
  bandar_role = COALESCE(s.bandar_role, (SELECT role::TEXT FROM public.users WHERE id = s.bandar_user_id), 'KASIR')
WHERE s.assigned_by_role IS NULL OR s.bandar_role IS NULL;

UPDATE public.cash_reports r
SET 
  cashier_role = COALESCE(r.cashier_role, (SELECT role::TEXT FROM public.users WHERE id = r.cashier_id), 'KASIR'),
  computer_cash_role = COALESCE(r.computer_cash_role, (SELECT role::TEXT FROM public.users WHERE id = r.computer_cash_updated_by)),
  verified_role = COALESCE(r.verified_role, (SELECT role::TEXT FROM public.users WHERE id = r.verified_by))
WHERE r.cashier_role IS NULL;

UPDATE public.cashier_cash_transfers t
SET
  user_role = COALESCE(t.user_role, (SELECT role::TEXT FROM public.users WHERE id = t.user_id), 'KASIR'),
  partner_role = COALESCE(t.partner_role, (SELECT role::TEXT FROM public.users WHERE id = t.partner_user_id), 'KASIR'),
  confirmed_role = COALESCE(t.confirmed_role, (SELECT role::TEXT FROM public.users WHERE id = t.confirmed_by))
WHERE t.user_role IS NULL OR t.partner_role IS NULL;

UPDATE public.cashier_operational_adjustments a
SET
  created_by_role = COALESCE(a.created_by_role, (SELECT role::TEXT FROM public.users WHERE id = a.created_by), 'AUDIT_CABANG'),
  cashier_role = COALESCE(a.cashier_role, (SELECT role::TEXT FROM public.users WHERE id = a.cashier_id), 'KASIR')
WHERE a.created_by_role IS NULL OR a.cashier_role IS NULL;

-- ==============================================================================
-- UPDATE #24 - 2026-10-15: RPC Admin Reset User Password & Admin Create User (Batch Import)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. RPC: Reset Password Pengguna oleh Audit Pusat Admin
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_target_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role public.user_role;
  v_target_user public.users%ROWTYPE;
BEGIN
  -- 1. Verifikasi hak akses Super Admin
  v_caller_role := public.current_user_role();
  IF v_caller_role IS DISTINCT FROM 'AUDIT_PUSAT_ADMIN' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Audit Pusat Admin yang berwenang mereset password pengguna.';
  END IF;

  -- 2. Validasi input
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID tidak boleh kosong.';
  END IF;

  IF p_new_password IS NULL OR LENGTH(TRIM(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'Password baru minimal harus terdiri dari 6 karakter.';
  END IF;

  -- 3. Cek user target
  SELECT * INTO v_target_user FROM public.users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna dengan ID tersebut tidak ditemukan.';
  END IF;

  -- 4. Update password di auth.users dengan bcrypt hash
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_target_user_id;

  -- 5. Catat audit log
  INSERT INTO public.audit_logs (
    action,
    entity,
    entity_id,
    user_id,
    details
  ) VALUES (
    'RESET_PASSWORD',
    'users',
    p_target_user_id,
    auth.uid(),
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'target_username', v_target_user.username,
      'target_name', v_target_user.name,
      'reset_by', auth.uid(),
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password untuk pengguna @' || COALESCE(v_target_user.username, v_target_user.name) || ' berhasil direset.'
  );
END;
$$;

-- 2. RPC: Pendaftaran Pengguna Langsung Aktif oleh Admin (Single / Batch Import)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username TEXT,
  p_name TEXT,
  p_role public.user_role,
  p_branch_id UUID,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role public.user_role;
  v_clean_username TEXT;
  v_email TEXT;
  v_new_user_id UUID;
  v_branch_exists BOOLEAN := FALSE;
BEGIN
  -- 1. Verifikasi hak akses Super Admin
  v_caller_role := public.current_user_role();
  IF v_caller_role IS DISTINCT FROM 'AUDIT_PUSAT_ADMIN' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Audit Pusat Admin yang berwenang mendaftarkan akun secara langsung.';
  END IF;

  -- 2. Bersihkan dan validasi username
  v_clean_username := LOWER(TRIM(p_username));
  v_clean_username := REGEXP_REPLACE(v_clean_username, '[^a-z0-9_.]', '', 'g');

  IF LENGTH(v_clean_username) < 3 THEN
    RAISE EXCEPTION 'Username minimal 3 karakter alfanumerik.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE LOWER(username) = v_clean_username) THEN
    RAISE EXCEPTION 'Username "%" sudah digunakan akun lain.', v_clean_username;
  END IF;

  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RAISE EXCEPTION 'Nama lengkap tidak boleh kosong.';
  END IF;

  IF p_password IS NULL OR LENGTH(TRIM(p_password)) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter.';
  END IF;

  -- Validasi cabang untuk role cabang
  IF p_role IN ('KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG') THEN
    IF p_branch_id IS NULL THEN
      RAISE EXCEPTION 'Peran cabang wajib memilih Cabang Penempatan.';
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.branches WHERE id = p_branch_id) INTO v_branch_exists;
    IF NOT v_branch_exists THEN
      RAISE EXCEPTION 'Cabang dengan ID tersebut tidak valid.';
    END IF;
  ELSE
    p_branch_id := NULL;
  END IF;

  v_new_user_id := extensions.gen_random_uuid();
  v_email := v_clean_username || '@branchcash.internal';

  -- 3. Insert ke auth.users (langsung terkonfirmasi)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_new_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'name', TRIM(p_name),
      'username', v_clean_username,
      'role', p_role,
      'branch_id', p_branch_id,
      'status', 'ACTIVE'
    ),
    NOW(),
    NOW(),
    encode(extensions.gen_random_bytes(32), 'hex')
  );

  -- 4. Pastikan data profil di public.users berstatus ACTIVE
  INSERT INTO public.users (
    id,
    username,
    name,
    email,
    role,
    branch_id,
    status
  ) VALUES (
    v_new_user_id,
    v_clean_username,
    TRIM(p_name),
    v_email,
    p_role,
    p_branch_id,
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id,
    status = 'ACTIVE',
    updated_at = NOW();

  -- 5. Audit Log
  INSERT INTO public.audit_logs (
    action,
    entity,
    entity_id,
    user_id,
    details
  ) VALUES (
    'CREATE_USER_ADMIN',
    'users',
    v_new_user_id,
    auth.uid(),
    jsonb_build_object(
      'user_id', v_new_user_id,
      'username', v_clean_username,
      'name', TRIM(p_name),
      'role', p_role,
      'branch_id', p_branch_id,
      'created_by', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'username', v_clean_username,
    'name', TRIM(p_name),
    'role', p_role,
    'branch_id', p_branch_id,
    'status', 'ACTIVE'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, public.user_role, UUID, TEXT) TO authenticated;
