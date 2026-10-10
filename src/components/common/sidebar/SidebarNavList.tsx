import React from 'react';
import { MenuSectionConfig, SidebarTab } from './sidebarMenuConfig';

interface SidebarNavListProps {
  sections: MenuSectionConfig[];
  activeTab: string;
  isCollapsed: boolean;
  onSelectTab: (tab: SidebarTab) => void;
  onCloseMobile: () => void;
}

export const SidebarNavList: React.FC<SidebarNavListProps> = ({
  sections,
  activeTab,
  isCollapsed,
  onSelectTab,
  onCloseMobile,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-1">
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? 'opacity-0 max-h-0 py-0' : 'opacity-100 max-h-6 px-3 py-1'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap block">
              {section.title}
            </span>
          </div>

          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`sidebar-item-${item.id}`}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (window.innerWidth < 1024) {
                      onCloseMobile();
                    }
                  }}
                  title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon
                      className={`w-5 h-5 transition-transform ${
                        isActive 
                          ? 'text-white' 
                          : 'text-slate-500 group-hover:text-indigo-600'
                      }`}
                    />
                    {isCollapsed && item.badge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                    )}
                  </div>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden flex-1 min-w-0 ${
                      isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                      <span className="text-xs truncate block leading-tight font-medium">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 leading-none ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] truncate block mt-0.5 leading-none ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
