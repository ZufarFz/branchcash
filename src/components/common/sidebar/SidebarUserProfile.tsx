import React from 'react';
import { User, Branch } from '../../../types';
import { RoleBadge } from '../RoleBadge';
import { LogOut } from 'lucide-react';

interface SidebarUserProfileProps {
  currentUser: User;
  currentBranch: Branch | null;
  isCollapsed: boolean;
  onOpenLogoutModal: () => void;
}

export const SidebarUserProfile: React.FC<SidebarUserProfileProps> = ({
  currentUser,
  currentBranch,
  isCollapsed,
  onOpenLogoutModal,
}) => {
  return (
    <div className="p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs border border-indigo-400/30 text-xs">
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <span className="font-semibold text-slate-100 text-xs truncate block" title={currentUser.name}>
                {currentUser.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RoleBadge role={currentUser.role} size="sm" />
                {currentBranch && (
                  <span className="text-[10px] text-slate-400 font-mono truncate" title={currentBranch.name}>
                    • {currentBranch.code}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          id="btn-sidebar-logout"
          type="button"
          onClick={onOpenLogoutModal}
          title="Keluar Sesi (Logout)"
          className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-all cursor-pointer ${
            isCollapsed ? 'mt-2 w-8 h-8 flex items-center justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
