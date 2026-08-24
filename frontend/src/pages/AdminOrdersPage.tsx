import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, adminApi, extractErrorMessage } from '../api/client';
import { Order, Agent, Zone } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { 
  Package, 
  Search, 
  Filter, 
  Compass, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  SlidersHorizontal,
  ArrowUpRight,
  Zap,
  AlertTriangle,
  Truck,
  MapPin,
  Check
} from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Triage Filter
  const [triageFilter, setTriageFilter] = useState<'ALL' | 'UNASSIGNED' | 'IN_TRANSIT' | 'ISSUES' | 'DELIVERED'>('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [search, setSearch] = useState('');

  // Selected Order
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Assignment Modal
  const [manualAssignOrderId, setManualAssignOrderId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Auto-assignment result modal
  const [assignmentResult, setAssignmentResult] = useState<{
    orderId: string;
    agentName?: string;
    mode: string;
    candidateCount: number;
    distanceKm?: number;
    reason: string;
  } | null>(null);

  // Status Override Modal
  const [overrideOrderId, setOverrideOrderId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  const fetchMetadata = async () => {
    try {
      const [agentsRes, zonesRes] = await Promise.all([
        adminApi.listAgents(),
        adminApi.listZones(),
      ]);
      setAgents(agentsRes);
      setZones(zonesRes);
    } catch (err) {
      console.error('Failed to load agents/zones metadata', err);
    }
  };

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const ordersRes = await ordersApi.listOrders({
        status: statusFilter || undefined,
        zone_id: zoneFilter || undefined,
        search: search.trim() || undefined,
      });
      setOrders(ordersRes.orders);
    } catch (err: any) {
      if (!isBackground) setError(extractErrorMessage(err));
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 180);

    return () => clearTimeout(handler);
  }, [statusFilter, zoneFilter, search]);

  const fetchData = async () => {
    fetchMetadata();
    fetchOrders();
  };

  const handleAutoAssign = async (orderId: string) => {
    setAssigning(true);
    try {
      const res = await ordersApi.assignAgent(orderId, { mode: 'auto' });
      setAssignmentResult({
        orderId,
        agentName: res.decision?.selected_agent_name,
        mode: res.decision?.selection_mode || 'auto',
        candidateCount: res.decision?.candidate_count || 0,
        distanceKm: res.decision?.selected_distance_km,
        reason: res.decision?.reason || 'nearest_agent',
      });
      fetchOrders(true);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const handleManualAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAssignOrderId || !selectedAgentId) return;

    setAssigning(true);
    try {
      await ordersApi.assignAgent(manualAssignOrderId, {
        agent_id: selectedAgentId,
        mode: 'manual',
      });
      setManualAssignOrderId(null);
      setSelectedAgentId('');
      fetchOrders(true);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideOrderId || !overrideStatus) return;

    setOverriding(true);
    try {
      await ordersApi.updateStatus(overrideOrderId, {
        status: overrideStatus,
        reason: overrideReason.trim() || 'Admin manual override',
        admin_override: true,
      });
      setOverrideOrderId(null);
      setOverrideStatus('');
      setOverrideReason('');
      fetchOrders(true);
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setOverriding(false);
    }
  };

  // Psychological Intent Filter
  const filteredOrders = orders.filter((o) => {
    if (triageFilter === 'UNASSIGNED') {
      return o.status === 'CREATED' || o.status === 'RESCHEDULED';
    }
    if (triageFilter === 'IN_TRANSIT') {
      return ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status);
    }
    if (triageFilter === 'ISSUES') {
      return o.status === 'FAILED' || o.status === 'RESCHEDULED';
    }
    if (triageFilter === 'DELIVERED') {
      return o.status === 'DELIVERED';
    }
    return true;
  });

  const unassignedCount = orders.filter(o => o.status === 'CREATED' || o.status === 'RESCHEDULED').length;
  const inTransitCount = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const issuesCount = orders.filter(o => o.status === 'FAILED' || o.status === 'RESCHEDULED').length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Header & Situational Triage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E5E9] dark:border-[#2B3138]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              Shipment Dispatch Pipeline
            </h1>
            <span className="text-[10px] font-mono text-[#5F6672] dark:text-[#A7ADB5] bg-[#F1F3F5] dark:bg-[#1E2328] px-2 py-0.5 rounded border border-[#E2E5E9] dark:border-[#2B3138]">
              {orders.length} total orders
            </span>
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            Automated agent dispatch, turn-by-turn route tracking, and lifecycle administration.
          </p>
        </div>

        <button
          onClick={() => fetchOrders()}
          className="text-xs bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] border border-[#E2E5E9] dark:border-[#2B3138] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3 h-3 text-[#5F6672] dark:text-[#A7ADB5]" />
          Refresh Pipeline
        </button>
      </div>

      {/* Psychological Cognitive Triage Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Unassigned Triage Card */}
        <button
          type="button"
          onClick={() => setTriageFilter(triageFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            triageFilter === 'UNASSIGNED'
              ? 'bg-[#FAF3E8] dark:bg-[#292014] border-[#A66A16] dark:border-[#D19A4A] shadow-xs'
              : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#A66A16]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A66A16] dark:text-[#D19A4A] flex items-center gap-1">
              <Compass className="w-3 h-3" />
              Needs Dispatch
            </span>
            <span className="font-mono text-sm font-bold text-[#A66A16] dark:text-[#D19A4A]">{unassignedCount}</span>
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-1">Awaiting Courier</div>
        </button>

        {/* In Transit Card */}
        <button
          type="button"
          onClick={() => setTriageFilter(triageFilter === 'IN_TRANSIT' ? 'ALL' : 'IN_TRANSIT')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            triageFilter === 'IN_TRANSIT'
              ? 'bg-[#EBF1FA] dark:bg-[#182232] border-[#3157A6] dark:border-[#6D8ED4] shadow-xs'
              : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#3157A6]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#3157A6] dark:text-[#6D8ED4] flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Live In Transit
            </span>
            <span className="font-mono text-sm font-bold text-[#3157A6] dark:text-[#6D8ED4]">{inTransitCount}</span>
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-1">Active on Route</div>
        </button>

        {/* Exceptions Card */}
        <button
          type="button"
          onClick={() => setTriageFilter(triageFilter === 'ISSUES' ? 'ALL' : 'ISSUES')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            triageFilter === 'ISSUES'
              ? 'bg-[#FAF0F0] dark:bg-[#2B1717] border-[#B54848] dark:border-[#D56B6B] shadow-xs'
              : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#B54848]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#B54848] dark:text-[#D56B6B] flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Failed / Retrying
            </span>
            <span className="font-mono text-sm font-bold text-[#B54848] dark:text-[#D56B6B]">{issuesCount}</span>
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-1">Delivery Exceptions</div>
        </button>

        {/* Delivered Card */}
        <button
          type="button"
          onClick={() => setTriageFilter(triageFilter === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            triageFilter === 'DELIVERED'
              ? 'bg-[#EAF5F0] dark:bg-[#16271E] border-[#287A55] dark:border-[#55A878] shadow-xs'
              : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#287A55]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#287A55] dark:text-[#55A878] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Delivered
            </span>
            <span className="font-mono text-sm font-bold text-[#287A55] dark:text-[#55A878]">{deliveredCount}</span>
          </div>
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-1">Fulfilled Shipments</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="stripe-card rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order ID, recipient address, or PIN..."
            className="w-full bg-[#F1F3F5] dark:bg-[#111417] border border-[#E2E5E9] dark:border-[#2B3138] focus:border-[#3157A6] dark:focus:border-[#6D8ED4] focus:bg-white dark:focus:bg-[#181C20] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] placeholder-[#8A919C] dark:placeholder-[#737A84] focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F1F3F5] dark:bg-[#111417] border border-[#E2E5E9] dark:border-[#2B3138] focus:border-[#3157A6] focus:bg-white dark:focus:bg-[#181C20] rounded-lg px-2.5 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer font-medium"
          >
            <option value="">Status: All ({orders.length})</option>
            <option value="CREATED">Created</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="RESCHEDULED">Rescheduled</option>
          </select>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-[#F1F3F5] dark:bg-[#111417] border border-[#E2E5E9] dark:border-[#2B3138] focus:border-[#3157A6] focus:bg-white dark:focus:bg-[#181C20] rounded-lg px-2.5 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer font-medium"
          >
            <option value="">Territory: All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="stripe-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F1F3F5] dark:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] font-mono text-[10px] uppercase border-b border-[#E2E5E9] dark:border-[#2B3138]">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Route & Direction</th>
                <th className="px-4 py-3 font-semibold">Assigned Courier</th>
                <th className="px-4 py-3 font-semibold">Weight & Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Dispatch Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E9] dark:divide-[#2B3138] bg-white dark:bg-[#181C20]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-[#8A919C] dark:text-[#737A84]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono text-[11px]">Loading dispatch pipeline...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-[#5F6672] dark:text-[#A7ADB5]">
                    <Package className="w-8 h-8 text-[#8A919C] dark:text-[#737A84] mx-auto mb-2" />
                    <div className="font-bold text-[#171A1F] dark:text-[#E8EAED] text-xs">No matching shipments found</div>
                    <div className="text-[11px] text-[#8A919C] dark:text-[#737A84]">Try clearing filters or search keywords.</div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const canAssign = order.status === 'CREATED' || order.status === 'RESCHEDULED';

                  return (
                    <tr key={order.id} className="hover:bg-[#F1F3F5]/80 dark:hover:bg-[#1E2328]/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#171A1F] dark:text-[#E8EAED]">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="hover:text-[#3157A6] dark:hover:text-[#6D8ED4] transition-colors cursor-pointer text-xs"
                        >
                          #{order.id.slice(0, 8)}
                        </button>
                        <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] font-sans font-normal mt-0.5">
                          {order.order_type} · {order.payment_type}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} size="sm" />
                      </td>

                      <td className="px-4 py-3 space-y-0.5">
                        <div className="text-[#171A1F] dark:text-[#E8EAED] font-bold truncate max-w-xs font-mono text-[11px] flex items-center gap-1">
                          <span>{order.pickup_pincode}</span>
                          <span className="text-[#8A919C] dark:text-[#737A84]">➔</span>
                          <span className="text-[#3157A6] dark:text-[#6D8ED4]">{order.drop_pincode}</span>
                        </div>
                        <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] truncate max-w-xs">{order.drop_address}</div>
                      </td>

                      <td className="px-4 py-3">
                        {order.agent_name ? (
                          <div className="font-medium text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
                            <span>{order.agent_name}</span>
                          </div>
                        ) : (
                          <span className="text-[#A66A16] dark:text-[#D19A4A] bg-[#FAF3E8] dark:bg-[#292014] px-2 py-0.5 rounded text-[10px] border border-[#F2DEBF] dark:border-[#42321D] font-mono font-bold">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">{order.chargeable_weight_kg} kg</div>
                        <div className="text-[#287A55] dark:text-[#55A878] font-bold">₹{order.total_charge.toFixed(2)}</div>
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5">
                        {canAssign && (
                          <>
                            <button
                              disabled={assigning}
                              onClick={() => handleAutoAssign(order.id)}
                              className="stripe-btn-primary text-[11px] py-1 px-2.5 rounded-md inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 font-bold"
                              title="Auto-Assign Nearest Available Courier"
                            >
                              <Compass className="w-3 h-3" />
                              Auto-Assign
                            </button>
                            <button
                              onClick={() => {
                                setManualAssignOrderId(order.id);
                                setSelectedAgentId('');
                              }}
                              className="bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] font-semibold px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer border border-[#E2E5E9] dark:border-[#2B3138]"
                            >
                              Manual
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setOverrideOrderId(order.id);
                            setOverrideStatus(order.status);
                          }}
                          className="text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] p-1 rounded hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] transition-colors cursor-pointer"
                          title="Administrative Status Override"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Assign Result Modal */}
      {assignmentResult && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl modal-animate">
            <div className="flex items-center gap-2 text-[#171A1F] dark:text-[#E8EAED] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#287A55] dark:text-[#55A878]" />
              Auto-Assignment Dispatched
            </div>
            <div className="space-y-2 bg-[#F1F3F5] dark:bg-[#1E2328] p-3.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#5F6672] dark:text-[#A7ADB5]">Order:</span>
                <span className="font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold">#{assignmentResult.orderId.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6672] dark:text-[#A7ADB5]">Assigned Agent:</span>
                <span className="font-bold text-[#287A55] dark:text-[#55A878]">{assignmentResult.agentName || 'Assigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6672] dark:text-[#A7ADB5]">Candidate Pool:</span>
                <span className="font-mono text-[#171A1F] dark:text-[#E8EAED]">{assignmentResult.candidateCount} eligible agent(s)</span>
              </div>
              {assignmentResult.distanceKm !== undefined && assignmentResult.distanceKm !== null && (
                <div className="flex justify-between">
                  <span className="text-[#5F6672] dark:text-[#A7ADB5]">Haversine Distance:</span>
                  <span className="font-mono text-[#426B9E] dark:text-[#7095C4] font-bold">{assignmentResult.distanceKm} km</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#5F6672] dark:text-[#A7ADB5]">Rule:</span>
                <span className="font-mono text-[#287A55] dark:text-[#55A878] font-medium">{assignmentResult.reason}</span>
              </div>
            </div>
            <button
              onClick={() => setAssignmentResult(null)}
              className="w-full stripe-btn-primary py-2 rounded-lg text-xs cursor-pointer font-bold"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Manual Assign Modal */}
      {manualAssignOrderId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleManualAssignSubmit} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl modal-animate">
            <div className="font-bold text-sm text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
              Manual Agent Assignment
            </div>
            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Select Delivery Agent</label>
              <select
                required
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Agent --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.availability_status !== 'AVAILABLE' || a.current_load >= a.max_capacity}>
                    {a.name} ({a.current_zone_name || 'Zone'}) - {a.availability_status} (Load: {a.current_load}/{a.max_capacity})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setManualAssignOrderId(null)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning || !selectedAgentId}
                className="stripe-btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 font-bold"
              >
                {assigning ? 'Assigning...' : 'Assign Agent'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Status Override Modal */}
      {overrideOrderId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleOverrideSubmit} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-3.5 text-xs shadow-xl modal-animate">
            <div className="font-bold text-sm text-[#A66A16] dark:text-[#D19A4A] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#A66A16] dark:text-[#D19A4A]" />
              Administrative Status Override (Audited)
            </div>
            <p className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">
              Directly transitions order status with immutable administrative audit logging.
            </p>
            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Target Status</label>
              <select
                required
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer"
              >
                <option value="CREATED">CREATED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED_UP</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
                <option value="RESCHEDULED">RESCHEDULED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Audit Reason</label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for administrative override"
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setOverrideOrderId(null)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overriding}
                className="stripe-btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 font-bold"
              >
                {overriding ? 'Updating...' : 'Execute Override'}
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
          onRefreshNeeded={fetchData}
        />
      )}
    </div>
  );
};
