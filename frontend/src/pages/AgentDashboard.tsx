import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, agentSelfApi, adminApi, extractErrorMessage } from '../api/client';
import { Order, AgentAvailability, Zone } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { Truck, CheckCircle2, ShieldAlert, Clock, ArrowRight, AlertCircle, RefreshCw, Power, MapPin, Edit3 } from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AgentAvailability>('AVAILABLE');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Agent Zone & Location State
  const [currentZoneId, setCurrentZoneId] = useState<string | null>(null);
  const [currentZoneName, setCurrentZoneName] = useState<string | null>(null);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [isEditingZone, setIsEditingZone] = useState(false);
  const [selectedNewZoneId, setSelectedNewZoneId] = useState<string>('');
  const [savingZone, setSavingZone] = useState(false);

  const [dutyFeedback, setDutyFeedback] = useState<string | null>(null);

  // Failure modal state
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [submittingFailure, setSubmittingFailure] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAgentStatus = async () => {
    try {
      const self = await agentSelfApi.getSelf();
      if (self.availability_status) {
        setAvailability(self.availability_status as AgentAvailability);
      }
      if (self.current_zone_id) {
        setCurrentZoneId(self.current_zone_id);
      }
      if (self.current_zone_name) {
        setCurrentZoneName(self.current_zone_name);
      }
    } catch (err) {
      console.error('Failed to fetch agent profile', err);
    }
  };

  const fetchZones = async () => {
    try {
      const zones = await adminApi.listZones();
      setAllZones(zones.filter((z) => z.is_active));
    } catch (err) {
      console.error('Failed to fetch zones', err);
    }
  };

  const fetchAssigned = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.listOrders();
      setOrders(res.orders);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    fetchZones();
    fetchAssigned();
  }, []);

  const handleStatusTransition = async (orderId: string, nextStatus: string) => {
    setActionLoading(orderId);
    try {
      await ordersApi.updateStatus(orderId, { status: nextStatus });
      await fetchAssigned();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkFailed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureOrderId || !failureReason) return;
    setSubmittingFailure(true);
    try {
      await ordersApi.updateStatus(failureOrderId, {
        status: 'FAILED',
        failure_reason: failureReason,
      });
      setFailureOrderId(null);
      setFailureReason('');
      await fetchAssigned();
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
      setDutyFeedback(`Duty status updated to ${newStatus}`);
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner: Status, Zone & Availability */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-indigo-950/80 border border-indigo-700/60 rounded-xl text-indigo-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Delivery Agent Portal</h1>
            </div>

            {/* Operating Zone Indicator */}
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Base Zone:
              </span>
              {currentZoneName ? (
                <span className="bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5">
                  {currentZoneName}
                  <button
                    onClick={() => {
                      setSelectedNewZoneId(currentZoneId || '');
                      setIsEditingZone(true);
                    }}
                    className="text-slate-400 hover:text-indigo-200 cursor-pointer"
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
                  className="bg-amber-950/60 border border-amber-600/60 hover:border-amber-400 text-amber-300 font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>⚠️ Unassigned (Click to Set Zone)</span>
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex flex-col items-start md:items-end gap-1">
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700">
            <span className="text-xs text-slate-400 font-medium px-2 flex items-center gap-1">
              <Power className="w-3.5 h-3.5" />
              Duty:
            </span>
            {(['AVAILABLE', 'BUSY', 'OFFLINE'] as AgentAvailability[]).map((st) => (
              <button
                key={st}
                disabled={updatingAvailability}
                onClick={() => handleToggleAvailability(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  availability === st
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : st === 'BUSY'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                      : 'bg-slate-700 text-slate-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          {dutyFeedback && (
            <span className="text-[11px] text-emerald-400 font-medium animate-fadeIn">
              ✓ {dutyFeedback}
            </span>
          )}
        </div>
      </div>

      {/* Zone Edit Modal */}
      {isEditingZone && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveZone} className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <MapPin className="w-5 h-5" />
              Set Your Operating Zone
            </div>
            <p className="text-slate-300">
              Orders originating in your operating zone are prioritized for auto-dispatch and nearest routing.
            </p>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Select Operational Zone</label>
              <select
                required
                value={selectedNewZoneId}
                onChange={(e) => setSelectedNewZoneId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Select a Zone --</option>
                {allZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.area_count || 0} Areas)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingZone(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingZone || !selectedNewZoneId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer transition-colors"
              >
                {savingZone ? 'Saving...' : 'Save Zone'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}


      {/* Assigned Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200">Assigned Deliveries ({orders.length})</h2>
          <button
            onClick={fetchAssigned}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-slate-800/40 rounded-xl border border-slate-700">
            Loading assigned deliveries...
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-slate-800/40 rounded-xl border border-slate-700 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div>No active orders assigned to you right now.</div>
            <p className="text-xs text-slate-500">Ensure your duty status is set to AVAILABLE to receive auto-dispatches.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const isWorking = actionLoading === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-200">#{order.id.slice(0, 8)}</span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>

                    <div className="text-xs space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                      <div>
                        <span className="text-slate-400 block font-medium">Pickup:</span>
                        <span className="text-slate-200">{order.pickup_address} ({order.pickup_pincode})</span>
                      </div>
                      <div className="pt-2 border-t border-slate-700/50">
                        <span className="text-slate-400 block font-medium">Deliver To:</span>
                        <span className="text-slate-200 font-semibold">{order.drop_address} ({order.drop_pincode})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Payment: <strong className={order.payment_type === 'COD' ? 'text-amber-300' : 'text-emerald-300'}>{order.payment_type}</strong></span>
                      <span>Total: <strong className="text-slate-100">₹{order.total_charge.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Actions based on valid forward state machine */}
                  <div className="pt-3 border-t border-slate-700/60 space-y-2">
                    {order.status === 'ASSIGNED' && (
                      <button
                        disabled={isWorking}
                        onClick={() => handleStatusTransition(order.id, 'PICKED_UP')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isWorking ? 'Updating...' : 'Mark Package Picked Up'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'PICKED_UP' && (
                      <button
                        disabled={isWorking}
                        onClick={() => handleStatusTransition(order.id, 'IN_TRANSIT')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isWorking ? 'Updating...' : 'Start Transit to Hub / City'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'IN_TRANSIT' && (
                      <button
                        disabled={isWorking}
                        onClick={() => handleStatusTransition(order.id, 'OUT_FOR_DELIVERY')}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Delivered
                        </button>
                        <button
                          disabled={isWorking}
                          onClick={() => setFailureOrderId(order.id)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Mark Failed
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedOrderId(order.id)}
                      className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1 cursor-pointer"
                    >
                      View Full Details & History
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleMarkFailed} className="bg-slate-900 border border-rose-700/60 p-6 rounded-2xl max-w-md w-full space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              Record Delivery Attempt Failure
            </div>
            <p className="text-slate-300">
              Please specify the exact reason for the failed delivery. This reason will be recorded on the delivery attempt and notified to the customer for rescheduling.
            </p>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Failure Reason</label>
              <textarea
                required
                rows={3}
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="e.g. Customer unavailable at address, phone unreachable after 3 attempts"
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFailureOrderId(null);
                  setFailureReason('');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFailure || !failureReason}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer transition-colors"
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
