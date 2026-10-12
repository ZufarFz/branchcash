import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from '../common/RoleBadge';
import { 
  UserCircle, 
  Lock, 
  KeyRound, 
  Building2, 
  Mail, 
  AtSign, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, currentBranch, updateProfile, isSyncing } = useApp();

  const [name, setName] = useState(currentUser.name);
  const [currentPasswordForName, setCurrentPasswordForName] = useState('');

  const [currentPasswordForPass, setCurrentPasswordForPass] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('Nama lengkap tidak boleh kosong.', 'error');
      return;
    }
    if (!currentPasswordForName.trim()) {
      showNotification('Masukkan kata sandi saat ini untuk konfirmasi.', 'error');
      return;
    }
    setIsUpdatingName(true);
    try {
      const res = await updateProfile(name.trim(), currentPasswordForName.trim());
      if (res.success) {
        setCurrentPasswordForName('');
        showNotification('Nama profil berhasil diperbarui.', 'success');
      } else {
        showNotification(res.error || 'Gagal memperbarui nama profil.', 'error');
      }
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordForPass.trim()) {
      showNotification('Masukkan kata sandi lama untuk konfirmasi.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showNotification('Kata sandi baru minimal harus 6 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Konfirmasi kata sandi tidak cocok.', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await updateProfile(currentUser.name, currentPasswordForPass.trim(), newPassword.trim());
      if (res.success) {
        setCurrentPasswordForPass('');
        setNewPassword('');
        setConfirmPassword('');
        showNotification('Kata sandi berhasil diperbarui.', 'success');
      } else {
        showNotification(res.error || 'Gagal memperbarui kata sandi.', 'error');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <UserCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Profil Pengguna</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola nama lengkap dan keamanan kata sandi akun Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="cursor-pointer font-bold">×</button>
        </div>
      )}

      {/* Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
                <RoleBadge role={currentUser.role} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">@{currentUser.username || 'username'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ● Akun Aktif
            </span>
          </div>
        </div>

        {/* Readonly Account Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5" /> Username
              </span>
              <Lock className="w-3.5 h-3.5 text-slate-400" title="Username terkunci permanen" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-800">@{currentUser.username}</p>
            <p className="text-[10px] text-slate-400 mt-1 italic">Permanen (Anti-Fraud)</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.email}</p>
            <p className="text-[10px] text-slate-400 mt-1 italic">Identitas Login</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Unit Penempatan
              </span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              {currentBranch ? `${currentBranch.code} - ${currentBranch.name}` : 'Kantor Pusat'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 italic">Dikelola Audit Pusat</p>
          </div>
        </div>
      </div>

      {/* Forms Section: Change Name & Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form 1: Ubah Nama Lengkap */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Ubah Nama Lengkap</h3>
          </div>

          <form onSubmit={handleSaveName} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Baru</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap Anda"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Saat Ini <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPasswordForName}
                onChange={(e) => setCurrentPasswordForName(e.target.value)}
                placeholder="Konfirmasi kata sandi Anda"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">Wajib dimasukkan untuk verifikasi keamanan perubahan data.</p>
            </div>

            <button
              type="submit"
              disabled={isUpdatingName || isSyncing}
              className="w-full py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUpdatingName ? 'Memverifikasi & Menyimpan...' : 'Simpan Nama Lengkap'}
            </button>
          </form>
        </div>

        {/* Form 2: Ubah Kata Sandi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Ubah Kata Sandi</h3>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Lama (Saat Ini) <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPasswordForPass}
                onChange={(e) => setCurrentPasswordForPass(e.target.value)}
                placeholder="Kata sandi saat ini"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword || isSyncing}
              className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUpdatingPassword ? 'Memverifikasi & Mengganti...' : 'Ganti Kata Sandi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
