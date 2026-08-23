import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { agentSelfApi, adminApi, ordersApi, extractErrorMessage } from '../api/client';
import { Order, AgentAvailability, Zone } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  Power, 
  Edit3, 
  RefreshCw,
  Sparkles,
  PackageCheck,
  AlertTriangle,
  X
} from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Agent self-state
  const [availability, setAvailability] = useState<AgentAvailability>('AVAILABLE');
  const [currentZoneId, setCurrentZoneId] = useState<string | null>(null);
  const [currentZoneName, setCurrentZoneName] = useState<string | null>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [dutyFeedback, setDutyFeedback] = useState<string | null>(null);

  // Operating zone modal state
  const [isEditingZone, setIsEditingZone] = useState(false);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [selectedNewZoneId, setSelectedNewZoneId] = useState<string>('');
  const [savingZone, setSavingZone] = useState(false);

  // Failure modal state
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [submittingFailure, setSubmittingFailure] = useState(false);

  const fetchAssigned = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const self = await agentSelfApi.getSelf();
      const res = await ordersApi.listOrders({ agent_id: self.id });
      setOrders(res.orders);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchSelfAndZones = async () => {
    try {
      const [self, zones] = await Promise.all([
        agentSelfApi.getSelf(),
        adminApi.listZones(),
      ]);
      setAvailability(self.availability_status as AgentAvailability);
      setCurrentZoneId(self.current_zone_id || null);
      setCurrentZoneName(self.current_zone_name || null);
      setAllZones(zones);
    } catch (err: any) {
      console.error('Failed to load agent profile or zones:', err);
    }
  };

  useEffect(() => {
    fetchAssigned();
    fetchSelfAndZones();
  }, []);

  const handleStatusTransition = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      await ordersApi.updateStatus(orderId, { status: newStatus });
      await fetchAssigned(false);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkFailed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureOrderId || !failureReason.trim()) return;

    setSubmittingFailure(true);
    try {
      await ordersApi.updateStatus(failureOrderId, {
        status: 'FAILED',
        failure_reason: failureReason.trim(),
      });
      setFailureOrderId(null);
      setFailureReason('');
      await fetchAssigned(false);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setSubmittingFailure(false);
    }
  };

  const handleToggleAvailability = async (newStatus: AgentAvailability) => {
    setUpdatingAvailability(true);
    setDutyFeedback(null);
    try {
      await agentSelfApi.updateSelf({ availability_status: newStatus });
      setAvailability(newStatus);
      setDutyFeedback(`Duty status set to ${newStatus}`);
      setTimeout(() => setDutyFeedback(null), 3000);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZone(true);
    try {
      await agentSelfApi.updateSelf({ zone_id: selectedNewZoneId || undefined });
      const matched = allZones.find((z) => z.id === selectedNewZoneId);
      setCurrentZoneId(selectedNewZoneId || null);
      setCurrentZoneName(matched ? matched.name : null);
      setIsEditingZone(false);
      setDutyFeedback(`Operating zone set to ${matched ? matched.name : 'Unassigned'}`);
      setTimeout(() => setDutyFeedback(null), 3000);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setSavingZone(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner: Status, Zone & Availability */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-7 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-2xl text-white shadow-lg shadow-indigo-600/25">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Delivery Agent Dispatch Hub
            </h1>

            {/* Operating Zone Indicator */}
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Base Zone:
              </span>
              {currentZoneName ? (
                <span className="bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  {currentZoneName}
                  <button
                    onClick={() => {
                      setSelectedNewZoneId(currentZoneId || '');
                      setIsEditingZone(true);
                    }}
                    className="text-slate-400 hover:text-indigo-200 cursor-pointer transition-colors"
                    title="Change Operating Zone"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setSelectedNewZoneId('');
                    setIsEditingZone(true);
                  }}
                  className="bg-amber-950/60 border border-amber-600/60 hover:border-amber-400 text-amber-300 font-semibold px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
                >
                  <span>⚠️ Unassigned (Click to Set Zone)</span>
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <span className="text-xs text-slate-400 font-semibold px-2 flex items-center gap-1">
              <Power className="w-3.5 h-3.5 text-indigo-400" />
              Duty:
            </span>
            {(['AVAILABLE', 'BUSY', 'OFFLINE'] as AgentAvailability[]).map((st) => (
              <button
                key={st}
                disabled={updatingAvailability}
                onClick={() => handleToggleAvailability(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  availability === st
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : st === 'BUSY'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'bg-slate-700 text-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          {dutyFeedback && (
            <span className="text-[11px] text-emerald-400 font-semibold animate-in fade-in">
              ✓ {dutyFeedback}
            </span>
          )}
        </div>
      </div>

      {/* Zone Edit Modal via Portal */}
      {isEditingZone && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleSaveZone} className="bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl max-w-md w-full space-y-4 text-xs shadow-2xl modal-animate">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <MapPin className="w-4 h-4" />
                Change Operating Delivery Zone
              </div>
              <button
                type="button"
                onClick={() => setIsEditingZone(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300">
              Select your assigned hub or service area. The automated assignment engine uses this to route packages destined for your coverage area.
            </p>
            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Select Operational Zone</label>
              <select
                value={selectedNewZoneId}
                onChange={(e) => setSelectedNewZoneId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="">-- No Operating Zone (Floating Agent) --</option>
                {allZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingZone(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingZone || !selectedNewZoneId}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer transition-all shadow-lg shadow-indigo-600/25"
              >
                {savingZone ? 'Saving...' : 'Save Zone'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Assigned Orders Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Assigned Deliveries ({orders.length})</h2>
          <button
            onClick={() => fetchAssigned(false)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading assigned delivery dispatch...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-lg">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-slate-200 text-sm">No active shipments in your queue</div>
            <p className="text-xs text-slate-500">Ensure your duty status is set to AVAILABLE to automatically receive dispatched orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            {orders.map((order, idx) => {
              const isWorking = actionLoading === order.id;

              return (
                <div
                  key={order.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="bg-slate-900/80 border border-slate-800 card-hover-glow card-enter rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between backdrop-blur-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-200">#{order.id.slice(0, 8)}</span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>

                    <div className="text-xs space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Pickup:</span>
                        <span className="text-slate-200 font-medium">{order.pickup_address} ({order.pickup_pincode})</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Deliver To:</span>
                        <span className="text-slate-200 font-bold">{order.drop_address} ({order.drop_pincode})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Payment: <strong className={order.payment_type === 'COD' ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}>{order.payment_type}</strong></span>
                      <span>Total: <strong className="text-slate-100">₹{order.total_charge.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Actions based on valid forward state machine */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    {order.status === 'ASSIGNED' && (
                      <button
                        disabled={isWorking}
                        onClick={() => handleStatusTransition(order.id, 'PICKED_UP')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                      >
                        {isWorking ? 'Updating...' : 'Mark Package Picked Up'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'PICKED_UP' && (
                      <button
                        disabled={isWorking}
                        onClick={() => handleStatusTransition(order.id, 'IN_TRANSIT')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-600/25 cursor-pointer disabled:opacity-50"
                      >
                        {isWorking ? 'Updating...' : 'Start Transit to Destination'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'IN_TRANSIT' && (
                      <button
                        disabled={isWorking}
                        onClick={() => handleStatusTransition(order.id, 'OUT_FOR_DELIVERY')}
                        className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-purple-600/25 cursor-pointer disabled:opacity-50"
                      >
                        {isWorking ? 'Updating...' : 'Out for Delivery (Final Mile)'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'OUT_FOR_DELIVERY' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={isWorking}
                          onClick={() => handleStatusTransition(order.id, 'DELIVERED')}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Delivered
                        </button>
                        <button
                          disabled={isWorking}
                          onClick={() => setFailureOrderId(order.id)}
                          className="bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-all shadow-lg shadow-rose-600/25 cursor-pointer disabled:opacity-50"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Mark Failed
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedOrderId(order.id)}
                      className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1.5 cursor-pointer transition-colors font-medium"
                    >
                      View Full Details & History →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Failure Reason Input Modal */}
      {failureOrderId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleMarkFailed} className="bg-slate-900 border border-rose-800/80 p-6 sm:p-7 rounded-3xl max-w-md w-full space-y-4 text-xs shadow-2xl modal-animate">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              Record Delivery Attempt Failure
            </div>
            <p className="text-slate-300">
              Please specify the exact reason for the failed delivery. This reason will be recorded on the delivery attempt and notified to the customer for rescheduling.
            </p>
            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Failure Reason</label>
              <textarea
                required
                rows={3}
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="e.g. Customer unavailable at address, phone unreachable after 3 attempts"
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFailureOrderId(null);
                  setFailureReason('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFailure || !failureReason}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer transition-all shadow-lg shadow-rose-600/25"
              >
                {submittingFailure ? 'Submitting...' : 'Record Failure'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onRefreshNeeded={fetchAssigned}
        />
      )}
    </div>
  );
};
