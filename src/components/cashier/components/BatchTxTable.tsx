import React from 'react';
import { BankOption, PaymentMethodOption, NonCashTransaction } from '../../../types';
import { CreditCard, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../utils/cashierNonCashHelpers';
import { BatchTxRow } from './BatchTxRow';
import { BatchRapidInput } from './BatchRapidInput';
import { SearchableSelect, SearchableSelectRef } from '../../common/SearchableSelect';

interface BatchTxTableProps {
  banks: BankOption[];
  paymentMethods: PaymentMethodOption[];
  batchBank: string;
  batchMethod: string;
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

export const BatchTxTable: React.FC<BatchTxTableProps> = ({
  banks,
  paymentMethods,
  batchBank,
  batchMethod,
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
  const subtotal = filteredTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const indexedTxs = filteredTxs.map((tx, idx) => ({ tx, origIndex: idx + 1 }));

  const sortedTxs = [...indexedTxs].sort((a, b) => {
    let result = 0;
    if (tableSortField === 'no') {
      result = a.origIndex - b.origIndex;
    } else if (tableSortField === 'amount') {
      result = a.tx.amount - b.tx.amount;
    } else if (tableSortField === 'time') {
      const timeA = a.tx.createdAt ? new Date(a.tx.createdAt).getTime() : a.origIndex;
      const timeB = b.tx.createdAt ? new Date(b.tx.createdAt).getTime() : b.origIndex;
      result = timeA - timeB;
    }
    return tableSortDir === 'asc' ? result : -result;
  });

  const renderSortIcon = (field: 'no' | 'amount' | 'time') => {
    if (tableSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />;
    }
    return tableSortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
    );
  };

  const bankSelectRef = React.useRef<SearchableSelectRef | null>(null);
  const methodSelectRef = React.useRef<SearchableSelectRef | null>(null);

  // Keyboard shortcut listener: F2 / Ctrl+B untuk Bank, F4 / Ctrl+M untuk Metode
  React.useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      // Buka dropdown Bank: F2 ATAU Ctrl+B / Cmd+B
      if (e.key === 'F2' || (isCtrlOrMeta && keyLower === 'b')) {
        e.preventDefault();
        e.stopPropagation();
        methodSelectRef.current?.close();
        bankSelectRef.current?.open();
      }
      // Buka dropdown Metode: F4 ATAU Ctrl+M / Cmd+M
      else if (e.key === 'F4' || (isCtrlOrMeta && keyLower === 'm')) {
        e.preventDefault();
        e.stopPropagation();
        bankSelectRef.current?.close();
        methodSelectRef.current?.open();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

  const bankOptions = React.useMemo(() => {
    return banks
      .filter((b) => b.isActive !== false)
      .map((b) => ({ value: b.name, label: b.name }));
  }, [banks]);

  const methodOptions = React.useMemo(() => {
    return paymentMethods
      .filter((m) => m.isActive !== false)
      .map((m) => ({ value: m.name, label: m.name }));
  }, [paymentMethods]);

  return (
    <div className="w-full md:w-[460px] lg:w-[480px] shrink-0 flex flex-col bg-white min-h-0 overflow-hidden">
      {/* Filter Bar: Bank & Metode Pembayaran */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-3 shrink-0 relative z-20">
        <div>
          <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
            <span>1. Pilih Bank / Mesin EDC</span>
            <span
              className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-mono text-slate-600 font-semibold"
              title="Shortcut keyboard: Tekan F2 atau Ctrl+B"
            >
              F2 / Ctrl+B
            </span>
          </label>
          <SearchableSelect
            ref={bankSelectRef}
            id="select-batch-nc-bank"
            value={batchBank}
            onChange={handleBatchBankChange}
            options={bankOptions}
            placeholder="Pilih Bank..."
            searchPlaceholder="Cari bank..."
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
            <span>2. Pilih Metode Pembayaran</span>
            <span
              className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-mono text-slate-600 font-semibold"
              title="Shortcut keyboard: Tekan F4 atau Ctrl+M"
            >
              F4 / Ctrl+M
            </span>
          </label>
          <SearchableSelect
            ref={methodSelectRef}
            id="select-batch-nc-method"
            value={batchMethod}
            onChange={handleBatchMethodChange}
            options={methodOptions}
            placeholder="Pilih Metode..."
            searchPlaceholder="Cari metode..."
          />
        </div>
      </div>

      {/* Body Kanan: Tabel & Form Input */}
      <div className="p-4 overflow-hidden flex-1 flex flex-col gap-3 min-h-0">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white flex-1 flex flex-col min-h-0">
          <div className="bg-slate-50 border-b border-slate-200 shrink-0 select-none">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col className="w-14" />
                <col />
                <col className="w-24" />
                <col className="w-14" />
              </colgroup>
              <thead className="text-slate-600 font-semibold">
                <tr>
                  <th
                    onClick={() => handleSort('no')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk mengurutkan nomor"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>No</span>
                      {renderSortIcon('no')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk mengurutkan nominal"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nominal</span>
                      {renderSortIcon('amount')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('time')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk mengurutkan waktu"
                  >
                    <div className="flex items-center gap-1">
                      <span>Waktu</span>
                      {renderSortIcon('time')}
                    </div>
                  </th>
                  <th
                    onClick={handleActHeaderClick}
                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    title="Klik untuk beralih mode: Hapus / Edit"
                  >
                    <span className="font-semibold text-slate-600">Act</span>
                  </th>
                </tr>
              </thead>
            </table>
          </div>

          {filteredTxs.length === 0 ? (
            <div className="flex-1 min-h-0 px-4 flex flex-col items-center justify-center text-center bg-white">
              <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Belum ada transaksi</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ketik nominal di bawah lalu tekan <span className="font-bold text-teal-600">Enter</span> untuk mulai input
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto subtle-scrollbar bg-white">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <colgroup>
                  <col className="w-14" />
                  <col />
                  <col className="w-24" />
                  <col className="w-14" />
                </colgroup>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedTxs.map(({ tx, origIndex }) => (
                    <BatchTxRow
                      key={tx.id || origIndex}
                      tx={tx}
                      origIndex={origIndex}
                      isJustAdded={lastAddedTxId === tx.id}
                      isSaving={tx.syncStatus === 'SAVING' || savingTxIds.includes(tx.id)}
                      isFailed={tx.syncStatus === 'FAILED' && !savingTxIds.includes(tx.id)}
                      actMode={actMode}
                      handleRetrySaveTx={handleRetrySaveTx}
                      setTxToDelete={setTxToDelete}
                      handleStartEdit={handleStartEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between text-xs shrink-0 select-none">
            <span className="font-semibold text-slate-600">
              Subtotal ({filteredTxs.length} Transaksi):
            </span>
            <span className="font-bold font-mono text-teal-700 text-xs">
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>

        {/* Rapid Input Box */}
        <BatchRapidInput
          batchInputRef={batchInputRef}
          batchAmountInput={batchAmountInput}
          setBatchAmountInput={setBatchAmountInput}
          handleBatchSubmit={handleBatchSubmit}
        />
      </div>
    </div>
  );
};
