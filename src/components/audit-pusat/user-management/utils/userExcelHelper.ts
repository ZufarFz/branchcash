import * as XLSX from 'xlsx';
import { Branch, User, UserRole } from '../../../../types';
import { AdminCreateUserParams } from '../../../../services/supabase/adminAccountActionService';

export interface ParsedUserRow {
  rowNumber: number;
  name: string;
  username: string;
  role: UserRole;
  branchCode: string;
  branchId?: string;
  branchName?: string;
  password: string;
  isValid: boolean;
  errorMessage?: string;
}

const VALID_ROLES: UserRole[] = [
  'KASIR',
  'SPV',
  'KEPALA_CABANG',
  'AUDIT_CABANG',
  'PERBANKAN',
  'AUDIT_PUSAT',
  'AUDIT_PUSAT_ADMIN',
];

const BRANCH_ROLES: UserRole[] = ['KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG'];

export const generateUserImportTemplate = (branches: Branch[]) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template Input
  const sampleBranchCode = branches[0]?.code || 'CBG-001';
  const templateData = [
    ['Nama Lengkap', 'Username', 'Role (Lihat Sheet Master)', 'Kode Cabang', 'Password Awal'],
    ['Budi Santoso', 'budi_kasir', 'KASIR', sampleBranchCode, 'Kasir123!'],
    ['Siti Rahma', 'siti_spv', 'SPV', sampleBranchCode, 'Spv12345!'],
    ['Ahmad Auditor', 'ahmad_audit', 'AUDIT_PUSAT', '', 'AuditPusat123!'],
  ];
  const wsTemplate = XLSX.utils.aoa_to_sheet(templateData);
  wsTemplate['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Pengguna');

  // Sheet 2: Master Role
  const roleMasterData = [
    ['Kode Role (Wajib Huruf Besar)', 'Nama Jabatan', 'Penempatan Cabang', 'Keterangan Wewenang'],
    ['KASIR', 'Kasir Cabang', 'Wajib Isi Kode Cabang', 'Input kas fisik kertas/koin, non-tunai EDC/QRIS, transfer kasir'],
    ['SPV', 'Supervisor Cabang', 'Wajib Isi Kode Cabang', 'Supervisi closing & review harian kasir cabang'],
    ['KEPALA_CABANG', 'Kepala Cabang', 'Wajib Isi Kode Cabang', 'Verifikasi berkas & supervisi closing cabang'],
    ['AUDIT_CABANG', 'Audit Cabang', 'Wajib Isi Kode Cabang', 'Input Computer Cash (POS) harian & penunjukan kasir bandar'],
    ['PERBANKAN', 'Perbankan Pusat', 'Kosongkan (Pusat)', 'Rekonsiliasi mutasi non-tunai bank (Matched/Unmatched)'],
    ['AUDIT_PUSAT', 'Audit Pusat', 'Kosongkan (Pusat)', 'Verifikasi berkas, persetujuan final (Approved), Reject, Force Edit'],
    ['AUDIT_PUSAT_ADMIN', 'Super Admin (Audit Pusat)', 'Kosongkan (Pusat)', 'Semua wewenang audit pusat + Master Data & Manajemen Pengguna'],
  ];
  const wsRole = XLSX.utils.aoa_to_sheet(roleMasterData);
  wsRole['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsRole, 'Master Role');

  // Sheet 3: Master Cabang
  const branchMasterData = [
    ['Kode Cabang (Tulis di Sheet 1)', 'Nama Cabang', 'Alamat Cabang'],
    ...branches.map((b) => [b.code, b.name, b.address || '-']),
  ];
  const wsBranch = XLSX.utils.aoa_to_sheet(branchMasterData);
  wsBranch['!cols'] = [{ wch: 28 }, { wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsBranch, 'Master Cabang');

  XLSX.writeFile(wb, 'template_import_pengguna_branchcash.xlsx');
};

export const parseUserImportExcel = async (
  file: File,
  branches: Branch[],
  existingUsers: User[]
): Promise<ParsedUserRow[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) return [];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rawRows.length <= 1) return [];

  const results: ParsedUserRow[] = [];
  const seenUsernamesInFile = new Set<string>();
  const existingUsernameSet = new Set(
    existingUsers.map((u) => (u.username || '').toLowerCase().trim())
  );

  const branchByCode = new Map<string, Branch>();
  branches.forEach((b) => branchByCode.set(b.code.toUpperCase().trim(), b));

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
      continue;
    }

    const name = String(row[0] || '').trim();
    const rawUsername = String(row[1] || '').trim().toLowerCase();
    const cleanUsername = rawUsername.replace(/[^a-z0-9_.]/g, '');
    const rawRole = String(row[2] || '').trim().toUpperCase() as UserRole;
    const branchCode = String(row[3] || '').trim().toUpperCase();
    const password = String(row[4] || '').trim();

    const errors: string[] = [];

    if (!name) errors.push('Nama wajib diisi');
    if (!cleanUsername || cleanUsername.length < 3) {
      errors.push('Username min 3 karakter alfanumerik');
    } else if (cleanUsername !== rawUsername) {
      errors.push('Username hanya boleh a-z, 0-9, titik, dan garis bawah');
    } else if (existingUsernameSet.has(cleanUsername)) {
      errors.push(`Username "@${cleanUsername}" sudah digunakan akun lain`);
    } else if (seenUsernamesInFile.has(cleanUsername)) {
      errors.push(`Username "@${cleanUsername}" duplikat di file ini`);
    }

    seenUsernamesInFile.add(cleanUsername);

    if (!VALID_ROLES.includes(rawRole)) {
      errors.push(`Role "${rawRole || '-'}" tidak valid`);
    }

    let branchId: string | undefined;
    let branchName: string | undefined;

    if (BRANCH_ROLES.includes(rawRole)) {
      if (!branchCode) {
        errors.push('Kode cabang wajib diisi untuk peran cabang');
      } else {
        const branch = branchByCode.get(branchCode);
        if (!branch) {
          errors.push(`Kode cabang "${branchCode}" tidak terdaftar`);
        } else {
          branchId = branch.id;
          branchName = branch.name;
        }
      }
    }

    if (!password || password.length < 6) {
      errors.push('Password min 6 karakter');
    }

    results.push({
      rowNumber: i + 1,
      name,
      username: cleanUsername,
      role: rawRole,
      branchCode,
      branchId,
      branchName,
      password,
      isValid: errors.length === 0,
      errorMessage: errors.join('; '),
    });
  }

  return results;
};

export const toAdminCreateParams = (rows: ParsedUserRow[]): AdminCreateUserParams[] => {
  return rows
    .filter((r) => r.isValid)
    .map((r) => ({
      username: r.username,
      name: r.name,
      role: r.role,
      branchId: r.branchId,
      password: r.password,
    }));
};
