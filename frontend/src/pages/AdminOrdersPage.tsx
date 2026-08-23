import React, { useState, useEffect } from 'react';
import { ordersApi, adminApi, extractErrorMessage } from '../api/client';
import { Order, Agent, Zone } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { Package, Search, Filter, Compass, UserCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [search, setSearch] = useState('');

  // Selected Order
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Assignment Modal
  const [manualAssignOrderId, setManualAssignOrderId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Auto-assignment result toast/modal
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

  // Static Metadata (fetched once on mount)
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

  // Fetch agents & zones once on mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  // Debounced order fetch on search or filter change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 200);

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
        mode: res.assignment.mode,
        candidateCount: res.assignment.candidate_count,
        distanceKm: res.assignment.distance_km,
        reason: res.assignment.reason,
      });
      await fetchData();
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
        mode: 'manual',
        agent_id: selectedAgentId,
      });
      setManualAssignOrderId(null);
      setSelectedAgentId('');
      await fetchData();
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
        reason: overrideReason || 'Admin manual override',
        admin_override: true,
      });
      setOverrideOrderId(null);
      setOverrideStatus('');
      setOverrideReason('');
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setOverriding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            Shipment Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-dispatch nearest agents, manage assignments, and monitor delivery progress.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Orders
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

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="CREATED">Created (Unassigned)</option>
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
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-700">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Route & Zones</th>
                <th className="p-4">Agent</th>
                <th className="p-4">Weight & Total</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 bg-slate-900/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">No matching orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const canAssign = order.status === 'CREATED' || order.status === 'RESCHEDULED';

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-200">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="hover:text-indigo-400 underline underline-offset-2"
                        >
                          #{order.id.slice(0, 8)}
                        </button>
                        <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                          {order.order_type} · {order.payment_type}
                        </div>
                      </td>

                      <td className="p-4">
                        <StatusBadge status={order.status} size="sm" />
                      </td>

                      <td className="p-4 space-y-1">
                        <div className="text-slate-300 font-medium truncate max-w-xs">
                          {order.pickup_pincode} ({order.pickup_zone_name || 'Zone'}) → {order.drop_pincode} ({order.drop_zone_name || 'Zone'})
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{order.drop_address}</div>
                      </td>

                      <td className="p-4">
                        {order.agent_name ? (
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{order.agent_name}</span>
                          </div>
                        ) : (
                          <span className="text-amber-400/80 bg-amber-950/40 px-2 py-0.5 rounded text-[10px] border border-amber-800/50">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono">
                        <div className="text-slate-300">{order.chargeable_weight_kg} kg billed</div>
                        <div className="text-emerald-400 font-bold">₹{order.total_charge.toFixed(2)}</div>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {canAssign && (
                          <>
                            <button
                              disabled={assigning}
                              onClick={() => handleAutoAssign(order.id)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1 shadow"
                              title="Auto-Assign Nearest Available Agent"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              Auto-Assign
                            </button>
                            <button
                              onClick={() => {
                                setManualAssignOrderId(order.id);
                                setSelectedAgentId('');
                              }}
                              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-2 py-1.5 rounded-lg text-xs transition-colors"
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
                          className="text-slate-400 hover:text-amber-300 p-1 rounded"
                          title="Admin Status Override"
                        >
                          <ShieldAlert className="w-4 h-4" />
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
      {assignmentResult && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-600/60 p-6 rounded-2xl max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Auto-Assignment Successful
            </div>
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Order:</span>
                <span className="font-mono text-slate-200 font-bold">#{assignmentResult.orderId.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Candidates Evaluated:</span>
                <span className="font-mono text-slate-200">{assignmentResult.candidateCount} eligible agent(s)</span>
              </div>
              {assignmentResult.distanceKm !== undefined && assignmentResult.distanceKm !== null && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Haversine Distance:</span>
                  <span className="font-mono text-cyan-400 font-bold">{assignmentResult.distanceKm} km</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Assignment Reason:</span>
                <span className="font-mono text-emerald-400">{assignmentResult.reason}</span>
              </div>
            </div>
            <button
              onClick={() => setAssignmentResult(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Manual Assign Modal */}
      {manualAssignOrderId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleManualAssignSubmit} className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full space-y-4 text-xs">
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              Manual Agent Assignment
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Select Delivery Agent</label>
              <select
                required
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
              >
                <option value="">-- Choose Agent --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.availability_status !== 'AVAILABLE' || a.current_load >= a.max_capacity}>
                    {a.name} ({a.current_zone_name || 'Zone'}) - {a.availability_status} (Load: {a.current_load}/{a.max_capacity})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManualAssignOrderId(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning || !selectedAgentId}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign Agent'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Override Modal */}
      {overrideOrderId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleOverrideSubmit} className="bg-slate-900 border border-amber-700/60 p-6 rounded-2xl max-w-md w-full space-y-4 text-xs">
            <div className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Admin Status Override (Audited)
            </div>
            <p className="text-slate-400">
              Admin overrides bypass the standard state machine checks but are recorded as a distinct, audited event in the immutable timeline.
            </p>
            <div>
              <label className="block text-slate-400 mb-1">Target Status</label>
              <select
                required
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
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
              <label className="block text-slate-400 mb-1">Audit Reason</label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for administrative override"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideOrderId(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overriding}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {overriding ? 'Updating...' : 'Execute Override'}
              </button>
            </div>
          </form>
        </div>
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
