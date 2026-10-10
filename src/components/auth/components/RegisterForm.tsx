import React, { useState, useEffect } from 'react';
import { UserRole, Branch } from '../../../types';
import { Clock } from 'lucide-react';

interface RegisterFormProps {
  branches: Branch[];
  isLoading: boolean;
  onSubmit: (params: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    branchId?: string;
  }) => void;
  onError: (msg: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  branches,
  isLoading,
  onSubmit,
  onError,
}) => {
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('KASIR');
  const [regBranchId, setRegBranchId] = useState<string>(branches[0]?.id || '');

  // Otomatis pilih cabang pertama saat daftar branches berhasil dimuat
  useEffect(() => {
    if (!regBranchId && branches.length > 0) {
      setRegBranchId(branches[0].id);
    }
  }, [branches, regBranchId]);

  const isBranchRole = ['KASIR', 'SPV', 'KEPALA_CABANG', 'AUDIT_CABANG'].includes(regRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      onError('Semua kolom formulir pendaftaran wajib diisi.');
      return;
    }

    if (regPassword.length < 6) {
      onError('Password minimal harus 6 karakter.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      onError('Konfirmasi password tidak cocok.');
      return;
    }

    if (isBranchRole && !regBranchId) {
      onError('Pilih cabang tempat Anda bertugas.');
      return;
    }

    onSubmit({
      name: regName.trim(),
      username: regUsername.trim().toLowerCase(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
      branchId: isBranchRole ? regBranchId : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Akun baru wajib disetujui (ACC) oleh Administrator sebelum aktif.</span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Nama Lengkap
        </label>
        <input
          type="text"
          required
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
          placeholder="Nama Lengkap"
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Username
          </label>
          <input
            type="text"
            required
            value={regUsername}
            onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            placeholder="username"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            placeholder="email@kantor.com"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Peran (Role)
          </label>
          <select
            value={regRole}
            onChange={(e) => setRegRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none"
          >
            <option value="KASIR">Kasir Cabang</option>
            <option value="SPV">Supervisor (SPV)</option>
            <option value="KEPALA_CABANG">Kepala Cabang</option>
            <option value="AUDIT_CABANG">Audit Cabang (POS)</option>
            <option value="PERBANKAN">Perbankan (Pusat)</option>
            <option value="AUDIT_PUSAT">Audit Pusat</option>
          </select>
        </div>

        {isBranchRole && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cabang
            </label>
            <select
              value={regBranchId}
              onChange={(e) => setRegBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none"
            >
              {branches.length === 0 ? (
                <option value="">Memuat cabang...</option>
              ) : (
                branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            placeholder="Min 6 kar"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ulangi Password
          </label>
          <input
            type="password"
            required
            value={regConfirmPassword}
            onChange={(e) => setRegConfirmPassword(e.target.value)}
            placeholder="Konfirmasi"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span>Ajukan Pendaftaran</span>
        )}
      </button>
    </form>
  );
};
