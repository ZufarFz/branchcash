-- ==============================================================================
-- 🚀 BRANCHCASH DATABASE SETUP - PART 3/5: TRANSACTION TABLES & RLS
-- PRD Version: 1.1 Enterprise Cash Management
-- PostgreSQL 15+ / Supabase Cloud
-- ==============================================================================

-- ==============================================================================
-- 1. OPERATIONAL & TRANSACTION TABLES
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
  computer_beginning_cash NUMERIC(15, 2) DEFAULT 0,
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
  
  -- Kas Fisik Kasir (Khusus Uang Tunai Kertas & Koin)
  total_physical NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_non_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Computer Cash / POS (Diinput khusus oleh Audit Cabang)
  computer_cash_tunai NUMERIC(15, 2) DEFAULT NULL,
  computer_cash_non_tunai NUMERIC(15, 2) DEFAULT NULL,
  computer_cash_total NUMERIC(15, 2) DEFAULT NULL,
  computer_cash_updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  computer_cash_updated_at TIMESTAMPTZ DEFAULT NULL,

  -- Penyesuaian Operasional Kasir Non-POS (Diinput khusus oleh Audit Cabang)
  total_expense_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_income_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Verifikasi Final / Keputusan Audit (APPROVED / REJECTED)
  verified_at TIMESTAMPTZ DEFAULT NULL,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT NULL,

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

-- Tabel Penyesuaian Operasional Kasir Non-POS (cashier_operational_adjustments)
CREATE TABLE IF NOT EXISTS public.cashier_operational_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.cash_reports(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  business_date DATE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  notes TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Audit Trail & Log (audit_logs)
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

-- ==============================================================================
-- 2. INDEKS PERFORMA TRANSAKSI
-- ==============================================================================

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
CREATE INDEX IF NOT EXISTS idx_cashier_adj_report ON public.cashier_operational_adjustments(report_id);
CREATE INDEX IF NOT EXISTS idx_cashier_adj_branch_date ON public.cashier_operational_adjustments(branch_id, business_date);
CREATE INDEX IF NOT EXISTS idx_cashier_adj_cashier ON public.cashier_operational_adjustments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_report ON public.audit_logs(report_id);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES TRANSAKSI
-- ==============================================================================

ALTER TABLE public.cash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_cash_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_report_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_operational_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3.1 Policies: cash_reports (Isolasi Kasir & Hierarki Approval)
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

DROP POLICY IF EXISTS "cash_reports_insert_policy" ON public.cash_reports;
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
    OR public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN')
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

-- 3.2 Policies: cash_report_denominations
DROP POLICY IF EXISTS "denoms_select_policy" ON public.cash_report_denominations;
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

DROP POLICY IF EXISTS "denoms_modify_policy" ON public.cash_report_denominations;
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

-- 3.3 Policies: non_cash_transactions
DROP POLICY IF EXISTS "non_cash_select_policy" ON public.non_cash_transactions;
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

DROP POLICY IF EXISTS "non_cash_insert_policy" ON public.non_cash_transactions;
CREATE POLICY "non_cash_insert_policy" ON public.non_cash_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR public.current_user_role() = 'AUDIT_PUSAT'
  );

DROP POLICY IF EXISTS "non_cash_update_policy" ON public.non_cash_transactions;
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

DROP POLICY IF EXISTS "non_cash_delete_policy" ON public.non_cash_transactions;
CREATE POLICY "non_cash_delete_policy" ON public.non_cash_transactions
  FOR DELETE TO authenticated
  USING (
    (
      public.current_user_role() = 'KASIR'
      AND cashier_id = auth.uid()
    )
    OR public.current_user_role() = 'AUDIT_PUSAT'
  );

-- 3.4 Policies: branch_cash_sessions
DROP POLICY IF EXISTS "branch_cash_sessions_select_policy" ON public.branch_cash_sessions;
CREATE POLICY "branch_cash_sessions_select_policy" ON public.branch_cash_sessions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'PERBANKAN')
    OR branch_id = public.current_user_branch_id()
  );

DROP POLICY IF EXISTS "branch_cash_sessions_insert_policy" ON public.branch_cash_sessions;
CREATE POLICY "branch_cash_sessions_insert_policy" ON public.branch_cash_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() = 'AUDIT_CABANG'
      AND branch_id = public.current_user_branch_id()
    )
  );

DROP POLICY IF EXISTS "branch_cash_sessions_update_policy" ON public.branch_cash_sessions;
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

DROP POLICY IF EXISTS "branch_cash_sessions_delete_policy" ON public.branch_cash_sessions;
CREATE POLICY "branch_cash_sessions_delete_policy" ON public.branch_cash_sessions
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT');

-- 3.5 Policies: cashier_cash_transfers
DROP POLICY IF EXISTS "cashier_cash_transfers_select_policy" ON public.cashier_cash_transfers;
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

DROP POLICY IF EXISTS "cashier_cash_transfers_insert_policy" ON public.cashier_cash_transfers;
CREATE POLICY "cashier_cash_transfers_insert_policy" ON public.cashier_cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'AUDIT_PUSAT'
    OR (
      public.current_user_role() IN ('KASIR', 'AUDIT_CABANG')
      AND branch_id = public.current_user_branch_id()
    )
  );

DROP POLICY IF EXISTS "cashier_cash_transfers_update_policy" ON public.cashier_cash_transfers;
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

DROP POLICY IF EXISTS "cashier_cash_transfers_delete_policy" ON public.cashier_cash_transfers;
CREATE POLICY "cashier_cash_transfers_delete_policy" ON public.cashier_cash_transfers
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'AUDIT_PUSAT');

-- 3.6 Policies: cashier_operational_adjustments
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

-- 3.7 Policies: audit_logs
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('AUDIT_PUSAT', 'AUDIT_CABANG', 'SPV', 'KEPALA_CABANG')
  );

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
