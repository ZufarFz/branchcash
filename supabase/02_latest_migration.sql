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




