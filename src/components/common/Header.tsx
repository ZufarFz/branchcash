import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from './RoleBadge';
import { Modal } from './Modal';
import { 
  Building2, 
  Landmark,
  Menu,
  Store,
  Coins,
  CreditCard,
  Calculator,
  ShieldCheck,
  History,
  RefreshCw,
  LogOut,
  ArrowLeftRight,
  UserCheck,
  Database,
  Users,
  UserCircle
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  onOpenMobileSidebar
}) => {
  const { 
    currentUser, 
    currentBranch, 
    isSyncing,
    refreshFromSupabase,
    logout
  } = useApp();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Tab label helper for active page indicator
  const getTabInfo = () => {
    switch (activeTab) {
      case 'admin-pusat':
        return { label: 'Dashboard Admin Pusat', icon: ShieldCheck };
      case 'dashboard-cabang':
        return { label: 'Dashboard Cabang', icon: Store };
      case 'input-tunai':
        return { label: 'Input Fisik Uang Tunai', icon: Coins };
      case 'input-non-tunai':
        return { label: 'Input Transaksi Non-Tunai', icon: CreditCard };
      case 'mutasi-kas':
        return { label: 'Pengelolaan Modal & Setor', icon: ArrowLeftRight };
      case 'audit-cabang-pos':
        return { label: 'Rekap & Kas Komputer (POS)', icon: Calculator };
      case 'penunjukan-bandar':
        return { label: 'Penunjukan Kasir Bandar & Sesi', icon: UserCheck };
      case 'perbankan':
        return { label: 'Monitoring Non-Tunai', icon: Landmark };
      case 'audit-log':
        return { label: 'Audit Trail & Log', icon: History };
      case 'master-data':
        return { label: 'Pengelolaan Master Data', icon: Database };
      case 'user-management':
        return { label: 'Manajemen Pengguna', icon: Users };
      case 'profile':
        return { label: 'Profil Pengguna', icon: UserCircle };
      default:
        return { label: 'Dashboard', icon: Store };
    }
  };

  const currentTabInfo = getTabInfo();
  const TabIcon = currentTabInfo.icon;

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setIsLogoutModalOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const branchLabel = currentBranch
    ? currentBranch.city
      ? `${currentBranch.code} • ${currentBranch.city}`
      : currentBranch.code
    : 'Kantor Pusat';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* Left side: Mobile menu button & Clean Page Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                id="btn-mobile-sidebar-toggle"
                type="button"
                onClick={onOpenMobileSidebar}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Buka Menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <TabIcon className="w-4 h-4" />
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  {currentTabInfo.label}
                </h1>
              </div>
            </div>

            {/* Right side: Essential Context Only (Branch, User + Role, Refresh, Logout) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Unified Branch & User Info */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                {/* Branch */}
                <div className="hidden md:flex items-center gap-1.5 text-slate-600">
                  {currentBranch ? (
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <Landmark className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-700 whitespace-nowrap">
                    {branchLabel}
                  </span>
                </div>

                <div className="hidden md:block h-3.5 w-px bg-slate-200" />

                {/* User Name & Role */}
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                  title="Klik untuk membuka Pengaturan Profil"
                >
                  <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                    {currentUser.name}
                  </span>
                  <RoleBadge role={currentUser.role} size="sm" />
                </button>
              </div>

              {/* Refresh Data Button */}
              <button
                id="btn-sync-supabase"
                type="button"
                onClick={() => refreshFromSupabase()}
                disabled={isSyncing}
                className={`p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white cursor-pointer ${
                  isSyncing ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                title="Muat ulang data terbaru"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              {/* Logout Button */}
              <button
                id="btn-header-logout"
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors bg-white cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => !isLoggingOut && setIsLogoutModalOpen(false)}
        title="Konfirmasi Keluar"
        subtitle="Sesi aktif Anda akan diakhiri dan dialihkan ke halaman login"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setIsLogoutModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleConfirmLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Sedang Keluar...' : 'Ya, Keluar'}</span>
            </button>
          </div>
        }
      >
        <div className="py-2 text-slate-700 text-xs leading-relaxed space-y-2">
          <p>
            Apakah Anda yakin ingin keluar dari akun <strong className="text-slate-900">{currentUser.name}</strong>?
          </p>
        </div>
      </Modal>
    </>
  );
};

