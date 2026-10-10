# BranchCash

Sistem pelaporan, monitoring kas fisik, mutasi kas silang, dan rekonsiliasi non-tunai perbankan multi-cabang terintegrasi berbasis role-based access control (RBAC).

---

## 1. Teknologi Utama

- **Frontend**: React 18, TypeScript (Strict), Vite, Tailwind CSS, Lucide Icons
- **Backend & Database**: Supabase Cloud (PostgreSQL, Row Level Security, Supabase Auth, Realtime Postgres Changes)
- **Arsitektur**: Modular Feature-Driven Design (maksimal 200–300 baris per file modul)

---

## 2. Matriks Peran & Wewenang (PRD v1.1)

| Peran (Role) | Lokasi | Hak Akses Utama | Batasan & Larangan |
|---|---|---|---|
| **`KASIR`** | Cabang | Input kas fisik (kertas & koin + breakdown multiplier), input transaksi non-tunai bank, mutasi kas modal/setoran silang, ajukan draft laporan closing | Dilarang input Computer Cash. Dilarang melihat data cabang lain. |
| **`SPV`** | Cabang | Review & supervisi closing kasir cabang | Dilarang mengubah status laporan ke `APPROVED`. |
| **`KEPALA_CABANG`** | Cabang | Verifikasi laporan cabang sebelum diteruskan ke pusat | Dilarang mengubah status laporan ke `APPROVED`. |
| **`AUDIT_CABANG`** | Cabang | Penunjukan Kasir Bandar harian, input independen 2 nilai Computer Cash (Tunai & Non-Tunai POS), monitoring varians fisik vs POS | Dilarang approval final / reject laporan kasir. |
| **`PERBANKAN`** | Kantor Pusat | Monitoring mutasi rekening koran dan rekonsiliasi status transaksi non-tunai (`MATCHED` / `UNMATCHED`) | Dilarang input kas fisik cabang. |
| **`AUDIT_PUSAT`** | Kantor Pusat | Super Admin: Approval final (`APPROVED`), penolakan (`REJECTED`), Force Edit audit, pengelolaan Master Data (Cabang, Bank, Denominasi, Metode Pembayaran) | Wajib menyertakan alasan formal pada setiap tindakan audit. |

---

## 3. Fitur Utama

- **Dual Kasir (Kasir Bandar & Kasir Harian)**: Pembagian peran operasional kasir harian dan pemegang brankas modal harian cabang.
- **Double-Entry Mutasi Kas Silang**: Penyerahan modal dan setoran kas antar-kasir tercatat dua arah dengan sistem konfirmasi / penolakan penerimaan fisik.
- **Perhitungan Fisik vs POS Mandiri**: Audit Cabang menginput Computer Cash terpisah untuk tunai dan non-tunai sehingga selisih/varians terdeteksi akurat secara otomatis.
- **Rekonsiliasi Bank Kantor Pusat**: Departemen Perbankan mencocokkan transaksi EDC/QRIS cabang dengan mutasi rekening bank secara terpusat.
- **Manajemen Master Data Soft-Delete**: Audit Pusat dapat menambah dan mengaktifkan/menonaktifkan (`is_active`) data cabang, bank, metode pembayaran, dan denominasi tanpa merusak integritas data historis.
- **Realtime Database Synchronization**: Sinkronisasi instan antar-perangkat dan antar-kasir menggunakan Supabase Realtime Channels.

---

## 4. Struktur Proyek

```
src/
├── components/
│   ├── audit-cabang/       # Antarmuka Audit Cabang (Sesi kas, POS, varians)
│   ├── audit-pusat/        # Antarmuka Audit Pusat (Approval, Force Edit, Master)
│   ├── auth/               # Halaman login, register, & seleksi cabang
│   ├── branch/             # Antarmuka review SPV & Kepala Cabang
│   ├── cashier/            # Antarmuka input kas fisik kasir & mutasi silang
│   ├── common/             # Header, sidebar navigasi, modal, badge status
│   └── perbankan/          # Antarmuka rekonsiliasi non-tunai perbankan pusat
├── constants/              # Konfigurasi fallback master data
├── context/                # AppContext & hooks modular per domain fitur
│   └── hooks/              # useAuthState, useMasterDataState, useReportState, dll.
├── services/               # Layanan API Supabase modular
│   └── supabase/           # Sub-service auth, report, non-cash, session, dll.
├── types/                  # Definisi TypeScript interface & enum PRD
└── utils/                  # Helper format mata uang, tanggal, & generator
supabase/
├── 01_all_in_one_master.sql # Setup master database lengkap (eksekusi dari nol)
└── 02_latest_migration.sql  # Log migrasi delta berurutan
```

---

## 5. Panduan Instalasi & Menjalankan

### Prasyarat
- Node.js (versi 18+)
- Proyek database Supabase aktif

### Langkah Menjalankan
1. Clone repositori:
   ```bash
   git clone <url-repositori>
   cd branchcash
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi Environment:
   Salin `.env.example` menjadi `.env` dan masukkan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

4. Setup Database di Supabase SQL Editor:
   - Jalankan seluruh isi skrip [supabase/01_all_in_one_master.sql](supabase/01_all_in_one_master.sql) di Supabase SQL Editor untuk inisialisasi tabel, triggers, enum, RLS policies, dan master data.

5. Jalankan Development Server:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:3001`.

6. Validasi Build Produksi:
   ```bash
   npm run build
   ```
