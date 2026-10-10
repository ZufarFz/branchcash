import React, { useState } from 'react';
import { NonCashTransaction, BankOption, PaymentMethodOption } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { isBankMatch, isMethodMatch } from '../utils/cashierNonCashHelpers';
import { X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SelectedBankMethodDetail {
  bankCode: string;
  bankName: string;
  methodCode: string;
  methodName: string;
}

interface NonCashDetailModalProps {
  selectedDetail?: SelectedBankMethodDetail | null;
  detail?: SelectedBankMethodDetail | null;
  onClose: () => void;
  transactions: NonCashTransaction[];
  banks?: BankOption[];
  paymentMethods?: PaymentMethodOption[];
}

export const NonCashDetailModal: React.FC<NonCashDetailModalProps> = ({
  selectedDetail,
  detail,
  onClose,
  transactions,
  banks,
  paymentMethods
}) => {
  const activeDetail = detail || selectedDetail;
  const [detailSortField, setDetailSortField] = useState<'no' | 'amount' | 'time'>('no');
  const [detailSortDir, setDetailSortDir] = useState<'asc' | 'desc'>('asc');

  if (!activeDetail) return null;

  const detailTxs = transactions.filter(
    (tx) =>
      isBankMatch(tx.bank, activeDetail.bankCode, banks) &&
      isMethodMatch(tx.paymentMethod, activeDetail.methodCode, paymentMethods)
  );
  const detailSubtotal = detailTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const indexedDetailTxs = detailTxs.map((tx, idx) => ({ tx, origIndex: idx + 1 }));

  const sortedDetailTxs = [...indexedDetailTxs].sort((a, b) => {
    let result = 0;
    if (detailSortField === 'no') {
      result = a.origIndex - b.origIndex;
    } else if (detailSortField === 'amount') {
      result = a.tx.amount - b.tx.amount;
    } else if (detailSortField === 'time') {
      const timeA = a.tx.createdAt ? new Date(a.tx.createdAt).getTime() : a.origIndex;
      const timeB = b.tx.createdAt ? new Date(b.tx.createdAt).getTime() : b.origIndex;
      result = timeA - timeB;
    }
    return detailSortDir === 'asc' ? result : -result;
  });

  const handleDetailSort = (field: 'no' | 'amount' | 'time') => {
    if (detailSortField === field) {
      setDetailSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDetailSortField(field);
      setDetailSortDir('asc');
    }
  };

  const renderDetailSortIcon = (field: 'no' | 'amount' | 'time') => {
    if (detailSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />;
    }
    return detailSortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in zoom-in duration-150 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 bg-teal-600 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-sm text-white truncate">
              {activeDetail.bankCode} - {activeDetail.bankName}
            </h3>
            <p className="text-[11px] text-teal-100 font-medium truncate">
              Metode: <strong className="text-white">{activeDetail.methodName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-100 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white flex-1 flex flex-col min-h-0">
            <div className="bg-slate-50 border-b border-slate-200 shrink-0 select-none">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <colgroup>
                  <col className="w-14" />
                  <col />
                  <col className="w-24" />
                </colgroup>
                <thead className="text-slate-600 font-semibold">
                  <tr>
                    <th
                      onClick={() => handleDetailSort('no')}
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>No</span>
                        {renderDetailSortIcon('no')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDetailSort('amount')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nominal</span>
                        {renderDetailSortIcon('amount')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDetailSort('time')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Waktu</span>
                        {renderDetailSortIcon('time')}
                      </div>
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            {sortedDetailTxs.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-400">
                Tidak ada rincian transaksi
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto subtle-scrollbar bg-white">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col className="w-14" />
                    <col />
                    <col className="w-24" />
                  </colgroup>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedDetailTxs.map(({ tx, origIndex }) => (
                      <tr key={tx.id || origIndex} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
                          {origIndex}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between text-xs shrink-0">
              <span className="font-semibold text-slate-600">
                Total ({detailTxs.length} Transaksi):
              </span>
              <span className="font-bold font-mono text-teal-700 text-xs">
                {formatCurrency(detailSubtotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
