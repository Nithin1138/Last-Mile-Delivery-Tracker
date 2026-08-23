import React from 'react';
import { OrderStatus } from '../types';

interface Props {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; label: string; isLive?: boolean }> = {
  CREATED: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'Created / Pending',
    isLive: true,
  },
  ASSIGNED: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    label: 'Assigned to Agent',
    isLive: true,
  },
  PICKED_UP: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-400',
    label: 'Picked Up',
    isLive: true,
  },
  IN_TRANSIT: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
    label: 'In Transit',
    isLive: true,
  },
  OUT_FOR_DELIVERY: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
    label: 'Out for Delivery',
    isLive: true,
  },
  DELIVERED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    label: 'Delivered',
  },
  FAILED: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
    label: 'Delivery Failed',
  },
  RESCHEDULED: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400',
    label: 'Rescheduled',
    isLive: true,
  },
  CANCELLED: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-400',
    border: 'border-slate-700/80',
    dot: 'bg-slate-500',
    label: 'Cancelled',
  },
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md', showPulse = true }) => {
  const config = statusConfig[status] || {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700/80',
    dot: 'bg-slate-400',
    label: status,
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-bold',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} backdrop-blur-sm shadow-sm transition-all`}
    >
      <span className="relative flex items-center justify-center">
        {showPulse && config.isLive && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full ${config.dot} ${dotSizes[size]}`} />
      </span>
      <span>{config.label}</span>
    </span>
  );
};
