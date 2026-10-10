import React from 'react';
import { getVarianceInfo } from '../../utils/formatters';

interface VarianceBadgeProps {
  variance: number | null;
  size?: 'sm' | 'md';
}

export const VarianceBadge: React.FC<VarianceBadgeProps> = ({ variance, size = 'md' }) => {
  const info = getVarianceInfo(variance);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border ${info.bgText} ${sizeClasses}`}
    >
      <span>{info.label}</span>
    </span>
  );
};
