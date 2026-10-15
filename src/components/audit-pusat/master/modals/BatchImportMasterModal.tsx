import React, { useState, useRef } from 'react';
import { useApp } from '../../../../context/AppContext';
import { MasterSubTab } from '../MasterDataView';
import { Modal } from '../../../common/Modal';
import {
  generateMasterTemplate,
  parseMasterExcel,
  ParsedMasterRow,
} from '../utils/masterExcelHelper';
import { MasterImportPreviewTable } from '../components/MasterImportPreviewTable';
import {
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface BatchImportMasterModalProps {
  isOpen: boolean;
  type: MasterSubTab;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const BatchImportMasterModal: React.FC<BatchImportMasterModalProps> = ({
  isOpen,
  type,
  onClose,
  onSuccess,
}) => {
  const {
    branches,
    banks,
    paymentMethods,
    masterDenoms,
    saveBranch,
    saveBank,
    savePaymentMethod,
    saveMasterDenom,
    refreshFromSupabase,
  } = useApp();

  const [parsedRows, setParsedRows] = useState<ParsedMasterRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const typeLabels: Record<MasterSubTab, string> = {
    branches: 'Kantor Cabang',
    banks: 'Bank & Rekening',
    payment_methods: 'Metode Pembayaran Non-Tunai',
    denoms: 'Pecahan Uang Tunai',
  };

  const getExistingItems = () => {
    if (type === 'branches') return branches;
    if (type === 'banks') return banks;
    if (type === 'payment_methods') return paymentMethods;
    return masterDenoms;
  };

  const handleDownloadTemplate = () => {
    generateMasterTemplate(type);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setFileName(file.name);
    setIsParsing(true);

    try {
      const existing = getExistingItems();
      const rows = await parseMasterExcel(file, type, existing);
      if (rows.length === 0) {
        setParseError('File Excel kosong atau format header tidak sesuai template.');
      }
      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err?.message || 'Gagal membaca file Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    setProgress({ done: 0, total: validRows.length });

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const item = validRows[i].data;
        let res: { success: boolean; error?: string };

        if (type === 'branches') {
          res = await saveBranch(item as any);
        } else if (type === 'banks') {
          res = await saveBank(item as any);
        } else if (type === 'payment_methods') {
          res = await savePaymentMethod(item as any);
        } else {
          res = await saveMasterDenom(item as any);
        }

        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
        setProgress({ done: i + 1, total: validRows.length });
      }

      await refreshFromSupabase();
      onSuccess(`Import batch selesai: ${successCount} data berhasil disimpan${failCount > 0 ? `, ${failCount} gagal` : ''}.`);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Import Batch Master ${typeLabels[type]} via Excel`}
      subtitle="Unduh template resmi, lengkapi data, lalu unggah spreadsheet Anda."
      maxWidth="4xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isSubmitting || validCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ({progress.done}/{progress.total})...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan {validCount} Data Valid</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Template & Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>1. Unduh Template Resmi</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Gunakan template standar agar header dan format kolom terbaca akurat.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                <span>2. Pilih File Excel yang Telah Diisi</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Format didukung: <strong>.xlsx, .xls</strong>
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={isSubmitting || isParsing}
              className="block w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
          </div>
        </div>

        {parseError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {isParsing && (
          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Menganalisis spreadsheet...</span>
          </div>
        )}

        {parsedRows.length > 0 && (
          <MasterImportPreviewTable
            type={type}
            parsedRows={parsedRows}
            validCount={validCount}
            errorCount={errorCount}
            isSubmitting={isSubmitting}
            onReset={handleReset}
          />
        )}
      </div>
    </Modal>
  );
};
