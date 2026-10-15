import React from 'react';
import { BankOption, PaymentMethodOption } from '../../../types';
import { CreditCard, X, Plus } from 'lucide-react';
import { SearchableSelect } from '../../common/SearchableSelect';

interface AddSingleNonCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  ncBank: string;
  setNcBank: (bank: string) => void;
  ncMethod: string;
  setNcMethod: (method: string) => void;
  ncAmount: string;
  setNcAmount: (amount: string) => void;
  banks: BankOption[];
  paymentMethods: PaymentMethodOption[];
  isSubmittingNc: boolean;
}

export const AddSingleNonCashModal: React.FC<AddSingleNonCashModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ncBank,
  setNcBank,
  ncMethod,
  setNcMethod,
  ncAmount,
  setNcAmount,
  banks,
  paymentMethods,
  isSubmittingNc
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="px-5 py-4 bg-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-100" />
            <h3 className="font-bold text-sm">Tambah Transaksi Non-Tunai</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-100 hover:text-white p-1 transition-colors rounded-lg hover:bg-teal-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 relative z-20">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Bank / Mesin EDC
              </label>
              <SearchableSelect
                id="select-nc-bank"
                value={ncBank}
                onChange={setNcBank}
                options={bankOptions}
                placeholder="Pilih Bank..."
                searchPlaceholder="Cari bank..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Metode Pembayaran
              </label>
              <SearchableSelect
                id="select-nc-method"
                value={ncMethod}
                onChange={setNcMethod}
                options={methodOptions}
                placeholder="Pilih Metode..."
                searchPlaceholder="Cari metode..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nominal Transaksi (Rp)
            </label>
            <input
              id="input-nc-amount"
              type="number"
              placeholder="Contoh: 150000"
              min="1"
              value={ncAmount}
              onChange={(e) => setNcAmount(e.target.value)}
              className="w-full text-xs py-2 px-2.5 border border-slate-300 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-add-nc-item"
              type="submit"
              disabled={isSubmittingNc}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmittingNc ? (
                <>Menyimpan...</>
              ) : (
                <><Plus className="w-4 h-4" /> Simpan Transaksi</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
