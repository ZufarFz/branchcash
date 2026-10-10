import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { DenomConfig, DenomType } from '../../../types';
import { Plus, Edit2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const DenomMasterTab: React.FC = () => {
  const { masterDenoms, saveMasterDenom, toggleMasterDenomActive } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [nominal, setNominal] = useState('');
  const [type, setType] = useState<DenomType>('KERTAS');
  const [sortOrder, setSortOrder] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode('');
    setLabel('');
    setNominal('');
    setType('KERTAS');
    setSortOrder((masterDenoms.length + 1).toString());
    setIsEditing(true);
    setFeedback(null);
  };

  const handleOpenEdit = (denom: DenomConfig) => {
    setEditingId(denom.id);
    setCode(denom.code);
    setLabel(denom.label);
    setNominal(denom.nominal ? denom.nominal.toString() : '');
    setType(denom.type);
    setSortOrder(denom.sortOrder.toString());
    setIsEditing(true);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !label.trim()) {
      setFeedback({ type: 'error', text: 'Kode dan label wajib diisi.' });
      return;
    }

    const cleanNominal = type === 'KERTAS' ? (parseFloat(nominal.replace(/[^0-9]/g, '')) || null) : null;
    const cleanSortOrder = parseInt(sortOrder, 10) || 1;

    setIsSubmitting(true);
    setFeedback(null);

    const denomPayload: DenomConfig = {
      id: editingId || `denom-${Date.now()}`,
      code: code.trim().toUpperCase(),
      label: label.trim(),
      nominal: cleanNominal,
      type,
      sortOrder: cleanSortOrder,
      isActive: editingId ? (masterDenoms.find(d => d.id === editingId)?.isActive ?? true) : true,
    };

    const res = await saveMasterDenom(denomPayload);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', text: `Denominasi ${denomPayload.code} berhasil disimpan.` });
      setTimeout(() => {
        setIsEditing(false);
        setFeedback(null);
      }, 1200);
    } else {
      setFeedback({ type: 'error', text: res.error || 'Gagal menyimpan denominasi.' });
    }
  };

  const handleToggle = async (denomId: string) => {
    await toggleMasterDenomActive(denomId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Master Denominasi Uang Tunai
          </h4>
          <p className="text-[11px] text-slate-500">
            Daftar pecahan kertas dan koin yang digunakan kasir cabang.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pecahan</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg text-xs font-medium border ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.text}
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h5 className="text-xs font-bold text-slate-800">
            {editingId ? 'Edit Denominasi' : 'Tambah Denominasi Baru'}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kode Pecahan</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Misal: 100K"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Label Tampilan</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Misal: Rp 100.000"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipe</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DenomType)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="KERTAS">KERTAS</option>
                <option value="KOIN">KOIN</option>
                <option value="MIX">MIX</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal (Kertas)</label>
              <input
                type="text"
                disabled={type !== 'KERTAS'}
                value={nominal ? Number(nominal.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                onChange={(e) => setNominal(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={type === 'KERTAS' ? '100000' : 'Otomatis Kosong'}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Pecahan</span>
            </button>
          </div>
        </form>
      )}

      {/* Tabel */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Kode</th>
              <th className="py-2.5 px-3">Label</th>
              <th className="py-2.5 px-3">Tipe</th>
              <th className="py-2.5 px-3 text-right">Nominal</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {masterDenoms.map((d) => {
              const active = d.isActive ?? true;
              return (
                <tr key={d.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-mono font-bold text-slate-800">{d.code}</td>
                  <td className="py-2 px-3 text-slate-700 font-medium">{d.label}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {d.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">
                    {d.nominal ? `Rp ${d.nominal.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(d)}
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        title="Edit Pecahan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(d.id)}
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          active
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                        title={active ? 'Nonaktifkan (Soft Delete)' : 'Aktifkan Kembali'}
                      >
                        {active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
