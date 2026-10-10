import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { NonCashTransaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { exportNonCashToCSV } from '../../utils/exportUtils';
import { Download } from 'lucide-react';
import { PerbankanFilterBar } from './components/PerbankanFilterBar';
import { PerbankanTable, PerbankanItem } from './components/PerbankanTable';

export const PerbankanView: React.FC = () => {
  const { currentUser, reports, banks, paymentMethods, branches } = useApp();

  // Aggregate all non-cash transactions across all reports
  const allNonCashItems = useMemo(() => {
    const items: PerbankanItem[] = [];

    reports.forEach((rep) => {
      rep.nonCashTransactions.forEach((tx) => {
        items.push({
          tx,
          reportNumber: rep.reportNumber,
          reportId: rep.id,
          branchName: rep.branchName,
          branchCode: rep.branchCode,
          businessDate: rep.businessDate,
          reportStatus: rep.status,
        });
      });
    });

    return items;
  }, [reports]);

  // Filters
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtered items
  const filteredItems = useMemo(() => {
    return allNonCashItems.filter((item) => {
      if (selectedBank !== 'ALL' && item.tx.bank !== selectedBank) return false;
      if (selectedMethod !== 'ALL' && item.tx.paymentMethod !== selectedMethod) return false;
      if (selectedBranch !== 'ALL' && item.branchCode !== selectedBranch) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCashier = item.tx.cashierName?.toLowerCase().includes(q) ?? false;
        const matchesReport = item.reportNumber.toLowerCase().includes(q);
        const matchesBank = item.tx.bank.toLowerCase().includes(q);
        const matchesMethod = item.tx.paymentMethod.toLowerCase().includes(q);
        if (!matchesCashier && !matchesReport && !matchesBank && !matchesMethod) return false;
      }
      return true;
    });
  }, [allNonCashItems, selectedBank, selectedMethod, selectedBranch, searchQuery]);

  // KPI Metrics
  const totalVolume = allNonCashItems.reduce((acc, curr) => acc + curr.tx.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Monitoring Non-Tunai (Perbankan)
            </h1>
            <span className="text-xs bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded border border-teal-200">
              Pusat Data Non-Tunai
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Petugas: <strong className="text-slate-800">{currentUser.name}</strong> •{' '}
            Rekap transaksi non-tunai (Bank / Mesin EDC & Metode Pembayaran) seluruh cabang
          </p>
        </div>

        <button
          id="btn-export-non-cash-csv"
          type="button"
          onClick={() => {
            const rawTxs: NonCashTransaction[] = allNonCashItems.map((i) => i.tx);
            exportNonCashToCSV(rawTxs, reports);
          }}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" /> Export CSV Non-Tunai
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Total Volume Non-Tunai</span>
          <span className="font-mono font-bold text-xl text-teal-700 mt-1 block">
            {formatCurrency(totalVolume)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {allNonCashItems.length} transaksi tercatat
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Total Cabang Aktif</span>
          <span className="font-mono font-bold text-xl text-slate-900 mt-1 block">
            {branches.length} Cabang
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Seluruh cabang operasional
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Metode Pembayaran</span>
          <span className="font-mono font-bold text-xl text-indigo-700 mt-1 block">
            {paymentMethods.length} Jenis
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            QRIS, Debit, Kredit, Transfer, dll.
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <PerbankanFilterBar
        selectedBank={selectedBank}
        setSelectedBank={setSelectedBank}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        banks={banks}
        paymentMethods={paymentMethods}
        branches={branches}
      />

      {/* Non-Cash Transactions Table */}
      <PerbankanTable items={filteredItems} />
    </div>
  );
};
