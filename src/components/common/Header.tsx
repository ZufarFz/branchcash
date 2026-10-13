import React, { useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from './RoleBadge';
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
  Calendar,
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
  setActiveTab,
  onOpenMobileSidebar
}) => {
  const { 
    currentUser, 
    currentBranch, 
    isSyncing,
    refreshFromSupabase,
    selectedDate,
    setSelectedDate
  } = useApp();

  // Tanggal hari ini (format YYYY-MM-DD lokal)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Pastikan tanggal tidak melebihi hari ini jika bukan di tab penunjukan-bandar
  useEffect(() => {
    if (activeTab !== 'penunjukan-bandar' && selectedDate > todayStr) {
      setSelectedDate(todayStr);
    }
  }, [activeTab, selectedDate, todayStr, setSelectedDate]);

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

  const branchLabel = currentBranch
    ? currentBranch.city
      ? `${currentBranch.code} • ${currentBranch.city}`
      : currentBranch.code
    : 'Kantor Pusat';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Left side: Mobile menu button, Page Title & Date Picker Sejajar */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              id="btn-mobile-sidebar-toggle"
              type="button"
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shrink-0"
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

            {/* Tanggal Picker Sejajar dengan Judul */}
            <div className="flex items-center shrink-0">
              <label
                htmlFor="header-business-date-picker"
                className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                title={activeTab === 'penunjukan-bandar' ? 'Pilih Tanggal Sesi (Bisa Mendatang)' : 'Pilih Tanggal (Maksimal Hari Ini)'}
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden md:inline text-[11px] text-slate-500 font-medium">Tanggal:</span>
                <input
                  id="header-business-date-picker"
                  type="date"
                  value={selectedDate}
                  max={activeTab === 'penunjukan-bandar' ? undefined : todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (activeTab !== 'penunjukan-bandar' && val > todayStr) {
                      setSelectedDate(todayStr);
                    } else {
                      setSelectedDate(val);
                    }
                  }}
                  className="bg-transparent border-none outline-none font-bold text-slate-900 cursor-pointer p-0 text-xs"
                />
              </label>
            </div>
          </div>

          {/* Right side: Essential Context Only (Branch, User + Role, Refresh) - Tombol Keluar Dihapus */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
          </div>
        </div>
      </div>
    </header>
  );
};

