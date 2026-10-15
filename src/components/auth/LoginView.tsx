import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { Landmark, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, register, branches } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (identifier: string, pass: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await login(identifier, pass);
      if (!res.success) {
        setErrorMessage(res.error || 'Username atau password salah.');
      } else {
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal masuk sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (params: any) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await register(params);
      if (!res.success) {
        setErrorMessage(res.error || 'Pendaftaran gagal.');
      } else {
        setSuccessMessage(
          'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan (ACC) dari Administrator. Silakan hubungi admin cabang/pusat Anda.'
        );
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat mendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-6 sm:p-8 border border-slate-200">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 mb-3">
            <Landmark className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">BranchCash</h1>
          <p className="text-xs text-slate-500 mt-1">Sistem Rekonsiliasi Kas Cabang</p>
        </div>

        {/* Segmented tab switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Feedback message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Forms */}
        {mode === 'login' ? (
          <LoginForm isLoading={isLoading} onSubmit={handleLogin} />
        ) : (
          <RegisterForm
            branches={branches}
            isLoading={isLoading}
            onSubmit={handleRegister}
            onError={(msg) => setErrorMessage(msg)}
          />
        )}
      </div>
    </div>
  );
};
