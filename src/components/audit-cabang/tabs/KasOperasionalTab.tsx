import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { CashierOperationalAdjustment } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { supabaseService } from '../../../services/supabaseService';
import { OperationalAdjustmentModal } from '../modals/OperationalAdjustmentModal';
import { 
  Receipt, 
  Plus, 
  ArrowDownRight, 
  ArrowUpRight, 
  Trash2, 
  Calendar, 
  User as UserIcon,
  RefreshCw 
} from 'lucide-react';

export const KasOperasionalTab: React.FC = () => {
  const { currentUser, allUsers, refreshFromSupabase, isSyncing } = useApp();

  const [adjustments, setAdjustments] = useState<CashierOperationalAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterCashierId, setFilterCashierId] = useState<string>('ALL');

  const branchCashiers = useMemo(() => {
    return (allUsers || []).filter(
      (u) => u.role === 'KASIR' && (u.branchId === currentUser.branchId || (!currentUser.branchId && true))
    );
  }, [allUsers, currentUser.branchId]);

  const loadAdjustments = async () => {
    if (!currentUser.branchId) return;
    setIsLoading(true);
    try {
      const data = await supabaseService.fetchOperationalAdjustments({
        branchId: currentUser.branchId,
        businessDate: selectedDate === 'ALL' ? undefined : selectedDate,
        cashierId: filterCashierId === 'ALL' ? undefined : filterCashierId,
      });
      setAdjustments(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustments();
  }, [currentUser.branchId, selectedDate, filterCashierId]);

  const totalExpense = useMemo(() => {
    return adjustments
      .filter((a) => a.type === 'EXPENSE')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [adjustments]);

  const totalIncome = useMemo(() => {
    return adjustments
      .filter((a) => a.type === 'INCOME')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [adjustments]);

  const handleDelete = async (id: string, notes: string) => {
    if (!window.confirm(`Yakin ingin menghapus mutasi "${notes}"?`)) return;
    try {
      const res = await supabaseService.deleteOperationalAdjustment(id);
      if (res.success) {
        setAdjustments((prev) => prev.filter((a) => a.id !== id));
        await refreshFromSupabase();
      } else {
        alert(res.error || 'Gagal menghapus mutasi.');
      }
    } catch (e: any) {
      alert(e?.message || 'Terjadi kesalahan.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar: Action & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Tanggal:</span>
          </div>
          <input
            type="date"
            value={selectedDate === 'ALL' ? '' : selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:ring-2 focus:ring-purple-500"
          />

          <select
            value={filterCashierId}
            onChange={(e) => setFilterCashierId(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">Semua Kasir ({branchCashiers.length})</option>
            {branchCashiers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAdjustments}
            disabled={isLoading || isSyncing}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Kas Operasional</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Pengeluaran (Non-POS)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Parkir, konsumsi, biaya mendadak</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Pemasukan (Non-POS)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pengembalian sisa, titipan non-POS</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Pengeluaran Bersih</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpense - totalIncome)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pengurang kas yang disetor kasir</p>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3">Tanggal & Waktu</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Belum ada transaksi kas operasional pada tanggal/filter ini.</span>
                  </td>
                </tr>
              ) : (
                adjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-800">{a.cashierName || 'Kasir'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {a.type === 'EXPENSE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <ArrowDownRight className="w-3 h-3 text-rose-600" />
                          <span>Pengeluaran</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          <span>Pemasukan</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`text-xs font-bold font-mono ${a.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {a.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(a.amount)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-700 max-w-xs break-words">
                      {a.notes}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {formatDate(a.businessDate)}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id, a.notes)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Penyesuaian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Penyesuaian */}
      <OperationalAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branchId={currentUser.branchId || ''}
        cashiers={branchCashiers}
        currentUserId={currentUser.id}
        defaultDate={selectedDate === 'ALL' ? undefined : selectedDate}
        defaultCashierId={filterCashierId === 'ALL' ? undefined : filterCashierId}
        onSuccess={async () => {
          await loadAdjustments();
          await refreshFromSupabase();
        }}
      />
    </div>
  );
};
