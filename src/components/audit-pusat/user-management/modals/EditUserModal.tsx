import React, { useState, useEffect } from 'react';
import { User, UserRole, Branch } from '../../../../types';
import { Modal } from '../../../common/Modal';
import { Lock, ShieldCheck, UserCheck, Check, KeyRound } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  branches: Branch[];
  onSave: (userId: string, data: { name: string; role: UserRole; branchId?: string | null; status: 'PENDING' | 'ACTIVE' | 'INACTIVE' }) => Promise<void>;
  isProcessing: boolean;
  currentUserRole?: UserRole;
  onResetPassword?: (user: User) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  branches,
  onSave,
  isProcessing,
  currentUserRole,
  onResetPassword,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('KASIR');
  const [branchId, setBranchId] = useState<string>('');
  const [status, setStatus] = useState<'PENDING' | 'ACTIVE' | 'INACTIVE'>('PENDING');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setBranchId(user.branchId || '');
      setStatus((user.status as any) || 'PENDING');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isBranchRole = ['KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG'].includes(role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave(user.id, {
      name: name.trim(),
      role,
      branchId: isBranchRole ? branchId || null : null,
      status,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title="Edit Data & Otorisasi Pengguna"
      subtitle={`Kelola pengaturan peran dan cabang untuk @${user.username || user.name.toLowerCase().replace(/[^a-z0-9_.]/g, '')}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Readonly Display */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" /> Username Akun (Terkunci Anti-Fraud)
          </span>
          <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">@{user.username || user.name.toLowerCase().replace(/[^a-z0-9_.]/g, '')}</p>
        </div>

        {/* Nama Lengkap */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none transition-all"
          />
        </div>

        {/* Peran / Role */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Pengguna (Role)</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all cursor-pointer font-medium"
          >
            <option value="KASIR">Kasir (Cabang)</option>
            <option value="SPV">SPV / Supervisor (Cabang)</option>
            <option value="KEPALA_CABANG">Kepala Cabang (Cabang)</option>
            <option value="AUDIT_CABANG">Audit Cabang (POS & Bandar)</option>
            <option value="PERBANKAN">Perbankan (Kantor Pusat)</option>
            {currentUserRole === 'AUDIT_PUSAT_ADMIN' && (
              <>
                <option value="AUDIT_PUSAT">Audit Pusat (Kantor Pusat)</option>
                <option value="AUDIT_PUSAT_ADMIN">Super Admin (Audit Pusat)</option>
              </>
            )}
          </select>
        </div>

        {/* Cabang Penempatan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cabang Penempatan {isBranchRole ? '(Wajib Cabang)' : '(Kantor Pusat)'}
          </label>
          {isBranchRole ? (
            <select
              value={branchId}
              required
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all cursor-pointer font-medium"
            >
              <option value="">Pilih Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name} ({b.city || 'Cabang'})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              disabled
              value="Kantor Pusat (Head Office)"
              className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
            />
          )}
        </div>

        {/* Status Akun */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Status Akun</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all cursor-pointer font-bold"
          >
            {user.status === 'PENDING' && (
              <option value="PENDING" className="text-amber-800">Menunggu Persetujuan (PENDING)</option>
            )}
            <option value="ACTIVE" className="text-emerald-800">Aktif (ACTIVE)</option>
            <option value="INACTIVE" className="text-slate-700">Non-Aktif (INACTIVE)</option>
          </select>
          {user.status !== 'PENDING' && (
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Akun yang sudah diverifikasi hanya dapat diubah antara Aktif atau Non-Aktif.
            </span>
          )}
        </div>

        {/* Opsi Reset Password Akun */}
        {currentUserRole === 'AUDIT_PUSAT_ADMIN' && onResetPassword && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Kata Sandi Pengguna</span>
              <span className="text-[11px] text-slate-500">Reset kata sandi jika pengguna lupa sandi akun</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = user;
                onClose();
                onResetPassword(target);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ganti Sandi</span>
            </button>
          </div>
        )}

        {/* Tombol Simpan */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {user.status === 'PENDING' && status === 'ACTIVE'
                ? 'Simpan & Setujui (ACC)'
                : 'Simpan Perubahan'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
