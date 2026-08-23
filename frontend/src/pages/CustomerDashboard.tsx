import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, extractErrorMessage } from '../api/client';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  Smartphone, 
  Phone, 
  ShieldCheck, 
  X, 
  Check, 
  BellRing,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface Props {
  onCreateOrderClick: () => void;
}

export const CustomerDashboard: React.FC<Props> = ({ onCreateOrderClick }) => {
  const { user, updateProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // SMS Notifications Modal & Toast State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [inputPhone, setInputPhone] = useState(user?.phone || '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.listOrders({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setOrders(data.orders);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Keep phone input synced with logged-in user profile
  useEffect(() => {
    if (user?.phone) {
      setInputPhone(user.phone);
    }
  }, [user?.phone]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSaving(true);
    try {
      await updateProfile({ phone: inputPhone.trim() || undefined });
      setIsPhoneModalOpen(false);
      setToastMessage(inputPhone.trim() ? 'SMS alerts activated for ' + inputPhone.trim() : 'SMS alerts disabled');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err: any) {
      setPhoneError(extractErrorMessage(err));
    } finally {
      setPhoneSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification rendered at document.body via Portal */}
      {showToast && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 toast-animate">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-200 font-medium flex-1">
            {toastMessage}
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>,
        document.body
      )}

      {/* Header with Stats & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Package className="w-5 h-5" />
            </div>
            My Deliveries & Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status updates, live agent tracking, and full immutable audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sleek SMS Alert Status Pill */}
          <button
            type="button"
            onClick={() => {
              setPhoneError(null);
              setIsPhoneModalOpen(true);
            }}
            className="group px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer shadow-sm"
            title="Configure real-time SMS delivery notifications"
          >
            <div className={`p-1 rounded-lg ${user?.phone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium hidden xs:inline">SMS Alerts:</span>
              {user?.phone ? (
                <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
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
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create New Order
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination address, area, or pincode..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-9.5 pr-8 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses ({orders.length})</option>
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
        <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading your live deliveries...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-lg">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="font-bold text-slate-200 text-sm">No shipments found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || statusFilter ? 'No orders match the current filter criteria.' : 'You have not placed any delivery requests yet.'}
          </p>
          <button
            onClick={onCreateOrderClick}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer pt-2 hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            Create your first order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {orders.map((order, idx) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="bg-slate-900/80 border border-slate-800 card-hover-glow card-enter rounded-2xl p-5 shadow-lg cursor-pointer space-y-4 group flex flex-col justify-between backdrop-blur-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">#{order.id.slice(0, 8)}</span>
                  <StatusBadge status={order.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 truncate font-medium">
                    <span className="text-slate-500">To: </span>
                    {order.drop_address}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Drop Pincode: {order.drop_pincode} ({order.drop_zone_name || 'Zone'})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Chargeable</span>
                    <strong className="text-slate-200">{order.chargeable_weight_kg} kg</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Total</span>
                    <strong className="text-emerald-400 font-bold">₹{order.total_charge.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-300 transition-colors">
                <span className="font-mono text-[11px]">{new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                <span className="flex items-center gap-1 font-bold text-[11px]">
                  View Timeline <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SMS Alert Settings Modal rendered via Portal */}
      {isPhoneModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 relative modal-animate">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">SMS Delivery Alerts</h3>
                  <p className="text-xs text-slate-400">Receive live automated status notifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-indigo-400" />
                Automated Twilio SMS Triggers:
              </div>
              <ul className="text-slate-400 space-y-1 pl-5 list-disc text-[11px]">
                <li><strong className="text-slate-300">Agent Assigned:</strong> Fleet driver & ETA dispatch notification.</li>
                <li><strong className="text-slate-300">Out for Delivery:</strong> Live arrival alert to customer.</li>
                <li><strong className="text-slate-300">Delivered:</strong> Confirmation & delivery timestamp.</li>
                <li><strong className="text-slate-300">Rescheduled / Failed:</strong> Attempt notes & updated slot.</li>
              </ul>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number (with Country Code)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-9.5 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: <code className="font-mono text-slate-400">+91XXXXXXXXXX</code> or standard 10-digit number.
                </p>
              </div>

              {phoneError && (
                <div className="bg-rose-950/40 border border-rose-800 p-3 rounded-xl text-xs text-rose-300">
                  {phoneError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={phoneSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {phoneSaving ? 'Saving...' : 'Save Mobile Number'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
