import React, { useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashReport } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { getActiveBankGroups, BankGroupSummary } from '../utils/cashierNonCashHelpers';
import { CreditCard } from 'lucide-react';

interface CashierNonCashTabProps {
  activeReport: CashReport | null;
  onSelectDetail: (detail: {
    bankCode: string;
    bankName: string;
    methodCode: string;
    methodName: string;
  }) => void;
}

export const CashierNonCashTab: React.FC<CashierNonCashTabProps> = ({
  activeReport,
  onSelectDetail
}) => {
  const { banks, paymentMethods } = useApp();

  const activeBankGroups = useMemo<BankGroupSummary[]>(() => {
    return getActiveBankGroups(activeReport, banks, paymentMethods);
  }, [activeReport, banks, paymentMethods]);

  if (activeBankGroups.length === 0) {
    return (
      <div className="lg:col-span-12">
        <div className="border border-slate-200 rounded-xl p-10 text-center space-y-3 bg-slate-50/40">
          <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">Belum ada transaksi non-tunai</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Klik tombol <strong>Input Non-Tunai</strong> untuk mencatat pembayaran QRIS, EDC, atau Transfer Bank.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeBankGroups.map((bankGroup) => (
          <div
            key={bankGroup.code}
            className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white flex flex-col"
          >
            {/* Header Bank */}
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

            {/* List Metode Pembayaran */}
            <div className="divide-y divide-slate-100 bg-white">
              {bankGroup.methods.map((methodItem) => (
                <button
                  type="button"
                  key={`${bankGroup.code}-${methodItem.code}`}
                  onClick={() => {
                    onSelectDetail({
                      bankCode: bankGroup.code,
                      bankName: bankGroup.name,
                      methodCode: methodItem.code,
                      methodName: methodItem.name,
                    });
                  }}
                  className="w-full py-2 pl-7 pr-3.5 flex items-center justify-between gap-2 text-left text-[11px] text-slate-600 hover:bg-teal-50/60 hover:text-teal-900 transition-colors cursor-pointer group"
                  title={`Klik untuk lihat detail rincian ${bankGroup.name} - ${methodItem.name}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate group-hover:font-medium group-hover:underline">
                      {methodItem.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">
                      ({methodItem.count}x)
                    </span>
                  </div>
                  <span className="font-semibold font-mono text-[11px] text-slate-700 group-hover:text-teal-700 shrink-0">
                    {formatCurrency(methodItem.subtotal)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
