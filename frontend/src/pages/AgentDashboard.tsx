import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, adminApi, agentSelfApi, extractErrorMessage } from '../api/client';
import { Order, Zone, AgentAvailability, OrderStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  Clock, 
  RefreshCw, 
  X, 
  Sparkles, 
  AlertTriangle,
  Play,
  RotateCcw,
  Navigation,
  Phone,
  Package,
  Zap
} from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Duty State
  const [dutyStatus, setDutyStatus] = useState<AgentAvailability>('AVAILABLE');
  const [currentZoneId, setCurrentZoneId] = useState<string>('');
  const [updatingDuty, setUpdatingDuty] = useState(false);

  // Selected Order Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Status Transition Action Modal
  const [actionOrder, setActionOrder] = useState<Order | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderStatus | ''>('');
  const [failureReason, setFailureReason] = useState<string>('CUSTOMER_UNAVAILABLE');
  const [actionReason, setActionReason] = useState<string>('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.listOrders();
      setOrders(data.orders);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchAgentProfileAndZones = async () => {
    try {
      const [profile, zonesData] = await Promise.all([
        agentSelfApi.getSelf(),
        agentSelfApi.listZones(),
      ]);
      if (profile.availability_status) {
        setDutyStatus(profile.availability_status as AgentAvailability);
      }
      if (profile.current_zone_id) {
        setCurrentZoneId(profile.current_zone_id);
      }
      setZones(zonesData);
    } catch (err) {
      console.error('Failed to load agent profile or hubs', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAgentProfileAndZones();
  }, [user?.id]);

  const handleDutyChange = async (newStatus: AgentAvailability, newZoneId?: string) => {
    setUpdatingDuty(true);
    const targetZoneId = newZoneId !== undefined ? newZoneId : currentZoneId;
    try {
      await agentSelfApi.updateSelf({
        availability_status: newStatus,
        zone_id: targetZoneId || undefined,
      });
      setDutyStatus(newStatus);
      if (newZoneId !== undefined) setCurrentZoneId(newZoneId);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setUpdatingDuty(false);
    }
  };

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionOrder || !targetStatus) return;

    setActionSubmitting(true);
    try {
      await ordersApi.updateStatus(actionOrder.id, {
        status: targetStatus,
        reason: actionReason || `Status transitioned to ${targetStatus}`,
        failure_reason: targetStatus === 'FAILED' ? failureReason : undefined,
      });

      setActionOrder(null);
      setTargetStatus('');
      setActionReason('');
      fetchOrders(false);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setActionSubmitting(false);
    }
  };

  // Helper for determining next allowed action
  const getNextAction = (status: OrderStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return { label: 'Start Pickup', next: 'PICKED_UP' as OrderStatus, color: 'stripe-btn-primary' };
      case 'PICKED_UP':
        return { label: 'Enter Transit', next: 'IN_TRANSIT' as OrderStatus, color: 'stripe-btn-primary' };
      case 'IN_TRANSIT':
        return { label: 'Out for Delivery', next: 'OUT_FOR_DELIVERY' as OrderStatus, color: 'stripe-btn-primary' };
      case 'OUT_FOR_DELIVERY':
        return { label: 'Mark Delivered', next: 'DELIVERED' as OrderStatus, color: 'stripe-btn-success' };
      default:
        return null;
    }
  };

  // Active priority order (the first in-progress order)
  const activeHeroOrder = orders.find(o => ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKED_UP', 'ASSIGNED'].includes(o.status));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Duty Status Controller Banner */}
      <div className="stripe-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              Courier Dispatch Dashboard
            </h1>
            <span className="text-[10px] font-mono text-[#5F6672] dark:text-[#A7ADB5] bg-[#F1F3F5] dark:bg-[#1E2328] px-2 py-0.5 rounded border border-[#E2E5E9] dark:border-[#2B3138]">
              {user?.name}
            </span>
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            Turn-by-turn route dispatch, live delivery confirmation, and exception logging.
          </p>
        </div>

        {/* Ergonomic Duty Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] p-2 rounded-xl">
          <div className="flex items-center gap-1">
            <button
              disabled={updatingDuty}
              onClick={() => handleDutyChange('AVAILABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                dutyStatus === 'AVAILABLE'
                  ? 'bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E] shadow-2xs'
                  : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#287A55] dark:bg-[#55A878] animate-pulse" />
              Ready for Orders
            </button>

            <button
              disabled={updatingDuty}
              onClick={() => handleDutyChange('BUSY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                dutyStatus === 'BUSY'
                  ? 'bg-[#FAF3E8] dark:bg-[#292014] text-[#A66A16] dark:text-[#D19A4A] border border-[#F2DEBF] dark:border-[#42321D] shadow-2xs'
                  : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#A66A16] dark:bg-[#D19A4A]" />
              On Delivery Run
            </button>

            <button
              disabled={updatingDuty}
              onClick={() => handleDutyChange('OFFLINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                dutyStatus === 'OFFLINE'
                  ? 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] border border-[#E2E5E9] dark:border-[#2B3138] shadow-2xs'
                  : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#8A919C] dark:bg-[#737A84]" />
              Shift Ended
            </button>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-[#E2E5E9] dark:border-[#2B3138] pt-2 sm:pt-0 sm:pl-3">
            <select
              value={currentZoneId}
              onChange={(e) => handleDutyChange(dutyStatus, e.target.value)}
              className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] text-xs text-[#171A1F] dark:text-[#E8EAED] rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer font-medium"
            >
              <option value="">Base Hub: None</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>Hub: {z.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Featured Current Priority Task Card */}
      {activeHeroOrder && (
        <div className="bg-gradient-to-r from-[#3157A6]/10 via-[#F7F8FA] to-transparent dark:from-[#6D8ED4]/15 dark:via-[#181C20] dark:to-transparent border border-[#3157A6]/30 dark:border-[#6D8ED4]/40 rounded-2xl p-6 space-y-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417]">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
                  Active Priority Task · Next Stop
                </span>
                <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">
                  Order #{activeHeroOrder.id.slice(0, 8)} ({activeHeroOrder.payment_type} · ₹{activeHeroOrder.total_charge.toFixed(2)})
                </div>
              </div>
            </div>
            <StatusBadge status={activeHeroOrder.status} size="md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#8A919C] dark:text-[#737A84] block">Deliver To</span>
              <div className="text-sm font-bold text-[#171A1F] dark:text-[#E8EAED]">{activeHeroOrder.drop_address}</div>
              <div className="text-xs text-[#5F6672] dark:text-[#A7ADB5] font-mono">PIN: {activeHeroOrder.drop_pincode} ({activeHeroOrder.drop_zone_name || 'Zone'})</div>
            </div>

            <div className="flex items-center justify-end gap-2 flex-wrap">
              {(() => {
                const action = getNextAction(activeHeroOrder.status);
                if (!action) return null;
                return (
                  <button
                    onClick={() => {
                      setActionOrder(activeHeroOrder);
                      setTargetStatus(action.next);
                      setActionReason('');
                    }}
                    className={`${action.color} py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{action.label}</span>
                  </button>
                );
              })()}

              <button
                onClick={() => {
                  setActionOrder(activeHeroOrder);
                  setTargetStatus('FAILED');
                  setFailureReason('CUSTOMER_UNAVAILABLE');
                  setActionReason('');
                }}
                className="py-2.5 px-3 rounded-xl bg-[#FAF0F0] dark:bg-[#2B1717] hover:bg-[#F2D0D0] dark:hover:bg-[#432323] text-[#B54848] dark:text-[#D56B6B] border border-[#F2D0D0] dark:border-[#432323] transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                title="Record Delivery Issue"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Report Issue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Queue Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
              Assigned Shipments ({orders.length})
            </h2>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh Queue
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#8A919C] dark:text-[#737A84] text-xs stripe-card rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px]">Loading active shipments...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-2xl text-[#B54848] dark:text-[#D56B6B] text-xs">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-7 px-6 text-center text-[#5F6672] dark:text-[#A7ADB5] bg-white dark:bg-[#181C20] rounded-2xl flex flex-col items-center justify-center gap-2 max-w-sm mx-auto border border-[#E2E5E9] dark:border-[#2B3138] shadow-xs animate-in fade-in">
            <div className="w-9 h-9 rounded-full bg-[#EBF1FA] dark:bg-[#182232] flex items-center justify-center text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
              <Truck className="w-4 h-4" />
            </div>
            <div className="font-bold text-[#171A1F] dark:text-[#E8EAED] text-xs">Queue is clear</div>
            <p className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] max-w-xs leading-normal">
              No shipments currently assigned. Dispatches will appear here automatically.
            </p>
            <button
              onClick={() => fetchOrders()}
              className="mt-1 stripe-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Check for New Assignments</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order, idx) => {
              const action = getNextAction(order.status);
              const isTerminal = order.status === 'DELIVERED' || order.status === 'CANCELLED';

              return (
                <div
                  key={order.id}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className="stripe-card-interactive card-enter rounded-2xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="font-mono text-xs font-bold text-[#171A1F] dark:text-[#E8EAED] hover:text-[#3157A6] dark:hover:text-[#6D8ED4] transition-colors cursor-pointer"
                      >
                        #{order.id.slice(0, 8)}
                      </button>
                      <StatusBadge status={order.status} size="sm" />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#287A55] dark:text-[#55A878] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] uppercase font-bold">Pickup Origin</div>
                          <div className="text-[#171A1F] dark:text-[#E8EAED] font-medium">{order.pickup_address}</div>
                          <div className="text-[#5F6672] dark:text-[#A7ADB5] text-[10px]"><span className="font-mono">PIN {order.pickup_pincode}</span></div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1.5 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                        <MapPin className="w-3.5 h-3.5 text-[#B54848] dark:text-[#D56B6B] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] uppercase font-bold">Delivery Drop</div>
                          <div className="text-[#171A1F] dark:text-[#E8EAED] font-semibold">{order.drop_address}</div>
                          <div className="text-[#5F6672] dark:text-[#A7ADB5] text-[10px]"><span className="font-mono">PIN {order.drop_pincode}</span> ({order.drop_zone_name || 'Zone'})</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F1F3F5] dark:bg-[#1E2328] p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                      <div>
                        <span className="text-[#8A919C] dark:text-[#737A84] block text-[9px] uppercase font-semibold">Payment</span>
                        <strong className="text-[#171A1F] dark:text-[#E8EAED]">{order.payment_type}</strong>
                      </div>
                      <div>
                        <span className="text-[#8A919C] dark:text-[#737A84] block text-[9px] uppercase font-semibold">Amount</span>
                        <strong className="text-[#287A55] dark:text-[#55A878] font-bold">₹{order.total_charge.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138] flex items-center gap-2">
                    {action && (
                      <button
                        onClick={() => {
                          setActionOrder(order);
                          setTargetStatus(action.next);
                          setActionReason('');
                        }}
                        className={`flex-1 ${action.color} py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer font-semibold`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{action.label}</span>
                      </button>
                    )}

                    {!isTerminal && order.status !== 'FAILED' && (
                      <button
                        onClick={() => {
                          setActionOrder(order);
                          setTargetStatus('FAILED');
                          setFailureReason('CUSTOMER_UNAVAILABLE');
                          setActionReason('');
                        }}
                        className="p-1.5 rounded-lg bg-[#FAF0F0] dark:bg-[#2B1717] hover:bg-[#F2D0D0] dark:hover:bg-[#432323] text-[#B54848] dark:text-[#D56B6B] border border-[#F2D0D0] dark:border-[#432323] transition-colors cursor-pointer text-xs flex items-center gap-1"
                        title="Record Delivery Issue"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Issue</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Transition Modal */}
      {actionOrder && targetStatus && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleTransitionSubmit} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl modal-animate">
            <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
              <div className="font-bold text-sm text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-2">
                {targetStatus === 'FAILED' ? (
                  <ShieldAlert className="w-4 h-4 text-[#B54848] dark:text-[#D56B6B]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                )}
                Confirm Status: {targetStatus}
              </div>
              <button
                type="button"
                onClick={() => setActionOrder(null)}
                className="text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 bg-[#F1F3F5] dark:bg-[#1E2328] p-3 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
              <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5]">Order: <strong className="text-[#171A1F] dark:text-[#E8EAED] font-mono">#{actionOrder.id.slice(0, 8)}</strong></div>
              <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5]">Destination: <strong className="text-[#171A1F] dark:text-[#E8EAED]">{actionOrder.drop_address}</strong></div>
            </div>

            {targetStatus === 'FAILED' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Primary Issue Reason</label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer"
                  >
                    <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable at Address</option>
                    <option value="INCORRECT_ADDRESS">Incomplete or Incorrect Address</option>
                    <option value="CUSTOMER_REFUSED">Customer Refused Delivery / COD</option>
                    <option value="PREMISES_CLOSED">Premises / Gate Closed</option>
                    <option value="WEATHER_DELAY">Inclement Weather / Road Block</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Field Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g. Called customer twice, doorbell unanswered..."
                    className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                  />
                </div>

                <div className="bg-[#FAF3E8] dark:bg-[#292014] border border-[#F2DEBF] dark:border-[#42321D] p-2.5 rounded-lg text-[#A66A16] dark:text-[#D19A4A] text-[11px] leading-relaxed">
                  <strong>Automated Rescheduling:</strong> This failure attempt triggers an automated reschedule notice and updates the customer via SMS.
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Delivery Confirmation Notes (Optional)</label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g., Handed over to recipient with signature"
                  className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setActionOrder(null)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSubmitting}
                className={`px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 font-semibold ${
                  targetStatus === 'FAILED' ? 'bg-[#B54848] hover:bg-[#8F3939] text-white font-semibold' : 'stripe-btn-primary'
                }`}
              >
                {actionSubmitting ? 'Updating...' : `Confirm ${targetStatus}`}
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
          onRefreshNeeded={fetchOrders}
        />
      )}
    </div>
  );
};
