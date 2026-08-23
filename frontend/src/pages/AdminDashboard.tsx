import React, { useState, useEffect } from 'react';
import { adminApi, extractErrorMessage } from '../api/client';
import { DashboardMetrics } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LayoutDashboard, CheckCircle2, ShieldAlert, Users, Clock, Package, Activity, RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
  onNavigateToOrders: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigateToOrders }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading real-time operations dashboard...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-rose-950/30 border border-rose-800 p-6 rounded-2xl text-rose-300 text-xs shadow-xl">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            Operations Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time fleet health, delivery lifecycle stats, and system activity.
          </p>
        </div>

        <button
          onClick={() => fetchMetrics(false)}
          disabled={isRefreshing}
          className="text-xs bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-sm cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-slate-900/80 border border-slate-800 card-hover-glow p-5 rounded-2xl shadow-lg space-y-3 backdrop-blur-xl group">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Shipments</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-100">{metrics.total_orders}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            <span className="text-indigo-400 font-bold">{metrics.orders_by_status?.CREATED || 0}</span> awaiting assignment
          </div>
        </div>

        {/* Delivered Today */}
        <div className="bg-slate-900/80 border border-slate-800 card-hover-glow p-5 rounded-2xl shadow-lg space-y-3 backdrop-blur-xl group">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Delivered Today</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-emerald-300">{metrics.delivered_today}</div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="font-semibold text-emerald-400">{metrics.orders_by_status?.DELIVERED || 0}</span> lifetime delivered
          </div>
        </div>

        {/* Failed Today */}
        <div className="bg-slate-900/80 border border-slate-800 card-hover-glow p-5 rounded-2xl shadow-lg space-y-3 backdrop-blur-xl group">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span>Failed Attempts Today</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-rose-300">{metrics.failed_today}</div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="font-semibold text-amber-400">{metrics.orders_by_status?.RESCHEDULED || 0}</span> currently rescheduled
          </div>
        </div>

        {/* Agent Fleet */}
        <div className="bg-slate-900/80 border border-slate-800 card-hover-glow p-5 rounded-2xl shadow-lg space-y-3 backdrop-blur-xl group">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold">
            <span>Fleet Availability</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-cyan-300">
            {metrics.agents?.AVAILABLE || 0} <span className="text-sm text-slate-500 font-normal">/ {metrics.total_agents}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            {metrics.agents?.BUSY || 0} busy · {metrics.agents?.OFFLINE || 0} offline
          </div>
        </div>
      </div>

      {/* Orders By Status Distribution */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Shipment Status Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center text-xs">
          {[
            'CREATED',
            'ASSIGNED',
            'PICKED_UP',
            'IN_TRANSIT',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'FAILED',
            'RESCHEDULED',
          ].map((st) => (
            <div key={st} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 card-hover-subtle space-y-1.5">
              <div className="font-mono text-xl font-bold text-slate-100">{metrics.orders_by_status[st] || 0}</div>
              <div>
                <StatusBadge status={st} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent System Activity Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Recent Business Events & Lifecycle Transitions
          </h2>
          <button
            onClick={onNavigateToOrders}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            View All Orders <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {metrics.recent_activity.map((act) => (
            <div
              key={act.id}
              className="bg-slate-950/60 border border-slate-800/70 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs card-hover-subtle"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 font-semibold text-[11px]">#{act.order_id.slice(0, 8)}</span>
                <StatusBadge status={act.new_status} size="sm" />
                {act.reason && <span className="text-slate-300 truncate max-w-md">"{act.reason}"</span>}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                {act.actor_name && <span>By: <strong className="text-slate-300 font-medium">{act.actor_name}</strong></span>}
                <span className="font-mono text-slate-500">{new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
