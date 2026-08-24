import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, extractErrorMessage } from '../api/client';
import { Order, OrderStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  Mail, 
  ShieldCheck, 
  X, 
  Check, 
  RefreshCw,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Props {
  onCreateOrderClick: () => void;
}

// 6-stage logistics pipeline helper
const STAGES = [
  { key: 'CREATED', label: 'Created' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const getStageIndex = (status: OrderStatus): number => {
  switch (status) {
    case 'CREATED':
      return 0;
    case 'ASSIGNED':
      return 1;
    case 'PICKED_UP':
      return 2;
    case 'IN_TRANSIT':
      return 3;
    case 'OUT_FOR_DELIVERY':
      return 4;
    case 'DELIVERED':
      return 5;
    case 'FAILED':
      return 4; // shows failure during delivery attempt
    case 'RESCHEDULED':
      return 1; // returned to assignment queue
    case 'CANCELLED':
      return -1;
    default:
      return 0;
  }
};

const getStageLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'CREATED':
      return 'Stage 1 of 6 · Order Created';
    case 'ASSIGNED':
      return 'Stage 2 of 6 · Courier Assigned';
    case 'PICKED_UP':
      return 'Stage 3 of 6 · Package Picked Up';
    case 'IN_TRANSIT':
      return 'Stage 4 of 6 · In Transit to Hub';
    case 'OUT_FOR_DELIVERY':
      return 'Stage 5 of 6 · Out for Final Delivery';
    case 'DELIVERED':
      return 'Stage 6 of 6 · Delivered Successfully';
    case 'FAILED':
      return 'Delivery Attempt Exception · Rescheduled';
    case 'RESCHEDULED':
      return 'Rescheduled for Next Attempt';
    case 'CANCELLED':
      return 'Order Cancelled';
    default:
      return status;
  }
};

export const CustomerDashboard: React.FC<Props> = ({ onCreateOrderClick }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'FAILED'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.listOrders({
        search: search.trim() || undefined,
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
    }, 180);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter orders according to user intent
  const filteredOrders = orders.filter((o) => {
    if (activeTabFilter === 'ACTIVE') {
      return ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status);
    }
    if (activeTabFilter === 'DELIVERED') {
      return o.status === 'DELIVERED';
    }
    if (activeTabFilter === 'FAILED') {
      return o.status === 'FAILED' || o.status === 'RESCHEDULED';
    }
    return true;
  });

  const activeCount = orders.filter(o => ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;
  const issueCount = orders.filter(o => o.status === 'FAILED' || o.status === 'RESCHEDULED').length;

  const filterContainerRef = React.useRef<HTMLDivElement>(null);
  const [filterIndicator, setFilterIndicator] = React.useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  React.useEffect(() => {
    if (!filterContainerRef.current) return;
    const activeBtn = filterContainerRef.current.querySelector<HTMLButtonElement>(`[data-filter="${activeTabFilter}"]`);
    if (activeBtn) {
      setFilterIndicator({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        ready: true,
      });
    }
  }, [activeTabFilter, orders.length, activeCount, deliveredCount, issueCount]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">

      {/* Header with Human-Centric Greeting & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#E2E5E9] dark:border-[#2B3138]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              Welcome back, {user?.name.split(' ')[0] || 'Customer'}
            </h1>
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E] px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] animate-pulse" />
                {activeCount} in transit
              </span>
            )}
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            Track real-time shipment status, view proof of delivery, and receive automated email updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Email Notification Indicator */}
          <div
            className="px-3 py-1.5 bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-lg text-xs flex items-center gap-2 shadow-2xs"
            title="Transactional email notifications dispatched to registered email"
          >
            <div className="p-1 rounded-md bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4]">
              <Mail className="w-3 h-3" />
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-medium hidden xs:inline">Email Alerts:</span>
              <span className="font-mono text-[#3157A6] dark:text-[#6D8ED4] font-bold flex items-center gap-1 text-[11px]">
                {user?.email}
                <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878] animate-pulse" />
              </span>
            </div>
          </div>

          <button
            onClick={onCreateOrderClick}
            className="stripe-btn-primary text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Shipment</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Psychological Quick Intent Tabs with sliding indicator */}
        <div ref={filterContainerRef} className="relative flex items-center gap-1 bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] p-1 rounded-xl text-xs overflow-x-auto">
          {filterIndicator.ready && (
            <div
              className="absolute top-1 bottom-1 bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-lg shadow-2xs transition-all duration-200 ease-spring pointer-events-none z-0"
              style={{
                left: `${filterIndicator.left}px`,
                width: `${filterIndicator.width}px`,
              }}
            />
          )}

          <button
            data-filter="ALL"
            onClick={() => setActiveTabFilter('ALL')}
            className={`relative z-10 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTabFilter === 'ALL'
                ? 'text-[#171A1F] dark:text-[#E8EAED]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            All Shipments ({orders.length})
          </button>

          <button
            data-filter="ACTIVE"
            onClick={() => setActiveTabFilter('ACTIVE')}
            className={`relative z-10 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTabFilter === 'ACTIVE'
                ? 'text-[#3157A6] dark:text-[#6D8ED4]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            Active ({activeCount})
          </button>

          <button
            data-filter="DELIVERED"
            onClick={() => setActiveTabFilter('DELIVERED')}
            className={`relative z-10 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTabFilter === 'DELIVERED'
                ? 'text-[#287A55] dark:text-[#55A878]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            Delivered ({deliveredCount})
          </button>

          {issueCount > 0 && (
            <button
              data-filter="FAILED"
              onClick={() => setActiveTabFilter('FAILED')}
              className={`relative z-10 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTabFilter === 'FAILED'
                  ? 'text-[#A66A16] dark:text-[#D19A4A]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
              }`}
            >
              Action Needed ({issueCount})
            </button>
          )}
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address, PIN, or order ID..."
            className="w-full bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] focus:border-[#3157A6] dark:focus:border-[#6D8ED4] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] placeholder-[#8A919C] dark:placeholder-[#737A84] focus:outline-none transition-all shadow-2xs"
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
      </div>

      {/* Orders Grid with Visual Pipeline Progress */}
      {loading ? (
        <div className="p-16 text-center text-[#8A919C] dark:text-[#737A84] text-xs stripe-card rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[11px]">Syncing live shipments...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-2xl text-[#B54848] dark:text-[#D56B6B] text-xs">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center text-[#5F6672] dark:text-[#A7ADB5] text-xs stripe-card rounded-2xl space-y-4">
          <Package className="w-10 h-10 text-[#8A919C] dark:text-[#737A84] mx-auto" />
          <div className="font-bold text-[#171A1F] dark:text-[#E8EAED] text-sm">No shipments in this view</div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] max-w-sm mx-auto">
            {search ? 'No orders match your search term.' : 'Ready to ship? Create your first delivery in seconds.'}
          </p>
          <button
            onClick={onCreateOrderClick}
            className="stripe-btn-primary text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Shipment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order, idx) => {
            const currentStageIdx = getStageIndex(order.status);
            const stageLabel = getStageLabel(order.status);
            const isFailed = order.status === 'FAILED';
            const isDelivered = order.status === 'DELIVERED';
            const isRescheduled = order.status === 'RESCHEDULED';

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                style={{ animationDelay: `${idx * 25}ms` }}
                className="stripe-card-interactive card-enter rounded-2xl p-5 cursor-pointer space-y-3.5 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* 1. Top Bar: Order ID & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#171A1F] dark:text-[#E8EAED] group-hover:text-[#3157A6] dark:group-hover:text-[#6D8ED4] transition-colors">
                      #{order.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>

                  {/* 2. 6-Stage Logistics Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${
                        isFailed 
                          ? 'text-[#B54848] dark:text-[#D56B6B]' 
                          : isRescheduled
                          ? 'text-[#A66A16] dark:text-[#D19A4A]'
                          : isDelivered 
                          ? 'text-[#287A55] dark:text-[#55A878]' 
                          : 'text-[#3157A6] dark:text-[#6D8ED4]'
                      }`}>
                        {stageLabel}
                      </span>
                    </div>

                    {/* 6 Segment Progress Bar */}
                    <div className="grid grid-cols-6 gap-1 h-1.5 w-full">
                      {STAGES.map((st, sIdx) => {
                        let barClass = 'bg-[#E2E5E9] dark:bg-[#2B3138]'; // future muted
                        if (isFailed && sIdx === currentStageIdx) {
                          barClass = 'bg-[#B54848] dark:bg-[#D56B6B]';
                        } else if (isRescheduled && sIdx <= currentStageIdx) {
                          barClass = 'bg-[#A66A16] dark:text-[#D19A4A]';
                        } else if (isDelivered) {
                          barClass = 'bg-[#287A55] dark:bg-[#55A878]';
                        } else if (sIdx < currentStageIdx) {
                          barClass = 'bg-[#3157A6] dark:bg-[#6D8ED4]'; // past subdued
                        } else if (sIdx === currentStageIdx) {
                          barClass = 'bg-[#3157A6] dark:bg-[#6D8ED4] ring-1 ring-[#3157A6]/50 dark:ring-[#6D8ED4]/50'; // current prominent
                        }

                        return (
                          <div
                            key={st.key}
                            title={`${sIdx + 1}. ${st.label}`}
                            className={`h-full rounded-full transition-all duration-200 ${barClass}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Destination Address */}
                  <div className="space-y-1 text-xs">
                    <div className="text-[#171A1F] dark:text-[#E8EAED] truncate font-semibold text-[13px]">
                      {order.drop_address}
                    </div>
                    <div className="text-[#5F6672] dark:text-[#A7ADB5] text-xs flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] shrink-0" />
                      <span>PIN <span className="font-mono font-medium">{order.drop_pincode}</span> ({order.drop_zone_name || 'Destination'})</span>
                    </div>
                  </div>

                  {/* 4. Courier Assignment Status */}
                  <div className="text-xs bg-[#F1F3F5] dark:bg-[#1E2328] px-3 py-2 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] flex items-center justify-between">
                    <span className="text-[#5F6672] dark:text-[#A7ADB5]">Courier:</span>
                    <span className="font-medium text-[#171A1F] dark:text-[#E8EAED]">
                      {order.agent_name ? order.agent_name : order.agent_id ? 'Assigned & Dispatched' : 'Auto-Dispatch Active'}
                    </span>
                  </div>

                  {/* 5. Specs Pill: Weight & Amount */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F1F3F5] dark:bg-[#1E2328] p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                    <div>
                      <span className="text-[#8A919C] dark:text-[#737A84] block text-[10px] uppercase font-semibold">Weight</span>
                      <strong className="text-[#171A1F] dark:text-[#E8EAED]">{order.chargeable_weight_kg} kg</strong>
                    </div>
                    <div>
                      <span className="text-[#8A919C] dark:text-[#737A84] block text-[10px] uppercase font-semibold">Amount ({order.payment_type})</span>
                      <strong className="text-[#287A55] dark:text-[#55A878] font-bold">₹{order.total_charge.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* 6. Footer Action Card */}
                <div className="pt-2.5 border-t border-[#E2E5E9] dark:border-[#2B3138] flex items-center justify-between text-xs text-[#8A919C] dark:text-[#737A84] group-hover:text-[#3157A6] dark:group-hover:text-[#6D8ED4] transition-colors">
                  <span className="text-xs text-[#8A919C] dark:text-[#737A84]">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-xs">
                    Track Shipment <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
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
