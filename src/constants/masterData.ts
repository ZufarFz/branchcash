import { DenomConfig, BankOption, PaymentMethodOption } from '../types';

/**
 * Master Konfigurasi Standar BranchCash (PRD Bab 5 & 7)
 * Standar pecahan mata uang Rupiah (Bank Indonesia) dan metode transaksi perbankan.
 * Data transaksi, cabang, dan pengguna diatur secara dinamis melalui Supabase Cloud.
 */

// Master Denominasi Pecahan Uang Rupiah Resmi (PRD Bab 5 & 7 - Refactored: Koin disatukan, Tambah MIX)
export const MASTER_DENOMS: DenomConfig[] = [
  { id: 'denom-100k', code: '100000', nominal: 100000, label: 'Rp 100.000', type: 'KERTAS', sortOrder: 1 },
  { id: 'denom-50k', code: '50000', nominal: 50000, label: 'Rp 50.000', type: 'KERTAS', sortOrder: 2 },
  { id: 'denom-20k', code: '20000', nominal: 20000, label: 'Rp 20.000', type: 'KERTAS', sortOrder: 3 },
  { id: 'denom-10k', code: '10000', nominal: 10000, label: 'Rp 10.000', type: 'KERTAS', sortOrder: 4 },
  { id: 'denom-5k', code: '5000', nominal: 5000, label: 'Rp 5.000', type: 'KERTAS', sortOrder: 5 },
  { id: 'denom-2k', code: '2000', nominal: 2000, label: 'Rp 2.000', type: 'KERTAS', sortOrder: 6 },
  { id: 'denom-1k', code: '1000', nominal: 1000, label: 'Rp 1.000', type: 'KERTAS', sortOrder: 7 },
  { id: 'denom-koin', code: 'KOIN', nominal: null, label: 'Koin (Semua Koin)', type: 'KOIN', sortOrder: 8 },
  { id: 'denom-mix', code: 'MIX', nominal: null, label: 'MIX (Uang Campur)', type: 'MIX', sortOrder: 9 },
];

// Master Bank Mitra (PRD Bab 5)
export const MASTER_BANKS: BankOption[] = [
  { id: 'bca', code: 'BCA', name: 'Bank Central Asia', color: '#005baa' },
  { id: 'mandiri', code: 'Mandiri', name: 'Bank Mandiri', color: '#003399' },
  { id: 'bri', code: 'BRI', name: 'Bank Rakyat Indonesia', color: '#00529c' },
  { id: 'bni', code: 'BNI', name: 'Bank Negara Indonesia', color: '#e05a1e' },
  { id: 'cimb', code: 'CIMB', name: 'CIMB Niaga', color: '#7a001a' },
  { id: 'permata', code: 'Permata', name: 'Bank Permata', color: '#009a44' },
];

// Master Metode Pembayaran Non-Tunai (PRD Bab 5)
export const MASTER_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'qris', code: 'QRIS', name: 'QRIS' },
  { id: 'debit', code: 'Debit', name: 'Kartu Debit' },
  { id: 'credit', code: 'Credit', name: 'Kartu Kredit' },
  { id: 'transfer', code: 'Transfer', name: 'Bank Transfer' },
  { id: 'edc', code: 'EDC', name: 'Mesin EDC' },
];


