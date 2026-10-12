-- ==============================================================================
-- 🚀 BRANCHCASH DATABASE SETUP - PART 5/5: MASTER SEED DATA
-- PRD Version: 1.1 Enterprise Cash Management
-- PostgreSQL 15+ / Supabase Cloud
-- ==============================================================================

-- 1. Seed Cabang Resmi
INSERT INTO public.branches (id, code, name, city, address, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'CBG-01', 'Cabang Utama Jakarta', 'Jakarta Pusat', 'Jl. Jenderal Sudirman No. 45, Jakarta Pusat', 'ACTIVE'),
  ('a0000000-0000-0000-0000-000000000002', 'CBG-02', 'Cabang Surabaya Gubeng', 'Surabaya', 'Jl. Raya Gubeng No. 12, Surabaya', 'ACTIVE'),
  ('a0000000-0000-0000-0000-000000000003', 'CBG-03', 'Cabang Bandung Dago', 'Bandung', 'Jl. Ir. H. Juanda No. 88, Bandung', 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  status = 'ACTIVE';

-- 2. Seed Master Denominasi Rupiah (Refactored PRD: Kertas, Koin Gabungan, MIX)
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

-- 3. Seed Bank Mitra (Hanya kolom nama unik)
INSERT INTO public.banks (id, name, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Bank Central Asia (BCA)', TRUE),
  ('b0000000-0000-0000-0000-000000000002', 'Bank Mandiri',            TRUE),
  ('b0000000-0000-0000-0000-000000000003', 'Bank Rakyat Indonesia',    TRUE),
  ('b0000000-0000-0000-0000-000000000004', 'Bank Negara Indonesia',    TRUE),
  ('b0000000-0000-0000-0000-000000000005', 'CIMB Niaga',               TRUE),
  ('b0000000-0000-0000-0000-000000000006', 'Bank Permata',             TRUE)
ON CONFLICT (name) DO UPDATE SET 
  is_active = TRUE;

-- 4. Seed Metode Pembayaran (Hanya kolom nama unik)
INSERT INTO public.payment_methods (id, name, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'QRIS',          TRUE),
  ('c0000000-0000-0000-0000-000000000002', 'Kartu Debit',   TRUE),
  ('c0000000-0000-0000-0000-000000000003', 'Kartu Kredit',  TRUE),
  ('c0000000-0000-0000-0000-000000000004', 'Bank Transfer', TRUE),
  ('c0000000-0000-0000-0000-000000000005', 'Mesin EDC',     TRUE)
ON CONFLICT (name) DO UPDATE SET 
  is_active = TRUE;
