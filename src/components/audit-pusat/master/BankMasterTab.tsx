import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { BankOption } from '../../../types';
import { Plus, Edit2, CheckCircle2, XCircle, Loader2, Power } from 'lucide-react';

export const BankMasterTab: React.FC = () => {
  const { banks, saveBank, toggleBankActive } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setIsEditing(true);
    setFeedback(null);
  };

  const handleOpenEdit = (bank: BankOption) => {
    setEditingId(bank.id);
    setName(bank.name);
    setIsEditing(true);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Nama bank wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const bankPayload: BankOption = {
      id: editingId || `bank-${Date.now()}`,
      name: name.trim(),
      isActive: editingId ? (banks.find(b => b.id === editingId)?.isActive ?? true) : true,
    };

    const res = await saveBank(bankPayload);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', text: `Bank ${bankPayload.name} berhasil disimpan.` });
      setTimeout(() => {
        setIsEditing(false);
        setFeedback(null);
      }, 1200);
    } else {
      setFeedback({ type: 'error', text: res.error || 'Gagal menyimpan bank.' });
    }
  };

  const handleToggle = async (bankId: string) => {
    await toggleBankActive(bankId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Master Bank EDC & Rekening
          </h4>
          <p className="text-[11px] text-slate-500">
            Daftar bank mitra transaksi non-tunai dan settlement cabang.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Bank</span>
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-700">
              {editingId ? 'Edit Bank' : 'Tambah Bank Baru'}
            </span>
            <span className="text-[10px] text-slate-400">Master Bank</span>
          </div>

          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Nama Bank / Mesin EDC (Unik)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: BCA, Bank Central Asia, Mandiri"
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFeedback(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Bank</span>
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3">Nama Bank</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {banks.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400">
                  Belum ada data master bank.
                </td>
              </tr>
            ) : (
              banks.map((bank) => {
                const active = bank.isActive ?? true;
                return (
                  <tr key={bank.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {bank.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(bank)}
                          title="Edit Bank"
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(bank.id)}
                          title={active ? 'Nonaktifkan Bank (Soft Delete)' : 'Aktifkan Kembali Bank'}
                          className={`p-1 rounded-md cursor-pointer transition-colors ${
                            active
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
