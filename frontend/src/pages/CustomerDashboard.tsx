import React, { useState, useEffect } from 'react';
import { ordersApi, extractErrorMessage } from '../api/client';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { Package, Search, Plus, Filter, ArrowUpRight, RotateCcw } from 'lucide-react';

interface Props {
  onCreateOrderClick: () => void;
}

export const CustomerDashboard: React.FC<Props> = ({ onCreateOrderClick }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await ordersApi.listOrders({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setOrders(res.orders);
    } catch (err: any) {
      if (!isBackground) {
        setError(extractErrorMessage(err));
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 200);

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 12000);

    return () => {
      clearTimeout(handler);
      clearInterval(interval);
    };
  }, [statusFilter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            My Deliveries
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track packages, view immutable timeline history, and manage deliveries.
          </p>
        </div>

        <button
          onClick={onCreateOrderClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-lg self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address or pincode..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="RESCHEDULED">Rescheduled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-slate-800/40 rounded-xl border border-slate-700">
          Loading orders...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-slate-800/40 rounded-xl border border-slate-700 space-y-3">
          <Package className="w-8 h-8 text-slate-600 mx-auto" />
          <div>No orders found.</div>
          <button
            onClick={onCreateOrderClick}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            + Create your first order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className="bg-slate-800/80 border border-slate-700 hover:border-indigo-500/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-200">#{order.id.slice(0, 8)}</span>
                  <StatusBadge status={order.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 truncate">
                    <span className="text-slate-500">To: </span>
                    {order.drop_address}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Drop Pincode: {order.drop_pincode} ({order.drop_zone_name || 'Zone'})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 font-mono">
                  <div>
                    <span className="text-slate-400 block">Chargeable</span>
                    <strong className="text-slate-200">{order.chargeable_weight_kg} kg</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total</span>
                    <strong className="text-emerald-400">₹{order.total_charge.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-300">
                <span>{new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                <span className="flex items-center gap-1 font-semibold">
                  View Timeline <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onRefreshNeeded={fetchOrders}
        />
      )}
    </div>
  );
};
