import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { isTabAuthorized } from '../../utils/rbac';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { SidebarTab, getSidebarMenuSections } from './sidebar/sidebarMenuConfig';
import { SidebarNavList } from './sidebar/SidebarNavList';
import { SidebarUserProfile } from './sidebar/SidebarUserProfile';
import { LogoutConfirmModal } from './sidebar/LogoutConfirmModal';

export type { SidebarTab };

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: SidebarTab) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse
}) => {
  const { currentUser, currentBranch, reports, auditLogs, cashTransfers, allUsers, logout } = useApp();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Metrics for badges
  const pendingApprovalCount = reports.filter((r) => r.status === 'DRAFT').length;
  const allNonCashCount = reports.reduce((acc, r) => acc + r.nonCashTransactions.length, 0);
  const totalAuditLogs = auditLogs.length;
  const pendingTransferConfirmCount = (cashTransfers || []).filter(
    (t) => t.userId === currentUser.id && t.direction === 'IN' && t.status === 'PENDING'
  ).length;
  const pendingUsersCount = (allUsers || []).filter((u) => u.status === 'PENDING').length;

  const menuSections = getSidebarMenuSections(
    currentUser.role,
    pendingApprovalCount,
    allNonCashCount,
    totalAuditLogs,
    pendingTransferConfirmCount,
    pendingUsersCount
  );

  // Filter out sections where user has no permission
  const authorizedSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isTabAuthorized(currentUser.role, item.id)),
    }))
    .filter((section) => section.items.length > 0);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop-mobile"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-2xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/90 shadow-sm flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-20' : 'lg:w-68'
        } w-72`}
      >
        {/* Sidebar Header */}
        <div
          className={`h-14 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white transition-all duration-300 ${
            isCollapsed ? 'px-2.5' : 'px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 select-none">
              BC
            </div>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[150px]'
              }`}
            >
              <span className="font-extrabold text-sm text-slate-900 tracking-tight block leading-none whitespace-nowrap">
                BranchCash
              </span>
              <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                Sistem Kas Cabang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              id="btn-toggle-sidebar-collapse"
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title={isCollapsed ? 'Perlebar Sidebar' : 'Perkecil Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <button
              id="btn-close-sidebar-mobile"
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Menu List */}
        <SidebarNavList
          sections={authorizedSections}
          activeTab={activeTab}
          isCollapsed={isCollapsed}
          onSelectTab={onSelectTab}
          onCloseMobile={onClose}
        />

        {/* User Profile & Logout */}
        <SidebarUserProfile
          currentUser={currentUser}
          currentBranch={currentBranch}
          isCollapsed={isCollapsed}
          onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        />
      </aside>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmLogout={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />
    </>
  );
};
