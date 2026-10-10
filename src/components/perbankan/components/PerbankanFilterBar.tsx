import React from 'react';
import { BankOption, PaymentMethodOption, Branch } from '../../../types';
import { Filter, Search } from 'lucide-react';

interface PerbankanFilterBarProps {
  selectedBank: string;
  setSelectedBank: (val: string) => void;
  selectedMethod: string;
  setSelectedMethod: (val: string) => void;
  selectedBranch: string;
  setSelectedBranch: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  banks: BankOption[];
  paymentMethods: PaymentMethodOption[];
  branches: Branch[];
}

export const PerbankanFilterBar: React.FC<PerbankanFilterBarProps> = ({
  selectedBank,
  setSelectedBank,
  selectedMethod,
  setSelectedMethod,
  selectedBranch,
  setSelectedBranch,
  searchQuery,
  setSearchQuery,
  banks,
  paymentMethods,
  branches,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <Filter className="w-4 h-4 text-slate-500" />
        <span>Filter Transaksi:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Filter Bank */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Bank / Mesin EDC</label>
          <select
            id="filter-bank"
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            <option value="ALL">Semua Bank</option>
            {banks.map((b) => (
              <option key={b.id} value={b.code}>
                {b.code} ({b.name})
              </option>
            ))}
          </select>
        </div>

        {/* Filter Metode */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Metode</label>
          <select
            id="filter-method"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            <option value="ALL">Semua Metode</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Cabang */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cabang</label>
          <select
            id="filter-branch"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            <option value="ALL">Semua Cabang</option>
            {branches.map((br) => (
              <option key={br.id} value={br.code}>
                {br.code} - {br.city}
              </option>
            ))}
          </select>
        </div>

        {/* Search Box */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Cari Kasir / Bank / Metode
          </label>
          <div className="relative">
            <input
              id="input-search-non-cash"
              type="text"
              placeholder="Cari kasir, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2 pl-7 bg-slate-50 border border-slate-200 rounded-lg"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
