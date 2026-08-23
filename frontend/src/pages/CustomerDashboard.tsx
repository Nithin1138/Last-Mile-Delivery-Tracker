import React, { useState, useEffect } from 'react';
import { ordersApi, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { Package, Search, Plus, Filter, ArrowUpRight, RotateCcw, Phone, Check, Edit2, X } from 'lucide-react';

interface Props {
  onCreateOrderClick: () => void;
}

export const CustomerDashboard: React.FC<Props> = ({ onCreateOrderClick }) => {
  const { user, updateProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Phone number inline edit state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user?.phone]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    try {
      await updateProfile({ phone: phoneNumber.trim() });
      setIsEditingPhone(false);
      setPhoneSuccess('Phone number saved for SMS notifications!');
      setTimeout(() => setPhoneSuccess(null), 4000);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setSavingPhone(false);
    }
  };


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

      {/* SMS Phone Alerts Banner / Inline Editor */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span>SMS Delivery Alerts</span>
              {user?.phone ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-medium">
                  Active: {user.phone}
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                  No mobile number set
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Receive live SMS notifications on order dispatch, agent assignment, and delivery.
            </p>
          </div>
        </div>

        {isEditingPhone ? (
          <form onSubmit={handleSavePhone} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none w-48"
              autoFocus
            />
            <button
              type="submit"
              disabled={savingPhone}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {savingPhone ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingPhone(false)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditingPhone(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Edit2 className="w-3 h-3 text-indigo-400" />
            <span>{user?.phone ? 'Change Number' : '+ Add Number for SMS'}</span>
          </button>
        )}
      </div>

      {phoneSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{phoneSuccess}</span>
        </div>
      )}

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
