-- ==============================================================================
-- 🚀 BRANCHCASH DATABASE SETUP - PART 4/5: TRIGGERS & FUNCTIONS
-- PRD Version: 1.1 Enterprise Cash Management
-- PostgreSQL 15+ / Supabase Cloud
-- ==============================================================================

-- ==============================================================================
-- 1. AUTH & USER PROFILE INTEGRITY TRIGGERS
-- ==============================================================================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Proteksi Integritas Username & Kolom Profil Pengguna (Anti-Fraud)
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

DROP TRIGGER IF EXISTS trg_protect_user_tampering ON public.users;
CREATE TRIGGER trg_protect_user_tampering
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields_tampering();

-- ==============================================================================
-- 2. MASTER DATA PROTECTION TRIGGERS (SOFT DELETE ONLY)
-- ==============================================================================

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
-- 3. CALCULATION & AUTO-SYNC TRIGGERS
-- ==============================================================================

-- Trigger: Rekalkulasi otomatis total fisik uang saat denominasi atau non-tunai diinput
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

DROP TRIGGER IF EXISTS trigger_recalc_denoms ON public.cash_report_denominations;
CREATE TRIGGER trigger_recalc_denoms
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_report_denominations
  FOR EACH ROW EXECUTE FUNCTION public.recalc_report_totals();

DROP TRIGGER IF EXISTS trigger_recalc_non_cash ON public.non_cash_transactions;
CREATE TRIGGER trigger_recalc_non_cash
  AFTER INSERT OR UPDATE OR DELETE ON public.non_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.recalc_report_totals();

-- Trigger: Rekalkulasi Otomatis ke cash_reports saat operational adjustment dibuat/diubah
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

-- Trigger: Sinkronisasi report_id & saldo adjustment saat cash_report dibuat
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

-- Trigger: Penautan otomatis cash_session_id saat sesi kas harian dibuka
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

-- Trigger: Penautan otomatis cash_session_id saat cash_report dibuat
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
-- 4. BUSINESS INTEGRITY & IMMUTABILITY TRIGGERS
-- ==============================================================================

-- Trigger: Cegah Pengubahan Kasir Bandar Jika Sesi Tersebut Sudah Memiliki Transaksi Transfer Modal/Setor
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

DROP TRIGGER IF EXISTS trg_check_session_bandar ON public.branch_cash_sessions;
CREATE TRIGGER trg_check_session_bandar
  BEFORE UPDATE ON public.branch_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_session_bandar_immutable();

-- Trigger: Kunci Mutasi Kas yang Sudah Berstatus CONFIRMED (Permanen & Immutable)
CREATE OR REPLACE FUNCTION public.protect_confirmed_cash_transfer()
RETURNS TRIGGER AS $$
BEGIN
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

-- Trigger: Enforce Auto-Lock pada Laporan APPROVED & Validasi Wewenang
CREATE OR REPLACE FUNCTION public.enforce_approved_report_lock()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := public.current_user_role();

  -- Jika laporan sudah APPROVED, tolak update apa pun kecuali oleh AUDIT_PUSAT (Force Edit)
  IF OLD.status = 'APPROVED' THEN
    IF v_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
      RAISE EXCEPTION 'Akses Ditolak: Laporan kas sudah berstatus APPROVED dan OTOMATIS TERKUNCI. Hanya Audit Pusat yang berwenang melakukan koreksi melalui Force Edit.';
    END IF;
  END IF;

  -- Validasi Approval/Rejection: Hanya Audit Pusat & Super Admin
  IF NEW.status IN ('APPROVED', 'REJECTED') AND OLD.status != NEW.status THEN
    IF v_role NOT IN ('AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
      RAISE EXCEPTION 'Akses Ditolak: Verifikasi final (Approve / Reject) laporan hanya dapat dilakukan oleh Audit Pusat.';
    END IF;
    NEW.verified_at := NOW();
    NEW.verified_by := auth.uid();
  END IF;

  -- Validasi Input Computer Cash: Kasir Dilarang
  IF (NEW.computer_cash_total IS DISTINCT FROM OLD.computer_cash_total) THEN
    IF v_role NOT IN ('AUDIT_CABANG', 'AUDIT_PUSAT', 'AUDIT_PUSAT_ADMIN') THEN
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

-- ==============================================================================
-- 6. ROLE SNAPSHOTTING TRIGGERS (IMMUTABLE HISTORICAL ROLES)
-- ==============================================================================

-- Trigger: Snapshot Peran Sesi Kas Cabang
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

-- Trigger: Snapshot Peran Laporan Kas
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

-- Trigger: Snapshot Peran Mutasi Kas Antar-Kasir
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

-- Trigger: Snapshot Peran Penyesuaian Kas Operasional
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

-- ==============================================================================
-- FUNGSI ADMIN: Reset Password & Pendaftaran Langsung Pengguna (Super Admin)
-- ==============================================================================

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
  v_caller_role := public.current_user_role();
  IF v_caller_role IS DISTINCT FROM 'AUDIT_PUSAT_ADMIN' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Audit Pusat Admin yang berwenang mereset password pengguna.';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID tidak boleh kosong.';
  END IF;

  IF p_new_password IS NULL OR LENGTH(TRIM(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'Password baru minimal harus terdiri dari 6 karakter.';
  END IF;

  SELECT * INTO v_target_user FROM public.users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna dengan ID tersebut tidak ditemukan.';
  END IF;

  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_target_user_id;

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
  v_caller_role := public.current_user_role();
  IF v_caller_role IS DISTINCT FROM 'AUDIT_PUSAT_ADMIN' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Audit Pusat Admin yang berwenang mendaftarkan akun secara langsung.';
  END IF;

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


