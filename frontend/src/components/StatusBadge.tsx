import React from 'react';
import { CheckCircle2, Check, AlertTriangle, AlertOctagon } from 'lucide-react';
import { ProgressStatus } from '../types';

interface StatusBadgeProps {
  status: ProgressStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const getStyle = () => {
    switch (status) {
      case 'COMPLETE':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'ON TRACK':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Check className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'TIGHT':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'DANGER':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: null,
        };
    }
  };

  const style = getStyle();
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${sizeClasses}`}
    >
      {showIcon && style.icon}
      <span>{status}</span>
    </span>
  );
};
