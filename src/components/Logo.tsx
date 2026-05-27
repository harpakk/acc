/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  // Dimensions based on size
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-20 h-20'
  };

  const textStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-black'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`} dir="rtl">
      {/* Exquisite Vector-based Shadi Avaran Logo */}
      <div className={`${dimensions[size]} relative shrink-0 overflow-visible`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md animate-pulse-subtle"
        >
          {/* Main Bubble Orange Circle representing playtime, boardgame disks, and joy */}
          <circle cx="50" cy="50" r="42" className="fill-orange-500" />
          
          {/* Playful layered yellow secondary bubbles */}
          <circle cx="30" cy="35" r="14" className="fill-amber-400" />
          <circle cx="72" cy="70" r="12" className="fill-orange-600 opacity-60" />
          <circle cx="75" cy="30" r="10" className="fill-yellow-300" />
          
          {/* Smiling curves of boardgame path */}
          <path 
            d="M 30 68 Q 50 82 70 68" 
            stroke="#ffffff" 
            strokeWidth="5" 
            strokeLinecap="round" 
            fill="none" 
          />

          {/* Sparkles of entertainment & delight */}
          <path 
            d="M 45 45 L 50 25 L 55 45 L 75 50 L 55 55 L 50 75 L 45 55 L 25 50 Z" 
            fill="#ffffff" 
          />
          
          {/* Little center focal point circle */}
          <circle cx="50" cy="50" r="4.5" className="fill-orange-500" />
        </svg>
      </div>

      {size !== 'lg' && (
        <div className="flex flex-col text-right">
          <span className="text-white font-black tracking-tight leading-tight select-none">
            شادی آوران
          </span>
          <span className="text-[9px] text-slate-400 font-bold tracking-tighter select-none">
            بستر حسابداری تعاملی
          </span>
        </div>
      )}
    </div>
  );
}
