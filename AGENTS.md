# AGENTS.md - Panduan Teknis & Instruksi Agen BranchCash

Dokumen aturan baku untuk AI Agent dan developer. Wajib dipatuhi tanpa pengecualian.

---

## 1. Aturan Mutlak: Dilarang Yapping (Zero Yapping Policy)
- **Komunikasi & Respon**: Dilarang bertele-tele, basa-basi, atau memberi penjelasan panjang tak perlu. Langsung ke solusi dan to-the-point.
- **Frontend & UI**: Gunakan teks ringkas, label tegas, dan microcopy profesional. Hindari penjelasan panjang di kartu, modal, atau form.
- **Dokumentasi**: Penulisan di `README.md`, `AGENTS.md`, maupun file markdown lain harus padat informasi, tanpa kata pengantar berlebihan atau filler text.

---

## 2. Dev Server: Selalu Jalankan `npm run dev`
- **Wajib Verifikasi**: Setiap kali memulai sesi kerja atau melakukan perubahan, periksa apakah dev server Vite aktif (port 3001).
- **Auto-Start**: Jika belum aktif, segera jalankan `npm run dev` sebagai background/daemon process.

---

## 3. Matriks Peran & RBAC (PRD v1.1)

| Role PRD | Lokasi | Hak Akses Utama | Larangan Mutlak |
|---|---|---|---|
| **`KASIR`** | Cabang | Input kas fisik (kertas & koin), input non-tunai (EDC/QRIS), submit draft | Dilarang input Computer Cash. Dilarang melihat cabang lain. |
| **`SPV`** | Cabang | Review & supervisi closing kasir cabang | Dilarang mengubah status laporan ke `APPROVED`. |
| **`KEPALA_CABANG`** | Cabang | Verifikasi laporan cabang sebelum diajukan ke pusat | Dilarang mengubah status laporan ke `APPROVED`. |
| **`AUDIT_CABANG`** | Cabang | Input nominal *Computer Cash* (POS) harian secara independen | Dilarang approval/reject laporan. |
| **`PERBANKAN`** | Kantor Pusat | Rekonsiliasi non-tunai bank (`MATCHED` / `UNMATCHED`) | Dilarang input kas fisik cabang. |
| **`AUDIT_PUSAT`** | Kantor Pusat | Review berkas cabang, Approval final (`APPROVED`), Reject (`REJECTED`), Force Edit | Dilarang mengelola Master Data & Persetujuan Akun. |
| **`AUDIT_PUSAT_ADMIN`** | Kantor Pusat | **Super Admin**: Semua wewenang Audit Pusat + Pengelolaan Master Data (Cabang, Bank, Denom, Metode) + Persetujuan Akun Pengguna | Semua tindakan wajib tercatat di Audit Log. |

---

## 4. Manajemen Database SQL (`supabase/`)

Struktur resmi file SQL termodularisasi di folder `supabase/` (dieksekusi berurutan 01 s/d 05 untuk inisialisasi dari nol):

1. **`supabase/01_extensions_and_enums.sql`**: Ekstensi (`uuid-ossp`), Enum (`user_role`, `report_status`, `match_status`), dan fungsi auth helper dasar (`current_user_role()`, `current_user_branch_id()`).
2. **`supabase/02_master_tables_and_rls.sql`**: Tabel Master (`branches`, `users`, `master_denoms`, `banks`, `payment_methods`) beserta indeks dan RLS policies masing-masing.
3. **`supabase/03_transaction_tables_and_rls.sql`**: Tabel Transaksi (`branch_cash_sessions`, `cash_reports`, `cash_report_denominations`, `non_cash_transactions`, `cashier_cash_transfers`, `cashier_operational_adjustments`, `audit_logs`) beserta indeks dan RLS policies masing-masing.
4. **`supabase/04_triggers_and_functions.sql`**: Seluruh stored procedure, trigger kalkulasi otomatis, validasi wewenang/immutability, auto-link sesi kas, dan trigger audit log.
5. **`supabase/05_seed_data.sql`**: Master data awal (cabang resmi, pecahan uang rupiah, bank mitra, dan metode pembayaran).
6. **`supabase/06_latest_migration.sql`**: Delta log migrasi kumulatif untuk database yang sudah berjalan (berisi blok `UPDATE #[nomor] - [YYYY-MM-DD]` berurutan di paling bawah).

### Protokol Perubahan Skema
1. Tambahkan blok perubahan baru di **paling bawah** `supabase/06_latest_migration.sql` lengkap dengan header tanggal dan nomor update.
2. Sinkronkan perubahan skema langsung ke modul terkait (`01` s/d `05`) agar inisialisasi dari nol selalu up-to-date tanpa ada duplikasi file master.
3. Primary key denominasi wajib `UUID`. Nominal uang wajib `BIGINT`/`NUMERIC(15,2)`.

---

## 5. Standar Coding & Quality Control
1. **Patuhi RBAC**: Jangan langgar batas hierarki wewenang peran PRD v1.1.
2. **Tidak Ada Halaman Setup Guide di UI**: Seluruh instruksi SQL tersentralisasi di folder `supabase/` dan file ini.
3. **Keamanan RLS**: Akses data wajib melalui konteks auth pengguna. Dilarang bypass RLS di browser client.
4. **Ketertiban RLS (Prinsip Minimalis)**: Dilarang mengubah atau melonggarkan kebijakan RLS tanpa instruksi eksplisit dari user. Jika diminta mengubah RLS untuk entitas tertentu (misal: cabang), HANYA ubah entitas tersebut. DILARANG KERAS mengubah/melonggarkan RLS tabel atau entitas lain yang tidak diminta!
5. **TypeScript Strict**: Kode harus selalu lulus validasi `npm run build` / `tsc --noEmit`.

---

## 6. Standar Modularitas & Pelaporan File
1. **Batas Ukuran File Maksimal 300 Baris (Mutlak)**:
   - SEMUA file kode di dalam workspace WAJIB ringkas dan modular dengan target **200–300 baris** (maksimal 300 baris).
   - Jika suatu file kode melebihi 300 baris, **WAJIB dipecah (split)** menjadi beberapa sub-file terpisah ke dalam sub-folder fitur masing-masing.
   - **Pengecualian Mutlak**: HANYA file-file berikut yang diizinkan melebihi batas baris:
     1. Seluruh file SQL modular di folder `supabase/` (`01` s/d `06`) untuk keutuhan DDL skema database.
     2. File dokumentasi Markdown (`.md` seperti `README.md`, `AGENTS.md`) untuk keperluan kelengkapan dokumentasi.
     Selain file di atas, **TIDAK ADA PENGECUALIAN APAPUN** (seluruh file kode `.ts`, `.tsx`, `.css`, dll. wajib <= 300 baris).
2. **Struktur Folder Fitur**: Subkomponen, modal, tabel, metrik, hooks, dan helper harus diorganisasi rapi ke dalam folder fitur masing-masing (misal: `src/components/audit-cabang/components/`, `src/components/cashier/modals/`, `src/context/hooks/`).
3. **Format Wajib Tabel Laporan Perubahan File**: Setiap respon setelah mengedit atau menambah file, AI WAJIB menyertakan tabel laporan akhir dengan format 4 kolom persis seperti berikut:

| Path File | Keterangan Perubahan | Line Count | Status |
|---|---|---|---|
| `[path/file.tsx](file:///...)` | Keterangan ringkas perubahan/fungsi | [angka] | Sesuai Aturan (<= 300) |


