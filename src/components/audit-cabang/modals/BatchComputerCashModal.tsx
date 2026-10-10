import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport, ReportStatus } from '../../../types';
import { formatDate } from '../../../utils/formatters';
import { Modal } from '../../common/Modal';
import { BatchCashierRow } from '../components/BatchCashierRow';
import { BatchSummaryCard } from '../components/BatchSummaryCard';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BatchComputerCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredReports: CashReport[];
  selectedDate: string;
}

export const BatchComputerCashModal: React.FC<BatchComputerCashModalProps> = ({
  isOpen,
  onClose,
  filteredReports,
  selectedDate
}) => {
  const { 
    currentUser, 
    currentBranch, 
    inputComputerCash, 
    approveReport, 
    rejectReport, 
    updateReportStatus 
  } = useApp();

  const [batchInputData, setBatchInputData] = useState<Record<string, { 
    tunai: string; 
    nonTunai: string; 
    notes: string;
    status: ReportStatus;
  }>>({});
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [batchSaveStatus, setBatchSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { tunai: string; nonTunai: string; notes: string; status: ReportStatus }> = {};
      filteredReports.forEach((r) => {
        const rawTunai = r.computerCashTunai !== null && r.computerCashTunai !== undefined 
          ? r.computerCashTunai 
          : (r.computerCashTotal ? r.computerCashTotal : 0);
        const rawNonTunai = r.computerCashNonTunai !== null && r.computerCashNonTunai !== undefined 
          ? r.computerCashNonTunai 
          : 0;

        initial[r.id] = {
          tunai: rawTunai && rawTunai > 0 ? rawTunai.toString() : '',
          nonTunai: rawNonTunai && rawNonTunai > 0 ? rawNonTunai.toString() : '',
          notes: r.notes || '',
          status: r.status,
        };
      });
      setBatchInputData(initial);
      setOpenStatusDropdownId(null);
      setBatchSaveStatus(null);
    }
  }, [isOpen, filteredReports]);

  if (!isOpen) return null;

  const branchDisplayName = currentBranch?.name || currentUser.branchName || '';
  const branchTitleText = branchDisplayName
    ? (branchDisplayName.toLowerCase().startsWith('cabang') ? branchDisplayName : `Cabang ${branchDisplayName}`)
    : 'Cabang';
  const batchModalTitle = `Input Nominal Kas Computer ${branchTitleText}`.trim();

  const handleInputChange = (reportId: string, field: 'tunai' | 'nonTunai' | 'notes', value: string) => {
    setBatchInputData((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || { tunai: '', nonTunai: '', notes: '', status: 'DRAFT' }),
        [field]: value,
      },
    }));
  };

  const handleStatusChange = (reportId: string, newStatus: ReportStatus) => {
    setBatchInputData((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || { tunai: '', nonTunai: '', notes: '', status: newStatus }),
        status: newStatus,
      },
    }));
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredReports.length === 0) return;

    setIsSavingBatch(true);
    setBatchSaveStatus(null);

    try {
      let savedCount = 0;
      for (const rep of filteredReports) {
        const item = batchInputData[rep.id] || { tunai: '', nonTunai: '', notes: '', status: rep.status };
        const numTunai = parseFloat(item.tunai.replace(/[^0-9]/g, '')) || 0;
        const numNonTunai = parseFloat(item.nonTunai.replace(/[^0-9]/g, '')) || 0;

        const res = await inputComputerCash(rep.id, numTunai, numNonTunai, item.notes);
        if (res && res.success) savedCount++;

        const targetStatus = item.status || rep.status;
        if (targetStatus !== rep.status) {
          if (targetStatus === 'APPROVED') {
            await approveReport(rep.id);
          } else if (targetStatus === 'REJECTED') {
            await rejectReport(rep.id, item.notes || 'Ditolak oleh Audit Cabang');
          } else {
            await updateReportStatus(rep.id, targetStatus, item.notes);
          }
        }
      }

      setBatchSaveStatus({
        type: 'success',
        message: `Berhasil menyimpan Kas Computer untuk ${savedCount} kasir!`,
      });

      setTimeout(() => {
        onClose();
        setBatchSaveStatus(null);
      }, 1200);
    } catch (err: any) {
      setBatchSaveStatus({
        type: 'error',
        message: err.message || 'Gagal menyimpan data.',
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSavingBatch) onClose();
      }}
      title={batchModalTitle}
      subtitle={`Tanggal: ${formatDate(selectedDate)} • ${filteredReports.length} Kasir`}
      maxWidth="md"
    >
      <form onSubmit={handleSaveBatch} className="space-y-3.5">
        {batchSaveStatus && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${batchSaveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
            {batchSaveStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{batchSaveStatus.message}</span>
          </div>
        )}

        {filteredReports.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
            Tidak ada laporan kasir pada tanggal bisnis ini ({formatDate(selectedDate)}).
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1">
            {filteredReports.map((rep, idx) => (
              <BatchCashierRow
                key={rep.id}
                report={rep}
                idx={idx}
                data={batchInputData[rep.id] || { tunai: '', nonTunai: '', notes: '', status: rep.status }}
                openStatusDropdownId={openStatusDropdownId}
                setOpenStatusDropdownId={setOpenStatusDropdownId}
                onInputChange={handleInputChange}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        <BatchSummaryCard reports={filteredReports} batchInputData={batchInputData} />

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingBatch}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSavingBatch || filteredReports.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSavingBatch ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan Kas Computer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
