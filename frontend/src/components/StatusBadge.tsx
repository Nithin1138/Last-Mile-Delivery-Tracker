import React from 'react';
import { OrderStatus } from '../types';

interface Props {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CREATED: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-700/50',
    label: 'Created / Pending',
  },
  ASSIGNED: {
    bg: 'bg-blue-950/40',
    text: 'text-blue-400',
    border: 'border-blue-700/50',
    label: 'Assigned to Agent',
  },
  PICKED_UP: {
    bg: 'bg-indigo-950/40',
    text: 'text-indigo-400',
    border: 'border-indigo-700/50',
    label: 'Picked Up',
  },
  IN_TRANSIT: {
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-400',
    border: 'border-cyan-700/50',
    label: 'In Transit',
  },
  OUT_FOR_DELIVERY: {
    bg: 'bg-purple-950/40',
    text: 'text-purple-400',
    border: 'border-purple-700/50',
    label: 'Out for Delivery',
  },
  DELIVERED: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-700/50',
    label: 'Delivered',
  },
  FAILED: {
    bg: 'bg-rose-950/40',
    text: 'text-rose-400',
    border: 'border-rose-700/50',
    label: 'Delivery Failed',
  },
  RESCHEDULED: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
    border: 'border-orange-700/50',
    label: 'Rescheduled',
  },
  CANCELLED: {
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    border: 'border-slate-700',
    label: 'Cancelled',
  },
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    label: status,
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-')}`} />
      {config.label}
    </span>
  );
};
