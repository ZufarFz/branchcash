import React from 'react';
import { ReportStatus, MatchStatus } from '../../types';
import { getStatusDetails } from '../../utils/formatters';

interface StatusBadgeProps {
  status: ReportStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const details = getStatusDetails(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border ${details.color} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${details.dotColor}`} />
      <span>{details.label}</span>
    </span>
  );
};

interface MatchStatusBadgeProps {
  status: MatchStatus;
  size?: 'sm' | 'md';
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs = {
    MATCHED: {
      label: 'Sudah Cocok',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    UNMATCHED: {
      label: 'Belum Cocok / Beda',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
    PENDING: {
      label: 'Belum Diverifikasi',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
  };

  const cfg = configs[status];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${cfg.color} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
};
