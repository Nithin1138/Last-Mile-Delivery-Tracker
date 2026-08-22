import React, { useState, useEffect } from 'react';
import { adminApi, extractErrorMessage } from '../api/client';
import { DashboardMetrics } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LayoutDashboard, CheckCircle2, ShieldAlert, Users, Clock, Package, Activity, RefreshCw } from 'lucide-react';

interface Props {
  onNavigateToOrders: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigateToOrders }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      setMetrics(data);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        Loading real-time operations dashboard...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-rose-950/30 border border-rose-800 p-6 rounded-xl text-rose-300 text-sm">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            Operations Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time fleet health, delivery lifecycle stats, and system activity.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Shipments</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-slate-100">{metrics.total_orders}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-indigo-400 font-semibold">{metrics.orders_by_status?.CREATED || 0}</span> awaiting assignment
          </div>
        </div>

        {/* Delivered Today */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Delivered Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-300">{metrics.delivered_today}</div>
          <div className="text-[11px] text-slate-400">
            {metrics.orders_by_status?.DELIVERED || 0} total delivered
          </div>
        </div>

        {/* Failed Today */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Failed Attempts Today</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-300">{metrics.failed_today}</div>
          <div className="text-[11px] text-slate-400">
            {metrics.orders_by_status?.RESCHEDULED || 0} currently rescheduled
          </div>
        </div>

        {/* Agent Fleet */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-medium">
            <span>Fleet Availability</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300">
            {metrics.agents?.AVAILABLE || 0} <span className="text-base text-slate-500 font-normal">/ {metrics.total_agents}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {metrics.agents?.BUSY || 0} busy · {metrics.agents?.OFFLINE || 0} offline
          </div>
        </div>
      </div>

      {/* Orders By Status Distribution */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-200">Shipment Status Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
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
            <div key={st} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <div className="font-mono text-xl font-bold text-slate-100">{metrics.orders_by_status[st] || 0}</div>
              <div className="mt-1">
                <StatusBadge status={st} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent System Activity Stream */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Recent Business Events & Lifecycle Transitions
          </h2>
          <button
            onClick={onNavigateToOrders}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            View All Orders →
          </button>
        </div>

        <div className="space-y-2">
          {metrics.recent_activity.map((act) => (
            <div
              key={act.id}
              className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 font-semibold">#{act.order_id.slice(0, 8)}</span>
                <StatusBadge status={act.new_status} size="sm" />
                {act.reason && <span className="text-slate-300 truncate max-w-md">"{act.reason}"</span>}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                {act.actor_name && <span>By: <strong className="text-slate-300">{act.actor_name}</strong></span>}
                <span className="font-mono">{new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
