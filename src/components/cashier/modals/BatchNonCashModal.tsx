import React from 'react';
import { BankOption, PaymentMethodOption, NonCashTransaction } from '../../../types';
import { CreditCard, X } from 'lucide-react';
import { BankGroupSummary, formatCurrency } from '../utils/cashierNonCashHelpers';
import { BatchBankSubtotals } from '../components/BatchBankSubtotals';
import { BatchTxTable } from '../components/BatchTxTable';

interface BatchNonCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalNonCash: number;
  activeBankGroups: BankGroupSummary[];
  banks: BankOption[];
  paymentMethods: PaymentMethodOption[];
  batchBank: string;
  batchMethod: string;
  onSelectCombo: (bankCode: string, methodCode: string) => void;
  handleBatchBankChange: (bank: string) => void;
  handleBatchMethodChange: (method: string) => void;
  filteredTxs: NonCashTransaction[];
  tableSortField: 'no' | 'amount' | 'time';
  tableSortDir: 'asc' | 'desc';
  handleSort: (field: 'no' | 'amount' | 'time') => void;
  actMode: 'delete' | 'edit';
  handleActHeaderClick: () => void;
  lastAddedTxId: string | null;
  savingTxIds: string[];
  handleRetrySaveTx: (tx: NonCashTransaction) => void;
  setTxToDelete: (tx: NonCashTransaction) => void;
  handleStartEdit: (tx: NonCashTransaction) => void;
  batchInputRef: React.RefObject<HTMLInputElement | null>;
  batchAmountInput: string;
  setBatchAmountInput: (val: string) => void;
  handleBatchSubmit: (e: React.FormEvent) => void;
}

export const BatchNonCashModal: React.FC<BatchNonCashModalProps> = ({
  isOpen,
  onClose,
  totalNonCash,
  activeBankGroups,
  banks,
  paymentMethods,
  batchBank,
  batchMethod,
  onSelectCombo,
  handleBatchBankChange,
  handleBatchMethodChange,
  filteredTxs,
  tableSortField,
  tableSortDir,
  handleSort,
  actMode,
  handleActHeaderClick,
  lastAddedTxId,
  savingTxIds,
  handleRetrySaveTx,
  setTxToDelete,
  handleStartEdit,
  batchInputRef,
  batchAmountInput,
  setBatchAmountInput,
  handleBatchSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 z-50 animate-in fade-in zoom-in duration-150 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-full max-h-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-teal-600 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-white" />
            <h3 className="font-bold text-base text-white">Input transaksi non tunai</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-100 hover:text-white p-1 transition-colors rounded-lg hover:bg-white/10 cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content: 2 Kolom Menyatu */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white min-h-0">
          {/* Kolom Kiri: Rekap Subtotal Masing-Masing Bank */}
          <BatchBankSubtotals
            activeBankGroups={activeBankGroups}
            batchBank={batchBank}
            batchMethod={batchMethod}
            onSelectCombo={onSelectCombo}
          />

          {/* Kolom Kanan: Filter, Tabel, & Form Input */}
          <BatchTxTable
            banks={banks}
            paymentMethods={paymentMethods}
            batchBank={batchBank}
            batchMethod={batchMethod}
            handleBatchBankChange={handleBatchBankChange}
            handleBatchMethodChange={handleBatchMethodChange}
            filteredTxs={filteredTxs}
            tableSortField={tableSortField}
            tableSortDir={tableSortDir}
            handleSort={handleSort}
            actMode={actMode}
            handleActHeaderClick={handleActHeaderClick}
            lastAddedTxId={lastAddedTxId}
            savingTxIds={savingTxIds}
            handleRetrySaveTx={handleRetrySaveTx}
            setTxToDelete={setTxToDelete}
            handleStartEdit={handleStartEdit}
            batchInputRef={batchInputRef}
            batchAmountInput={batchAmountInput}
            setBatchAmountInput={setBatchAmountInput}
            handleBatchSubmit={handleBatchSubmit}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Total Semua Non-Tunai:</span>
            <span className="text-xs font-bold font-mono text-teal-800">
              {formatCurrency(totalNonCash)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
