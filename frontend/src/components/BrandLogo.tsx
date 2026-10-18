import React from 'react';

interface BrandLogoProps {
  markSize?: number;
  className?: string;
  showTagline?: boolean;
  inverse?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  markSize = 42,
  className = '',
  showTagline = false,
  inverse = false,
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <svg
      aria-hidden="true"
      width={markSize}
      height={markSize}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M24 7.5 10 16v16l14 8.5L38 32V16L24 7.5Z"
        stroke={inverse ? '#ffffff' : '#000a28'}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="m10 16 14 8.5L38 16M24 24.5v16M10 32l14-7.5L38 32M17 12l14 24M31 12 17 36"
        stroke={inverse ? '#ffffff' : '#000a28'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="7.5" r="3.3" fill={inverse ? '#ffffff' : '#000a28'} />
      <circle cx="10" cy="16" r="3.3" fill={inverse ? '#ffffff' : '#000a28'} />
      <circle cx="38" cy="16" r="3.3" fill={inverse ? '#ffffff' : '#000a28'} />
      <circle cx="10" cy="32" r="3.3" fill={inverse ? '#ffffff' : '#000a28'} />
      <circle cx="38" cy="32" r="3.3" fill={inverse ? '#ffffff' : '#000a28'} />
      <circle cx="24" cy="40.5" r="3.3" fill={inverse ? '#ffffff' : '#000a28'} />
      <circle
        cx="24"
        cy="24.5"
        r="3.6"
        fill="#4361ee"
        stroke={inverse ? '#000a28' : '#ffffff'}
        strokeWidth="1.5"
      />
    </svg>
    <div className="min-w-0">
      <div
        className={`font-bold leading-tight tracking-tight text-sm sm:text-base ${
          inverse ? 'text-white' : 'text-slate-900'
        }`}
      >
        Mirai School of Technology
      </div>
      {showTagline && (
        <div
          className={`mt-1 text-xs font-medium tracking-wide ${
            inverse ? 'text-blue-100/75' : 'text-slate-500'
          }`}
        >
          Learn · Build · Lead
        </div>
      )}
    </div>
  </div>
);
