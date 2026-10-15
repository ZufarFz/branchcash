import React, { useState } from 'react';
import { Branch, UserRole } from '../../../../types';
import { adminAccountActionService } from '../../../../services/supabase/adminAccountActionService';
import { UserPlus, Lock, Eye, EyeOff, X, Building2, AlertCircle } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  branches: Branch[];
  currentUserRole?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  branches,
  currentUserRole,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('KASIR');
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBranchRole = ['KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG'].includes(role);
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username minimal harus terdiri dari 3 karakter alfanumerik.');
      return;
    }

    if (isBranchRole && !branchId) {
      setError('Peran cabang wajib memilih cabang penempatan.');
      return;
    }

    if (!password.trim() || password.trim().length < 6) {
      setError('Password minimal harus terdiri dari 6 karakter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await adminAccountActionService.createUser({
        username: cleanUsername,
        name: name.trim(),
        role,
        branchId: isBranchRole ? branchId : undefined,
        password: password.trim(),
      });

      if (res.success) {
        onSuccess(`Pengguna @${cleanUsername} berhasil didaftarkan dan langsung aktif.`);
        handleClose();
      } else {
        setError(res.error || 'Gagal mendaftarkan akun pengguna.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setUsername('');
    setRole('KASIR');
    setBranchId(branches[0]?.id || '');
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tambah Pengguna Baru</h3>
              <p className="text-[11px] text-slate-500 font-medium">Buat akun tunggal langsung berstatus aktif</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Username Akun</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-mono">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="budi_kasir"
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all font-mono"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Hanya huruf kecil, angka, garis bawah, dan titik</span>
          </div>

          {/* Peran / Role */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Peran (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all cursor-pointer font-medium"
            >
              <option value="KASIR">Kasir (Cabang)</option>
              <option value="SPV">SPV / Supervisor (Cabang)</option>
              <option value="KEPALA_CABANG">Kepala Cabang (Cabang)</option>
              <option value="AUDIT_CABANG">Audit Cabang (POS & Bandar)</option>
              <option value="PERBANKAN">Perbankan (Kantor Pusat)</option>
              <option value="AUDIT_PUSAT">Audit Pusat (Kantor Pusat)</option>
              {currentUserRole === 'AUDIT_PUSAT_ADMIN' && (
                <option value="AUDIT_PUSAT_ADMIN">Super Admin (Kantor Pusat)</option>
              )}
            </select>
          </div>

          {/* Cabang Penempatan */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cabang Penempatan</label>
            {isBranchRole ? (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all cursor-pointer font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5" />
                <span>Kantor Pusat (Tanpa Cabang)</span>
              </div>
            )}
          </div>

          {/* Password Awal */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password Awal</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Akun yang dibuat langsung berstatus Aktif tanpa menunggu persetujuan.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Mendaftarkan...' : 'Daftarkan Pengguna'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
