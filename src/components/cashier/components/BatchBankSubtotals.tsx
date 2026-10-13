import React from 'react';
import { CreditCard } from 'lucide-react';
import { BankGroupSummary, formatCurrency, isBankMatch, isMethodMatch } from '../utils/cashierNonCashHelpers';

interface BatchBankSubtotalsProps {
  activeBankGroups: BankGroupSummary[];
  batchBank: string;
  batchMethod: string;
  onSelectCombo: (bankCode: string, methodCode: string) => void;
}

export const BatchBankSubtotals: React.FC<BatchBankSubtotalsProps> = ({
  activeBankGroups,
  batchBank,
  batchMethod,
  onSelectCombo
}) => {
  return (
    <div className="w-full md:flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-white min-w-0 min-h-0 overflow-hidden">
      <div className="p-4 overflow-hidden flex-1 flex flex-col min-h-0">
        {activeBankGroups.length === 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white flex-1 min-h-0 px-4 flex flex-col items-center justify-center text-center">
            <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              Belum ada rincian bank yang diinput
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Subtotal masing-masing bank akan tampil di sini setelah transaksi diinput
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <label className="text-[11px] font-bold text-slate-700">
                Subtotal Masing-Masing Bank ({activeBankGroups.length})
              </label>
              <span className="text-[11px] text-slate-400">
                Klik rincian untuk pindah filter
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto subtle-scrollbar space-y-2.5 pr-0.5">
              {activeBankGroups.map((bankGroup) => (
                <div
                  key={bankGroup.code}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
                >
                  {/* Judul Bank + Subtotal Bank */}
                  <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-800 truncate">
                        {bankGroup.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        ({bankGroup.count})
                      </span>
                    </div>
                    <span className="font-bold font-mono text-teal-700 text-xs shrink-0">
                      {formatCurrency(bankGroup.subtotal)}
                    </span>
                  </div>

                  {/* Daftar Rincian Metode Pembayaran di Bank Ini */}
                  <div className="divide-y divide-slate-100 bg-white">
                    {bankGroup.methods.map((methodItem) => {
                      const isCurrentComboSelected =
                        isBankMatch(bankGroup.code, batchBank) &&
                        isMethodMatch(methodItem.code, batchMethod);

                      return (
                        <button
                          key={`${bankGroup.code}-${methodItem.code}`}
                          type="button"
                          onClick={() => onSelectCombo(bankGroup.code, methodItem.code)}
                          className={`w-full py-2 pl-7 pr-3.5 flex items-center justify-between gap-2 text-left text-[11px] transition-colors cursor-pointer ${
                            isCurrentComboSelected
                              ? 'bg-teal-50/70 text-teal-800 font-semibold'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                          title={`Klik untuk beralih ke ${bankGroup.name} - ${methodItem.name}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{methodItem.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">
                              ({methodItem.count}x)
                            </span>
                          </div>
                          <span
                            className={`font-semibold font-mono text-[11px] shrink-0 ${
                              isCurrentComboSelected ? 'text-teal-700 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {formatCurrency(methodItem.subtotal)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
