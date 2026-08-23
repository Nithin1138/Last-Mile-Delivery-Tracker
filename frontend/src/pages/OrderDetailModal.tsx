import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Order, TimelineEntry, DeliveryAttempt, AssignmentDecision } from '../types';
import { ordersApi, extractErrorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';
import { DeliveryAttemptsList } from '../components/DeliveryAttemptsList';
import { AssignmentAuditCard } from '../components/AssignmentAuditCard';
import { X, Package, MapPin, Calendar, Clock, RotateCcw, Truck, Calculator } from 'lucide-react';

interface Props {
  orderId: string;
  onClose: () => void;
  onRefreshNeeded?: () => void;
}

export const OrderDetailModal: React.FC<Props> = ({ orderId, onClose, onRefreshNeeded }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchDetails = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const [orderRes, timelineRes, attemptsRes, assignmentsRes] = await Promise.all([
        ordersApi.getOrder(orderId),
        ordersApi.getTimeline(orderId),
        ordersApi.getAttempts(orderId),
        ordersApi.getAssignments(orderId),
      ]);
      setOrder(orderRes);
      setTimeline(timelineRes);
      setAttempts(attemptsRes);
      setAssignments(assignmentsRes);
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
    fetchDetails();
    const interval = setInterval(() => {
      fetchDetails(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      await ordersApi.rescheduleOrder(orderId, {
        new_scheduled_date: new Date(rescheduleDate).toISOString(),
        reason: rescheduleReason || 'Customer requested reschedule',
      });

      setShowReschedule(false);
      await fetchDetails();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setRescheduleError(extractErrorMessage(err));
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-slate-300 text-sm shadow-2xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading order tracking & timeline...</span>
        </div>
      </div>,
      document.body
    );
  }

  if (error || !order) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
          <div className="text-rose-400 font-bold text-sm">Error loading order</div>
          <div className="text-xs text-slate-400">{error || 'Order not found'}</div>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950 border border-indigo-700/60 rounded-xl text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-100">#{order.id.slice(0, 8)}</span>
                <StatusBadge status={order.status} size="sm" />
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {order.order_type} / {order.payment_type}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Placed on {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">

          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin & Destination */}
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl space-y-3 text-xs">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Route & Zones
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">Pickup (Zone: {order.pickup_zone_name || 'N/A'}):</span>
                  <span className="text-slate-200">{order.pickup_address}</span>
                  <span className="text-slate-400 font-mono ml-1">({order.pickup_pincode})</span>
                </div>
                <div className="pt-2 border-t border-slate-700/50">
                  <span className="text-slate-400 block font-medium">Drop (Zone: {order.drop_zone_name || 'N/A'}):</span>
                  <span className="text-slate-200">{order.drop_address}</span>
                  <span className="text-slate-400 font-mono ml-1">({order.drop_pincode})</span>
                </div>
              </div>
            </div>

            {/* Pricing Snapshot */}
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl space-y-3 text-xs">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Frozen Pricing Snapshot
                </span>
                <span className="font-mono text-emerald-400 text-base font-black">₹{order.total_charge.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60">
                <div>
                  <span className="text-slate-400 block">Actual Wt</span>
                  <strong className="text-slate-200 font-mono">{order.actual_weight_kg} kg</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Volumetric</span>
                  <strong className="text-amber-300 font-mono">{order.volumetric_weight_kg} kg</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Chargeable</span>
                  <strong className="text-indigo-300 font-mono">{order.chargeable_weight_kg} kg</strong>
                </div>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>Base Weight Charge:</span>
                  <span className="font-mono">₹{order.base_charge.toFixed(2)}</span>
                </div>
                {order.cod_charge > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>COD Surcharge:</span>
                    <span className="font-mono">+₹{order.cod_charge.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reschedule banner for FAILED orders */}
          {order.status === 'FAILED' && (
            <div className="bg-rose-950/30 border border-rose-700/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-sm text-rose-300 block">Delivery Attempt Failed</strong>
                <p className="text-xs text-rose-400 mt-0.5">
                  You can reschedule this order for a new delivery date.
                </p>
              </div>
              <button
                onClick={() => setShowReschedule(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reschedule Delivery
              </button>
            </div>
          )}

          {/* Reschedule Modal/Form */}
          {showReschedule && (
            <form onSubmit={handleReschedule} className="bg-slate-950 border border-indigo-700/60 p-4 rounded-xl space-y-3 text-xs">
              <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                Select New Delivery Date
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">New Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Reason / Instructions</label>
                  <input
                    type="text"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Call before arrival"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>
              {rescheduleError && (
                <div className="text-rose-400 text-xs">{rescheduleError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReschedule(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || !rescheduleDate}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {rescheduleLoading ? 'Submitting...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          )}

          {/* Delivery Attempts (First-Class Entity) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Delivery Attempts ({attempts.length})
            </h3>
            <DeliveryAttemptsList attempts={attempts} />
          </div>

          {/* Assignment Decision Audit */}
          {assignments.length > 0 && (
            <div className="space-y-3">
              <AssignmentAuditCard decisions={assignments} />
            </div>
          )}

          {/* Immutable Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Immutable Tracking Timeline ({timeline.length} Events)
            </h3>
            <OrderTimeline entries={timeline} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

