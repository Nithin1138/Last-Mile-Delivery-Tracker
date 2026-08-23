import React, { useState, useEffect } from 'react';
import { ordersApi, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  ArrowUpRight, 
  Phone, 
  Check, 
  X, 
  Bell, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2,
  Smartphone
} from 'lucide-react';

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

  // Phone number modal / settings state
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user?.phone]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    setPhoneError(null);
    try {
      await updateProfile({ phone: phoneNumber.trim() });
      setIsPhoneModalOpen(false);
      setPhoneSuccess('SMS alert phone number updated successfully!');
      setTimeout(() => setPhoneSuccess(null), 4000);
    } catch (err: any) {
      setPhoneError(extractErrorMessage(err));
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
      {/* Toast notification for phone updates */}
      {phoneSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{phoneSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Package className="w-5 h-5" />
            </div>
            My Deliveries
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track packages, view immutable timeline history, and manage deliveries.
          </p>
        </div>

        {/* Action Controls & SMS Alert Pill */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sleek SMS Alert Status Pill */}
          <button
            type="button"
            onClick={() => {
              setPhoneError(null);
              setIsPhoneModalOpen(true);
            }}
            className="group px-3 py-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer shadow-sm"
            title="Configure real-time SMS delivery notifications"
          >
            <div className={`p-1 rounded-lg ${user?.phone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium hidden xs:inline">SMS Alerts:</span>
              {user?.phone ? (
                <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  {user.phone}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  Add Mobile <Plus className="w-3 h-3" />
                </span>
              )}
            </div>
          </button>

          {/* Primary Create Order Button */}
          <button
            onClick={onCreateOrderClick}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create New Order
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination address, area, or pincode..."
            className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500/60 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/70 border border-slate-800 focus:border-indigo-500/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
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

      {/* Orders Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse">
          Loading your deliveries...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
          <Package className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-semibold text-slate-300">No deliveries found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || statusFilter ? 'No orders match the current filter criteria.' : 'You have not placed any delivery requests yet.'}
          </p>
          <button
            onClick={onCreateOrderClick}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer pt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Create your first order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-950/20 transition-all cursor-pointer space-y-4 group flex flex-col justify-between"
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

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Chargeable</span>
                    <strong className="text-slate-200">{order.chargeable_weight_kg} kg</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Total</span>
                    <strong className="text-emerald-400">₹{order.total_charge.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-300">
                <span>{new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                <span className="flex items-center gap-1 font-semibold text-[11px]">
                  View Timeline <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SMS Alert Settings Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">SMS Delivery Alerts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time SMS updates for your package movements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {phoneError && (
              <div className="bg-rose-950/40 border border-rose-800 p-2.5 rounded-xl text-xs text-rose-300">
                {phoneError}
              </div>
            )}

            <form onSubmit={handleSavePhone} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Include country code (e.g. <span className="font-mono text-slate-400">+91</span> for India).
                </p>
              </div>

              {/* Notification Trigger Features */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" />
                  Active SMS Triggers:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Agent Assigned
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Out for Delivery
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Delivered Confirmation
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Reschedule Alerts
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPhone}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingPhone ? 'Saving...' : 'Save Mobile Number'}
                </button>
              </div>
            </form>
          </div>
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
