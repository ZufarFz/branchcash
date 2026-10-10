import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar, SidebarTab } from './components/common/Sidebar';
import { CashierView } from './components/cashier/CashierView';
import { AuditCabangView } from './components/audit-cabang/AuditCabangView';
import { BranchReviewView } from './components/branch/BranchReviewView';
import { PerbankanView } from './components/perbankan/PerbankanView';
import { AuditPusatView } from './components/audit-pusat/AuditPusatView';
import { AuditLogView } from './components/audit-pusat/AuditLogView';
import { UnauthorizedView } from './components/common/UnauthorizedView';
import { LoginView } from './components/auth/LoginView';
import { isTabAuthorized, ROLE_PERMISSIONS } from './utils/rbac';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  
  // Navigation tab state initialized to current user's default allowed tab
  const [activeTab, setActiveTab] = useState<SidebarTab>(() => {
    return (ROLE_PERMISSIONS[currentUser.role]?.defaultTab as SidebarTab) || 'admin-pusat';
  });

  // Automatically ensure active tab matches allowed permissions on role change
  useEffect(() => {
    const defaultTab = (ROLE_PERMISSIONS[currentUser.role]?.defaultTab as SidebarTab) || 'admin-pusat';
    if (!isTabAuthorized(currentUser.role, activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [currentUser.role]);

  // Sidebar collapse & mobile drawer states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Handle tab selection strictly keeping current role intact (RBAC enforcement)
  const handleSelectTab = (tab: SidebarTab) => {
    setActiveTab(tab);
  };

  // Render view based on activeTab with RBAC permission guard
  const renderView = () => {
    // Check if current user role is authorized for the selected tab
    if (!isTabAuthorized(currentUser.role, activeTab)) {
      return (
        <UnauthorizedView
          targetTab={activeTab}
          onRedirectToAllowedTab={(target) => setActiveTab(target as SidebarTab)}
        />
      );
    }

    switch (activeTab) {
      case 'admin-pusat':
        return <AuditPusatView onNavigateToAuditLog={() => setActiveTab('audit-log')} />;
      case 'dashboard-cabang':
        return <BranchReviewView />;
      case 'input-tunai':
        return <CashierView initialMode="cash" />;
      case 'input-non-tunai':
        return <CashierView initialMode="non-cash" />;
      case 'mutasi-kas':
        if (currentUser.role === 'AUDIT_CABANG' || currentUser.role === 'AUDIT_PUSAT') {
          return <AuditCabangView initialTab="mutasi" />;
        }
        return <CashierView initialMode="transfers" />;
      case 'audit-cabang-pos':
        return <AuditCabangView initialTab="rekap" />;
      case 'penunjukan-bandar':
        return <AuditCabangView initialTab="bandar" />;
      case 'perbankan':
        return <PerbankanView />;
      case 'audit-log':
        return <AuditLogView />;
      default:
        return <AuditPusatView onNavigateToAuditLog={() => setActiveTab('audit-log')} />;
    }
  };

  // Determine desktop padding offset for the left sidebar
  const getSidebarOffsetClass = () => {
    if (isSidebarCollapsed) return 'lg:pl-20';
    return 'lg:pl-68';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Left Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area with dynamic left padding */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${getSidebarOffsetClass()}`}>
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => handleSelectTab(tab as SidebarTab)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Memeriksa Sesi Autentikasi Supabase...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
