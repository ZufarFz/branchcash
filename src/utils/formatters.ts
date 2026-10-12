import { ReportStatus, UserRole } from '../types';

/**
 * Formats a number to Indonesian Rupiah (IDR) currency format.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Format date YYYY-MM-DD to readable Indonesian format.
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split(' ')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day} ${months[monthIndex]} ${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
}

/**
 * Returns variance badge styling and description.
 */
export function getVarianceInfo(variance: number | null) {
  if (variance === null) {
    return {
      status: 'UNCHECKED',
      label: 'Belum Ada Computer Cash',
      colorText: 'text-slate-500',
      bgText: 'bg-slate-100 border-slate-200',
      isKlop: false,
    };
  }

  if (variance === 0) {
    return {
      status: 'BALANCED',
      label: 'Klop / Sesuai (Rp 0)',
      colorText: 'text-emerald-700',
      bgText: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      isKlop: true,
    };
  }

  if (variance > 0) {
    return {
      status: 'SURPLUS',
      label: `Surplus (+${formatCurrency(variance)})`,
      colorText: 'text-blue-700',
      bgText: 'bg-blue-50 border-blue-200 text-blue-800',
      isKlop: false,
    };
  }

  return {
    status: 'DEFICIT',
    label: `Selisih Kurang (${formatCurrency(variance)})`,
    colorText: 'text-rose-700',
    bgText: 'bg-rose-50 border-rose-200 text-rose-800',
    isKlop: false,
  };
}

export function getRoleDetails(role: UserRole) {
  switch (role) {
    case 'KASIR':
      return {
        label: 'Kasir',
        tag: 'Cabang',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        description: 'Input denom tunai & transaksi non-tunai, submit laporan',
      };
    case 'SPV':
      return {
        label: 'SPV',
        tag: 'Cabang',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Review laporan kasir & monitoring status cabang',
      };
    case 'KEPALA_CABANG':
      return {
        label: 'Kepala Cabang',
        tag: 'Cabang',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Review laporan & monitoring closing harian cabang',
      };
    case 'AUDIT_CABANG':
      return {
        label: 'Audit Cabang',
        tag: 'Cabang',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        description: 'Input nominal Computer Cash/POS & pemeriksaan cabang',
      };
    case 'PERBANKAN':
      return {
        label: 'Div. Perbankan',
        tag: 'Kantor Pusat',
        color: 'bg-teal-50 text-teal-700 border-teal-200',
        description: 'Rekonsiliasi & pencocokan transaksi non-tunai per item',
      };
    case 'AUDIT_PUSAT':
      return {
        label: 'Audit Pusat',
        tag: 'Kantor Pusat',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        description: 'Kewenangan approval final, reject, force edit & audit log',
      };
    case 'AUDIT_PUSAT_ADMIN':
      return {
        label: 'Super Admin',
        tag: 'Kantor Pusat',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        description: 'Super Admin: Akses penuh approval, kelola master data, & persetujuan akun',
      };
    default:
      return {
        label: (role as string) || 'Pengguna',
        tag: 'Sistem',
        color: 'bg-slate-50 text-slate-700 border-slate-200',
        description: 'Pengguna sistem BranchCash',
      };
  }
}

export function getStatusDetails(status: ReportStatus) {
  switch (status) {
    case 'DRAFT':
    case 'SUBMITTED':
      return {
        label: 'Draft',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        dotColor: 'bg-amber-500',
        description: 'Sedang berjalan / Menunggu review & approval',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        description: 'Ditolak oleh Audit Pusat, butuh revisi',
      };
    case 'APPROVED':
      return {
        label: 'Approved (Locked)',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotColor: 'bg-emerald-600',
        description: 'Disetujui Audit Pusat & otomatis terkunci',
      };
  }
}
