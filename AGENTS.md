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
| **`AUDIT_PUSAT`** | Kantor Pusat | Super Admin: Approval final (`APPROVED`), Reject (`REJECTED`), Force Edit | Semua tindakan wajib tercatat di Audit Log. |

---

## 4. Manajemen Database SQL (`supabase/`)

Hanya ada **2 file resmi** di folder `supabase/`:

### A. `supabase/01_all_in_one_master.sql` (Master Setup)
- Skrip 1x eksekusi untuk setup database baru dari nol.
- Berisi: UUID extension, Enum, Tabel Master (`branches`, `users`, `master_denoms`, `banks`, `payment_methods`), Tabel Transaksi (`cash_reports`, `cash_report_denominations` dengan kolom JSONB `breakdown`, `non_cash_transactions`, `audit_logs`), Triggers, RLS Policies, dan Seed Data resmi.

### B. `supabase/02_latest_migration.sql` (Update Terakhir / Delta Log)
- HANYA berisi delta/perubahan skema terbaru secara berurutan.
- Format per blok: Diberi header Tanggal dan Nomor Update (`UPDATE #[nomor] - [YYYY-MM-DD]`).
- Setiap update baru wajib ditambahkan di **paling bawah**, sehingga developer cukup copy-paste blok update terakhir ke Supabase SQL Editor.

### Protokol Perubahan Skema
1. Tambahkan blok perubahan baru di **paling bawah** `supabase/02_latest_migration.sql` lengkap dengan header tanggal dan nomor update.
2. Sinkronkan perubahan skema ke `supabase/01_all_in_one_master.sql` agar setup master baru selalu up-to-date.
3. Primary key denominasi wajib `UUID`. Nominal uang wajib `BIGINT`.

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
     1. `supabase/01_all_in_one_master.sql` (Master SQL Setup)
     2. `supabase/02_latest_migration.sql` (Migration Delta Log)
     3. File dokumentasi Markdown (`.md` seperti `README.md`, `AGENTS.md`) untuk keperluan kelengkapan dokumentasi.
     Selain file di atas, **TIDAK ADA PENGECUALIAN APAPUN** (seluruh file kode `.ts`, `.tsx`, `.css`, dll. wajib <= 300 baris).
2. **Struktur Folder Fitur**: Subkomponen, modal, tabel, metrik, hooks, dan helper harus diorganisasi rapi ke dalam folder fitur masing-masing (misal: `src/components/audit-cabang/components/`, `src/components/cashier/modals/`, `src/context/hooks/`).
3. **Format Wajib Tabel Laporan Perubahan File**: Setiap respon setelah mengedit atau menambah file, AI WAJIB menyertakan tabel laporan akhir dengan format 4 kolom persis seperti berikut:

| Path File | Keterangan Perubahan | Line Count | Status |
|---|---|---|---|
| `[path/file.tsx](file:///...)` | Keterangan ringkas perubahan/fungsi | [angka] | Sesuai Aturan (<= 300) |


