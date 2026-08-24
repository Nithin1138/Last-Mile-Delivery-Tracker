import React, { useState, useEffect } from 'react';
import { adminApi, extractErrorMessage } from '../api/client';
import { DashboardMetrics } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  ShieldAlert, 
  Users, 
  Clock, 
  Package, 
  Activity, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  Compass,
  Zap
} from 'lucide-react';

interface Props {
  onNavigateToOrders: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigateToOrders }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      setMetrics(data);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#8A919C] dark:text-[#737A84] text-xs flex flex-col items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-[11px]">Connecting to operations stream...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] p-6 rounded-2xl text-[#B54848] dark:text-[#D56B6B] text-xs shadow-xs">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    );
  }

  const unassignedCount = metrics.orders_by_status?.CREATED || 0;
  const failedCount = (metrics.orders_by_status?.FAILED || 0) + (metrics.orders_by_status?.RESCHEDULED || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Order Detail Modal for Clicked Audit Stream Shipments */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Action Banner for Urgent Dispatches */}
      {unassignedCount > 0 && (
        <div className="bg-[#FAF3E8] dark:bg-[#292014] border border-[#F2DEBF] dark:border-[#42321D] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F2DEBF] dark:bg-[#42321D] text-[#A66A16] dark:text-[#D19A4A]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                <span>Dispatch Attention Required:</span>
                <span className="font-mono text-[#A66A16] dark:text-[#D19A4A] bg-white dark:bg-[#181C20] px-1.5 py-0.5 rounded border border-[#F2DEBF] dark:border-[#42321D]">
                  {unassignedCount} shipment{unassignedCount > 1 ? 's' : ''} awaiting courier assignment
                </span>
              </div>
              <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
                Automated assignment engine can match nearest available couriers immediately.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToOrders}
            className="stripe-btn-primary text-xs py-2 px-3.5 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Open Dispatch Queue</span>
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E5E9] dark:border-[#2B3138]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E] px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878] animate-pulse" />
              Live Agents Active
            </span>
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            System throughput, automated dispatch allocation, and real-time SLA metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMetrics(false)}
            disabled={isRefreshing}
            className="text-xs bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] border border-[#E2E5E9] dark:border-[#2B3138] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3 h-3 text-[#5F6672] dark:text-[#A7ADB5] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shipments */}
        <div className="stripe-card rounded-2xl p-5 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5] uppercase tracking-wider">Total Volume</span>
            <div className="p-1.5 rounded-lg bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#171A1F] dark:text-[#E8EAED] font-mono">
            {metrics.total_orders}
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] flex items-center gap-1.5 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
            <span className="font-mono font-bold text-[#3157A6] dark:text-[#6D8ED4] bg-[#EBF1FA] dark:bg-[#182232] px-1.5 py-0.2 rounded border border-[#D0DEF2] dark:border-[#25354E]">
              {unassignedCount}
            </span>
            <span>in dispatch queue</span>
          </div>
        </div>

        {/* Delivered Today */}
        <div className="stripe-card rounded-2xl p-5 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5] uppercase tracking-wider">Delivered Today</span>
            <div className="p-1.5 rounded-lg bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#287A55] dark:text-[#55A878] font-mono">
            {metrics.delivered_today}
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] flex items-center gap-1.5 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
            <span className="font-mono font-bold text-[#287A55] dark:text-[#55A878]">
              {metrics.orders_by_status?.DELIVERED || 0}
            </span>
            <span>lifetime fulfilled</span>
          </div>
        </div>

        {/* Failed Today */}
        <div className="stripe-card rounded-2xl p-5 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5] uppercase tracking-wider">Attempt Exceptions</span>
            <div className="p-1.5 rounded-lg bg-[#FAF0F0] dark:bg-[#2B1717] text-[#B54848] dark:text-[#D56B6B] border border-[#F2D0D0] dark:border-[#432323]">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#B54848] dark:text-[#D56B6B] font-mono">
            {metrics.failed_today}
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] flex items-center gap-1.5 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
            <span className="font-mono font-bold text-[#A66A16] dark:text-[#D19A4A]">
              {metrics.orders_by_status?.RESCHEDULED || 0}
            </span>
            <span>auto-rescheduled for retry</span>
          </div>
        </div>

        {/* Agent Fleet */}
        <div className="stripe-card rounded-2xl p-5 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5] uppercase tracking-wider">Agents Online</span>
            <div className="p-1.5 rounded-lg bg-[#EBF1FA] dark:bg-[#182232] text-[#426B9E] dark:text-[#7095C4] border border-[#D0DEF2] dark:border-[#25354E]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#171A1F] dark:text-[#E8EAED] font-mono">
            {metrics.agents?.AVAILABLE || 0} <span className="text-sm text-[#8A919C] dark:text-[#737A84] font-normal font-sans">/ {metrics.total_agents} active</span>
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] flex items-center gap-1.5 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
            <span className="font-mono text-[#171A1F] dark:text-[#E8EAED] font-medium">{metrics.agents?.BUSY || 0} on delivery run</span>
            <span>·</span>
            <span className="font-mono text-[#5F6672] dark:text-[#A7ADB5]">{metrics.agents?.OFFLINE || 0} offline</span>
          </div>
        </div>
      </div>

      {/* Lifecycle Status Distribution Grid */}
      <div className="stripe-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
              Pipeline Lifecycle Distribution
            </h2>
            <p className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">Click any stage to view matching shipments in pipeline.</p>
          </div>
          <span className="text-[11px] text-[#8A919C] dark:text-[#737A84] font-mono">8 Pipeline Stages</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
          {[
            'CREATED',
            'ASSIGNED',
            'PICKED_UP',
            'IN_TRANSIT',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'FAILED',
            'RESCHEDULED',
          ].map((st) => {
            const count = metrics.orders_by_status[st] || 0;
            const hasVolume = count > 0;
            return (
              <div 
                key={st} 
                onClick={onNavigateToOrders}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                  hasVolume
                    ? 'bg-white dark:bg-[#181C20] border-[#3157A6]/50 dark:border-[#6D8ED4]/60 shadow-xs hover:border-[#3157A6] dark:hover:border-[#6D8ED4]'
                    : 'bg-[#F7F8FA] dark:bg-[#14171A] border-[#E2E5E9]/70 dark:border-[#2B3138]/70 opacity-60 hover:opacity-100 hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328]'
                }`}
              >
                <div className={`font-mono text-xl font-bold ${
                  hasVolume ? 'text-[#3157A6] dark:text-[#6D8ED4]' : 'text-[#8A919C] dark:text-[#737A84]'
                }`}>
                  {count}
                </div>
                <div>
                  <StatusBadge status={st} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Audit & Event Stream */}
      <div className="stripe-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
              Live Audit & Event Stream
            </h2>
          </div>
          <button
            onClick={onNavigateToOrders}
            className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            All Shipments <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {metrics.recent_activity.map((act) => (
            <div
              key={act.id}
              onClick={() => setSelectedOrderId(act.order_id)}
              className="px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#3157A6] dark:hover:border-[#6D8ED4] bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] flex flex-wrap items-center justify-between gap-3 text-xs transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[#5F6672] dark:text-[#A7ADB5] font-bold text-[11px] bg-[#F1F3F5] dark:bg-[#1E2328] px-1.5 py-0.5 rounded border border-[#E2E5E9] dark:border-[#2B3138] group-hover:text-[#3157A6] dark:group-hover:text-[#6D8ED4] group-hover:border-[#3157A6]/40 transition-colors">
                  #{act.order_id.slice(0, 8)}
                </span>
                <StatusBadge status={act.new_status} size="sm" />
                {act.reason && (
                  <span className="text-[#171A1F] dark:text-[#E8EAED] truncate max-w-md font-medium text-[11px]">
                    "{act.reason}"
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#8A919C] dark:text-[#737A84]">
                {act.actor_name && (
                  <span>
                    By: <strong className="text-[#171A1F] dark:text-[#E8EAED] font-semibold">{act.actor_name}</strong>
                  </span>
                )}
                <span className="font-mono">
                  {new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-[#3157A6] dark:text-[#6D8ED4] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px]">
                  View shipment <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
