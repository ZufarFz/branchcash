import * as XLSX from 'xlsx';
import { MasterSubTab } from '../MasterDataView';
import { Branch, BankOption, PaymentMethodOption, DenomConfig, DenomType } from '../../../../types';

export interface ParsedMasterRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errorMessage?: string;
}

export const generateMasterTemplate = (type: MasterSubTab) => {
  const wb = XLSX.utils.book_new();

  if (type === 'branches') {
    const data = [
      ['Kode Cabang (Wajib)', 'Nama Cabang (Wajib)', 'Kota (Opsional)', 'Alamat Lengkap'],
      ['CBG-001', 'Cabang Bandung Utama', 'Bandung', 'Jl. Asia Afrika No. 10'],
      ['CBG-002', 'Cabang Surabaya Barat', 'Surabaya', 'Jl. Mayjen Sungkono No. 45'],
      ['PDN-001', 'Cabang Pedan', 'Klaten', 'Jl. Pemuda No. 12 Pedan'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 38 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Cabang');
    XLSX.writeFile(wb, 'template_master_cabang_branchcash.xlsx');
  } else if (type === 'banks') {
    const data = [
      ['Nama Bank (Wajib)'],
      ['BCA'],
      ['MANDIRI'],
      ['BRI'],
      ['BNI'],
      ['BSI'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Bank');
    XLSX.writeFile(wb, 'template_master_bank_branchcash.xlsx');
  } else if (type === 'payment_methods') {
    const data = [
      ['Nama Metode Pembayaran (Wajib)'],
      ['EDC BCA'],
      ['EDC Mandiri'],
      ['QRIS BCA'],
      ['QRIS ShopeePay'],
      ['Transfer Bank'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Metode Non Tunai');
    XLSX.writeFile(wb, 'template_master_metode_branchcash.xlsx');
  } else {
    // denoms
    const data = [
      ['Kode Denom (Wajib)', 'Label Pecahan (Wajib)', 'Tipe (KERTAS/KOIN/MIX)', 'Nominal (Khusus KERTAS)', 'Urutan Tampil'],
      ['100k', 'Rp 100.000', 'KERTAS', 100000, 1],
      ['50k', 'Rp 50.000', 'KERTAS', 50000, 2],
      ['20k', 'Rp 20.000', 'KERTAS', 20000, 3],
      ['koin_1000', 'Koin Rp 1.000', 'KOIN', '', 8],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 26 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Denominasi');
    XLSX.writeFile(wb, 'template_master_denominasi_branchcash.xlsx');
  }
};

export const parseMasterExcel = async (
  file: File,
  type: MasterSubTab,
  existingItems: any[]
): Promise<ParsedMasterRow[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) return [];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rawRows.length <= 1) return [];

  const results: ParsedMasterRow[] = [];
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
      continue;
    }

    const rowNumber = i + 1;

    if (type === 'branches') {
      const code = String(row[0] || '').trim().toUpperCase();
      const name = String(row[1] || '').trim();
      const city = String(row[2] || '').trim();
      const address = String(row[3] || '').trim() || '-';

      if (!code) {
        results.push({ rowNumber, data: { code, name, city, address }, isValid: false, errorMessage: 'Kode cabang wajib diisi' });
        continue;
      }
      if (!name) {
        results.push({ rowNumber, data: { code, name, city, address }, isValid: false, errorMessage: 'Nama cabang wajib diisi' });
        continue;
      }
      if (seenCodes.has(code)) {
        results.push({ rowNumber, data: { code, name, city, address }, isValid: false, errorMessage: `Duplikat kode cabang "${code}" dalam file Excel` });
        continue;
      }
      const existingBranch = (existingItems as Branch[]).find(b => b.code.toUpperCase() === code);
      seenCodes.add(code);

      results.push({
        rowNumber,
        data: {
          id: existingBranch ? existingBranch.id : `branch-${Date.now()}-${i}`,
          code,
          name,
          city: city || undefined,
          address,
          status: existingBranch ? existingBranch.status : 'ACTIVE',
        },
        isValid: true,
      });
    } else if (type === 'banks') {
      const name = String(row[0] || '').trim();
      if (!name) {
        results.push({ rowNumber, data: { name }, isValid: false, errorMessage: 'Nama bank wajib diisi' });
        continue;
      }
      const upperName = name.toUpperCase();
      if (seenNames.has(upperName)) {
        results.push({ rowNumber, data: { name }, isValid: false, errorMessage: `Duplikat bank "${name}" dalam file Excel` });
        continue;
      }
      const existingBank = (existingItems as BankOption[]).find(b => b.name.toUpperCase() === upperName);
      seenNames.add(upperName);

      results.push({
        rowNumber,
        data: {
          id: existingBank ? existingBank.id : `bank-${Date.now()}-${i}`,
          name,
          isActive: existingBank ? (existingBank.isActive ?? true) : true,
        },
        isValid: true,
      });
    } else if (type === 'payment_methods') {
      const name = String(row[0] || '').trim();
      if (!name) {
        results.push({ rowNumber, data: { name }, isValid: false, errorMessage: 'Nama metode pembayaran wajib diisi' });
        continue;
      }
      const upperName = name.toUpperCase();
      if (seenNames.has(upperName)) {
        results.push({ rowNumber, data: { name }, isValid: false, errorMessage: `Duplikat metode "${name}" dalam file Excel` });
        continue;
      }
      const existingMethod = (existingItems as PaymentMethodOption[]).find(m => m.name.toUpperCase() === upperName);
      seenNames.add(upperName);

      results.push({
        rowNumber,
        data: {
          id: existingMethod ? existingMethod.id : `pm-${Date.now()}-${i}`,
          name,
          isActive: existingMethod ? (existingMethod.isActive ?? true) : true,
        },
        isValid: true,
      });
    } else {
      // denoms
      const code = String(row[0] || '').trim().toUpperCase();
      const label = String(row[1] || '').trim();
      const rawType = String(row[2] || '').trim().toUpperCase();
      const denomType: DenomType = (rawType === 'KOIN' || rawType === 'MIX') ? rawType : 'KERTAS';
      const rawNominal = row[3];
      const nominal = denomType === 'KERTAS' ? (parseFloat(String(rawNominal).replace(/[^0-9]/g, '')) || null) : null;
      const sortOrder = parseInt(String(row[4] || i), 10) || i;

      if (!code) {
        results.push({ rowNumber, data: { code, label, type: denomType, nominal, sortOrder }, isValid: false, errorMessage: 'Kode pecahan wajib diisi' });
        continue;
      }
      if (!label) {
        results.push({ rowNumber, data: { code, label, type: denomType, nominal, sortOrder }, isValid: false, errorMessage: 'Label pecahan wajib diisi' });
        continue;
      }
      if (seenCodes.has(code)) {
        results.push({ rowNumber, data: { code, label, type: denomType, nominal, sortOrder }, isValid: false, errorMessage: `Duplikat kode pecahan "${code}" dalam file Excel` });
        continue;
      }
      const existingDenom = (existingItems as DenomConfig[]).find(d => d.code.toUpperCase() === code);
      seenCodes.add(code);

      results.push({
        rowNumber,
        data: {
          id: existingDenom ? existingDenom.id : `denom-${Date.now()}-${i}`,
          code,
          label,
          type: denomType,
          nominal,
          sortOrder,
          isActive: existingDenom ? (existingDenom.isActive ?? true) : true,
        },
        isValid: true,
      });
    }
  }

  return results;
};
