import { CashReport, NonCashTransaction } from '../types';
import { formatCurrency, formatDate } from './formatters';

/**
 * Exports a list of Cash Reports to CSV format.
 */
export function exportReportsToCSV(reports: CashReport[], filename = 'BranchCash-Laporan.csv') {
  const headers = [
    'No. Laporan',
    'Tanggal Bisnis',
    'Kode Cabang',
    'Nama Cabang',
    'Kasir',
    'Status',
    'Total Uang Tunai (Fisik)',
    'Total Non-Tunai',
    'Total Fisik (Tunai + Non-Tunai)',
    'Computer Cash (POS)',
    'Selisih / Variance',
    'Input Computer Cash Oleh',
    'Verifikasi Oleh',
  ];

  const rows = reports.map((r) => [
    `"${r.reportNumber}"`,
    `"${r.businessDate}"`,
    `"${r.branchCode}"`,
    `"${r.branchName}"`,
    `"${r.cashierName}"`,
    `"${r.status}"`,
    r.totalCash,
    r.totalNonCash,
    r.totalPhysical,
    r.computerCashTotal ?? 'N/A',
    r.variance ?? 'N/A',
    `"${r.computerCashEnteredBy || '-'}"`,
    `"${r.verifiedBy || '-'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports Non-Cash transactions to CSV (focused for Perbankan).
 */
export function exportNonCashToCSV(transactions: NonCashTransaction[], reports: CashReport[], filename = 'BranchCash-NonTunai.csv') {
  const headers = [
    'ID Transaksi',
    'No. Laporan',
    'Cabang',
    'Tanggal Bisnis',
    'Kasir',
    'Bank / Mesin EDC',
    'Metode Pembayaran',
    'Nominal (Rp)',
  ];

  const reportMap = new Map(reports.map((r) => [r.id, r]));

  const rows = transactions.map((t) => {
    const report = reportMap.get(t.reportId);
    return [
      `"${t.id}"`,
      `"${report?.reportNumber || '-'}"`,
      `"${report?.branchName || '-'}"`,
      `"${report?.businessDate || '-'}"`,
      `"${t.cashierName || report?.cashierName || '-'}"`,
      `"${t.bank}"`,
      `"${t.paymentMethod}"`,
      t.amount,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers browser print window for single report formal PDF layout
 */
export function triggerPrintReport() {
  window.print();
}
