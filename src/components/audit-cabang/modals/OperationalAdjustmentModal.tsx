import React, { useState, useEffect } from 'react';
import { User, AdjustmentType } from '../../../types';
import { Modal } from '../../common/Modal';
import { supabaseService } from '../../../services/supabaseService';
import { ArrowDownRight, ArrowUpRight, Plus, AlertCircle, Check } from 'lucide-react';

interface OperationalAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  cashiers: User[];
  currentUserId: string;
  onSuccess: () => void;
  defaultCashierId?: string;
  defaultDate?: string;
}

export const OperationalAdjustmentModal: React.FC<OperationalAdjustmentModalProps> = ({
  isOpen,
  onClose,
  branchId,
  cashiers,
  currentUserId,
  onSuccess,
  defaultCashierId,
  defaultDate,
}) => {
  const [cashierId, setCashierId] = useState<string>('');
  const [businessDate, setBusinessDate] = useState<string>(
    defaultDate || new Date().toISOString().split('T')[0]
  );
  const [type, setType] = useState<AdjustmentType>('EXPENSE');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCashierId(defaultCashierId || (cashiers.length > 0 ? cashiers[0].id : ''));
      setBusinessDate(defaultDate || new Date().toISOString().split('T')[0]);
      setType('EXPENSE');
      setAmountStr('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, defaultCashierId, defaultDate, cashiers]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(val ? Number(val).toLocaleString('id-ID') : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericAmount = Number(amountStr.replace(/[^0-9]/g, ''));
    if (!cashierId) {
      setErrorMsg('Pilih kasir yang bersangkutan.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Nominal transaksi harus lebih dari 0.');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('Keterangan mutasi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await supabaseService.createOperationalAdjustment({
        branchId,
        cashierId,
        businessDate,
        type,
        amount: numericAmount,
        notes: notes.trim(),
        createdBy: currentUserId,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan transaksi penyesuaian.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Input Kas Operasional Kasir (Non-POS)"
      subtitle="Catat pengeluaran/pemasukan kasir di luar transaksi POS (Parkir, Makan kunjungan, dll)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Jenis Mutasi: EXPENSE / INCOME */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Transaksi</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                type === 'EXPENSE'
                  ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              <span>Pengeluaran (Biaya)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>Pemasukan (Non-POS)</span>
            </button>
          </div>
        </div>

        {/* Pemilihan Kasir */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kasir yang Bersangkutan <span className="text-rose-500">*</span>
          </label>
          <select
            value={cashierId}
            required
            onChange={(e) => setCashierId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 text-slate-900 outline-none transition-all cursor-pointer font-medium"
          >
            <option value="">Pilih Kasir</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (@{c.username})
              </option>
            ))}
          </select>
        </div>

        {/* Tanggal Bisnis */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Bisnis <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            value={businessDate}
            onChange={(e) => setBusinessDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 text-slate-900 outline-none transition-all"
          />
        </div>

        {/* Nominal */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <input
              type="text"
              required
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 text-slate-900 font-bold outline-none transition-all"
            />
          </div>
        </div>

        {/* Keterangan / Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Keterangan Transaksi <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Bayar parkir truk logistik, beli galon air darurat, dll."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 text-slate-900 outline-none transition-all"
          />
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Kas Operasional</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
