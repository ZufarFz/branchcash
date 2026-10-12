import React from 'react';
import { UserRole } from '../../types';
import { getRoleDetails } from '../../utils/formatters';

interface RoleBadgeProps {
  role: UserRole;
  showTag?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showTag = false, size = 'md' }) => {
  const details = getRoleDetails(role) || {
    label: (role as string) || 'Pengguna',
    tag: 'Sistem',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Pengguna sistem',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${details.color} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{details.label}</span>
      {showTag && (
        <span className="opacity-70 text-[10px] uppercase tracking-wider font-semibold ml-0.5">
          ({details.tag})
        </span>
      )}
    </span>
  );
};
