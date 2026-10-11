import React from 'react';

interface ProgressBarProps {
  coveredHours: number;
  totalHours: number;
  percentage: number;
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  coveredHours,
  totalHours,
  percentage,
  height = 'md',
  showLabel = true,
}) => {
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const heightClass =
    height === 'sm' ? 'h-1.5' : height === 'lg' ? 'h-3.5' : 'h-2.5';

  const getColorClass = () => {
    if (safePercentage >= 99.9) return 'bg-emerald-500';
    if (safePercentage >= 65) return 'bg-blue-600';
    if (safePercentage >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5 font-medium">
          <span>
            {coveredHours.toFixed(1)}h / {totalHours.toFixed(1)}h taught
          </span>
          <span className="font-semibold text-slate-900">{percentage.toFixed(2)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${getColorClass()} h-full transition-all duration-300 rounded-full`}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
};
