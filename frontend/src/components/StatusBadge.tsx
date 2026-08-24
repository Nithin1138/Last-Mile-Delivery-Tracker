import React from 'react';
import { OrderStatus } from '../types';
import { Check, AlertTriangle, Clock, RefreshCw, XCircle, Truck, Package, UserCheck } from 'lucide-react';

interface Props {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

const statusConfig: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    label: string;
    icon?: React.ReactNode;
    isLive?: boolean;
  }
> = {
  CREATED: {
    bg: 'bg-[#F1F3F5] dark:bg-[#1E2328]',
    text: 'text-[#5F6672] dark:text-[#A7ADB5]',
    border: 'border-[#E2E5E9] dark:border-[#2B3138]',
    dot: 'bg-[#8A919C] dark:bg-[#737A84]',
    label: 'Created',
    isLive: true,
  },
  ASSIGNED: {
    bg: 'bg-[#EBF1FA] dark:bg-[#182232]',
    text: 'text-[#3157A6] dark:text-[#6D8ED4]',
    border: 'border-[#D0DEF2] dark:border-[#25354E]',
    dot: 'bg-[#3157A6] dark:bg-[#6D8ED4]',
    label: 'Assigned',
    isLive: true,
  },
  PICKED_UP: {
    bg: 'bg-[#EBF1FA] dark:bg-[#182232]',
    text: 'text-[#3157A6] dark:text-[#6D8ED4]',
    border: 'border-[#D0DEF2] dark:border-[#25354E]',
    dot: 'bg-[#3157A6] dark:bg-[#6D8ED4]',
    label: 'Picked Up',
    isLive: true,
  },
  IN_TRANSIT: {
    bg: 'bg-[#EBF1FA] dark:bg-[#182232]',
    text: 'text-[#3157A6] dark:text-[#6D8ED4]',
    border: 'border-[#D0DEF2] dark:border-[#25354E]',
    dot: 'bg-[#3157A6] dark:bg-[#6D8ED4]',
    label: 'In Transit',
    isLive: true,
  },
  OUT_FOR_DELIVERY: {
    bg: 'bg-[#EBF1FA] dark:bg-[#182232]',
    text: 'text-[#3157A6] dark:text-[#6D8ED4]',
    border: 'border-[#D0DEF2] dark:border-[#25354E]',
    dot: 'bg-[#3157A6] dark:bg-[#6D8ED4]',
    label: 'Out for Delivery',
    isLive: true,
  },
  DELIVERED: {
    bg: 'bg-[#EAF5F0] dark:bg-[#16271E]',
    text: 'text-[#287A55] dark:text-[#55A878]',
    border: 'border-[#C8E5D6] dark:border-[#203D2E]',
    dot: 'bg-[#287A55] dark:bg-[#55A878]',
    label: 'Delivered',
  },
  FAILED: {
    bg: 'bg-[#FAF0F0] dark:bg-[#2B1717]',
    text: 'text-[#B54848] dark:text-[#D56B6B]',
    border: 'border-[#F2D0D0] dark:border-[#432323]',
    dot: 'bg-[#B54848] dark:bg-[#D56B6B]',
    label: 'Failed',
  },
  RESCHEDULED: {
    bg: 'bg-[#FAF3E8] dark:bg-[#292014]',
    text: 'text-[#A66A16] dark:text-[#D19A4A]',
    border: 'border-[#F2DEBF] dark:border-[#42321D]',
    dot: 'bg-[#A66A16] dark:bg-[#D19A4A]',
    label: 'Rescheduled',
    isLive: true,
  },
  CANCELLED: {
    bg: 'bg-[#F1F3F5] dark:bg-[#1E2328]',
    text: 'text-[#5F6672] dark:text-[#737A84]',
    border: 'border-[#E2E5E9] dark:border-[#2B3138]',
    dot: 'bg-[#8A919C] dark:bg-[#737A84]',
    label: 'Cancelled',
  },
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md', showPulse = true }) => {
  const config = statusConfig[status] || {
    bg: 'bg-[#F1F3F5] dark:bg-[#1E2328]',
    text: 'text-[#5F6672] dark:text-[#737A84]',
    border: 'border-[#E2E5E9] dark:border-[#2B3138]',
    dot: 'bg-[#8A919C] dark:bg-[#737A84]',
    label: status,
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-medium leading-none',
    md: 'px-2.5 py-1 text-xs font-semibold leading-none',
    lg: 'px-3 py-1.5 text-xs font-semibold leading-none',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} select-none shrink-0 transition-colors`}
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
