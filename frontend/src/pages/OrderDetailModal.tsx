import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, extractErrorMessage } from '../api/client';
import { Order, TimelineEntry, DeliveryAttempt, AssignmentDecision, OrderStatus, NotificationRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';
import { DeliveryAttemptsList } from '../components/DeliveryAttemptsList';
import { AssignmentAuditCard } from '../components/AssignmentAuditCard';
import { 
  Package, 
  MapPin, 
  CreditCard, 
  Calendar, 
  RotateCcw, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  History, 
  X, 
  Truck,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  User,
  Phone,
  Box,
  Compass,
  ArrowRight,
  Check,
  MessageSquare,
  Mail,
  Bell,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Inbox,
  CheckCheck,
} from 'lucide-react';

interface Props {
  orderId: string;
  onClose: () => void;
  onRefreshNeeded?: () => void;
}

// Clean helper to extract legible email info for Inbox view
const parseEmailContent = (htmlOrText: string): { title: string; body: string; snippet: string; details: Array<{ label: string; value: string }> } => {
  if (!htmlOrText) return { title: '', body: '', snippet: '', details: [] };
  try {
    const doc = new DOMParser().parseFromString(htmlOrText, 'text/html');
    const title = doc.querySelector('h1')?.textContent?.trim() || '';
    const paragraphs = Array.from(doc.querySelectorAll('p'))
      .map((p) => p.textContent?.trim())
      .filter((text) => text && !text.includes('©') && !text.includes('All rights reserved') && !text.includes('Automated notification'))
      .join(' ');
    const details: Array<{ label: string; value: string }> = [];
    doc.querySelectorAll('tr').forEach((tr) => {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length >= 2) {
        const l = tds[0].textContent?.trim() || '';
        const v = tds[1].textContent?.trim() || '';
        if (l && v && !l.includes('Last-Mile')) {
          details.push({ label: l, value: v });
        }
      }
    });
    const snippet = paragraphs.slice(0, 100) + (paragraphs.length > 100 ? '...' : '');
    return { title, body: paragraphs, snippet, details };
  } catch {
    const clean = htmlOrText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return { title: '', body: clean, snippet: clean.slice(0, 100), details: [] };
  }
};

// Visual 5-node stepper logic
const getJourneyNodes = (status: OrderStatus) => {
  const steps = [
    { key: 'CREATED', label: 'Order Registered', desc: 'Order received & validated' },
    { key: 'ASSIGNED', label: 'Carrier Assigned', desc: 'Matched with nearest courier' },
    { key: 'IN_TRANSIT', label: 'In Transit to Hub', desc: 'Package in transport' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Final-mile driver on route' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Signed & fulfilled' },
  ];

  const statusIndexMap: Record<string, number> = {
    CREATED: 0,
    ASSIGNED: 1,
    PICKED_UP: 2,
    IN_TRANSIT: 2,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4,
    FAILED: 3,
    RESCHEDULED: 1,
    CANCELLED: -1,
  };

  const currentIndex = statusIndexMap[status] ?? 0;
  return { steps, currentIndex, isFailed: status === 'FAILED' };
};

export const OrderDetailModal: React.FC<Props> = ({ orderId, onClose, onRefreshNeeded }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDecision[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactional Email Alerts Panel
  const [showAlerts, setShowAlerts] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Reschedule Form
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, timeRes, attRes, assignRes, notifRes] = await Promise.all([
        ordersApi.getOrder(orderId),
        ordersApi.getTimeline(orderId),
        ordersApi.getAttempts(orderId),
        ordersApi.getAssignments(orderId),
        ordersApi.getNotifications(orderId).catch(() => []),
      ]);
      setOrder(orderRes);
      setTimeline(timeRes);
      setAttempts(attRes);
      setAssignments(assignRes);
      setNotifications(notifRes);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [orderId]);

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    setRescheduling(true);
    try {
      await ordersApi.rescheduleOrder(orderId, {
        new_scheduled_date: newDate,
        reason: rescheduleReason || 'Customer requested date change',
      });
      setShowReschedule(false);
      await fetchDetail();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setRescheduling(false);
    }
  };

  if (typeof document !== 'undefined' && !orderId) return null;

  const emailList = notifications.filter((n) => n.channel === 'EMAIL' || !n.channel);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl modal-animate text-xs">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E5E9] dark:border-[#2B3138] flex items-center justify-between gap-4 shrink-0 bg-[#F1F3F5]/50 dark:bg-[#1E2328]/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#171A1F] dark:text-[#E8EAED]">
                  Tracking #{orderId.slice(0, 8)}
                </span>
                {order && <StatusBadge status={order.status} size="sm" />}
              </div>
              <p className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono mt-0.5">
                UUID: {orderId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order && (order.status === 'FAILED' || order.status === 'RESCHEDULED') && (
              <button
                onClick={() => setShowReschedule(!showReschedule)}
                className="stripe-btn-primary px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reschedule Delivery</span>
              </button>
            )}

            {/* Notifications Button to the left of close cross */}
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
                showAlerts
                  ? 'bg-[#3157A6] text-white border-[#3157A6] shadow-xs'
                  : 'bg-white dark:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] border-[#E2E5E9] dark:border-[#2B3138] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
              }`}
              title="View Transactional Email Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications</span>
              {notifications.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    showAlerts
                      ? 'bg-white/20 text-white'
                      : 'bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4]'
                  }`}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Close Cross Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-16 text-center text-[#8A919C] dark:text-[#737A84] flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs">Loading complete audit history...</span>
            </div>
          ) : error || !order ? (
            <div className="p-6 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-2xl text-[#B54848] dark:text-[#D56B6B]">
              {error || 'Order details not found'}
            </div>
          ) : showAlerts ? (
            /* Dedicated Transactional Email Notifications Panel */
            <div className="space-y-4 animate-in fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F1F3F5] dark:bg-[#1E2328] p-3 rounded-2xl border border-[#E2E5E9] dark:border-[#2B3138]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#171A1F] dark:text-[#E8EAED] text-xs">
                        Transactional Email Inbox
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3157A6] text-white">
                        {emailList.length} Messages
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5]">
                      Branded lifecycle emails dispatched to the customer inbox
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAlerts(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-white dark:hover:bg-[#181C20] transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto border border-transparent hover:border-[#E2E5E9] dark:hover:border-[#2B3138]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Order Journey</span>
                </button>
              </div>

              {/* Email List Style */}
              <div className="space-y-3 animate-in fade-in">
                {emailList.length === 0 ? (
                  <div className="p-12 text-center bg-[#F8FAFC] dark:bg-[#1A2027] border border-[#E2E8F0] dark:border-[#2B3138] rounded-2xl space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] flex items-center justify-center mx-auto">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-[#171A1F] dark:text-[#E8EAED] text-xs">Your Inbox is Empty</div>
                    <p className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] max-w-sm mx-auto">
                      Transactional HTML emails are dispatched to the customer on order lifecycle updates.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#181C20] border border-[#E2E8F0] dark:border-[#2B3138] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#E2E5E9] dark:divide-[#2B3138]">
                    {/* Email Inbox Rows */}
                    {emailList.map((notif) => {
                      const parsed = parseEmailContent(notif.body);
                      const isExpanded = expandedEmailId === notif.id;

                      return (
                        <div key={notif.id} className="transition-colors">
                          {/* Inbox Row Header */}
                          <div
                            onClick={() => setExpandedEmailId(isExpanded ? null : notif.id)}
                            className="p-3.5 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2328] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] shrink-0">
                                <Mail className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-[#171A1F] dark:text-[#E8EAED] text-xs">
                                    {notif.subject || 'Order Notification'}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                                      notif.status === 'SENT'
                                        ? 'bg-[#EBF7EE] text-[#287A55] dark:bg-[#162B1D] dark:text-[#55A878]'
                                        : 'bg-[#FAF0F0] text-[#B54848] dark:bg-[#2B1717] dark:text-[#D56B6B]'
                                    }`}
                                  >
                                    {notif.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] truncate max-w-lg">
                                  {parsed.snippet || 'Click to open email'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <span className="font-mono text-[11px] text-[#8A919C] dark:text-[#737A84]">
                                {new Date(notif.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#8A919C]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#8A919C]" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Email Viewer — Clean Sandboxed HTML Email Client */}
                          {isExpanded && (
                            <div className="p-4 bg-[#F8FAFC] dark:bg-[#12161A] border-t border-[#E2E5E9] dark:border-[#2B3138] space-y-3 animate-in fade-in">
                              <div className="flex items-center justify-between text-[11px] text-[#5F6672] dark:text-[#A7ADB5] border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2">
                                <div className="space-y-0.5">
                                  <div>
                                    <strong className="text-[#171A1F] dark:text-[#E8EAED]">Subject:</strong> {notif.subject}
                                  </div>
                                  <div>
                                    <strong className="text-[#171A1F] dark:text-[#E8EAED]">Delivery Channel:</strong> Transactional Email (
                                    <span className={notif.status === 'SENT' ? 'text-[#287A55] font-bold' : 'text-[#B54848] font-bold'}>
                                      {notif.status === 'SENT' ? 'Delivered to Inbox' : 'Dispatch Recorded'}
                                    </span>
                                    )
                                  </div>
                                </div>
                                <span className="font-mono text-[10px] text-[#8A919C]">
                                  {new Date(notif.created_at).toUTCString()}
                                </span>
                              </div>

                              <div className="rounded-xl overflow-hidden border border-[#E2E5E9] dark:border-[#2B3138] bg-white shadow-xs">
                                {notif.body.includes('<html') || notif.body.includes('<table') ? (
                                  <iframe
                                    srcDoc={notif.body}
                                    title={notif.subject || 'Email Preview'}
                                    className="w-full h-[380px] border-0 rounded-xl bg-white"
                                    sandbox="allow-same-origin"
                                  />
                                ) : (
                                  <div className="p-4 text-xs text-[#171A1F] dark:text-[#E8EAED] whitespace-pre-wrap leading-relaxed">
                                    {notif.body}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal Order Journey View */
            <>
              {/* Visual 5-Stage Journey Stepper */}
              {(() => {
                const journey = getJourneyNodes(order.status);
                return (
                  <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                        Delivery Journey Progress
                      </span>
                      <span className="text-[11px] font-mono text-[#5F6672] dark:text-[#A7ADB5]">
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 relative">
                      {journey.steps.map((s, idx) => {
                        const isPast = idx < journey.currentIndex;
                        const isCurrent = idx === journey.currentIndex;
                        const isPending = idx > journey.currentIndex;

                        return (
                          <div key={s.key} className="text-center space-y-1.5 relative">
                            {/* Circle Indicator */}
                            <div className="flex justify-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isPast
                                  ? 'bg-[#287A55] dark:bg-[#55A878] text-white'
                                  : isCurrent
                                  ? journey.isFailed
                                    ? 'bg-[#B54848] dark:bg-[#D56B6B] text-white animate-pulse'
                                    : 'bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417] ring-4 ring-[#3157A6]/20'
                                  : 'bg-white dark:bg-[#181C20] text-[#8A919C] dark:text-[#737A84] border border-[#E2E5E9] dark:border-[#2B3138]'
                              }`}>
                                {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                              </div>
                            </div>

                            <div className="text-[11px] font-bold text-[#171A1F] dark:text-[#E8EAED] leading-tight">
                              {s.label}
                            </div>
                            <div className="text-[9px] text-[#5F6672] dark:text-[#A7ADB5] hidden sm:block">
                              {s.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Reschedule Dropdown Form */}
              {showReschedule && (
                <form
                  onSubmit={handleRescheduleSubmit}
                  className="p-4 bg-[#FAF3E8] dark:bg-[#292014] border border-[#F2DEBF] dark:border-[#42321D] rounded-2xl space-y-3 animate-in fade-in"
                >
                  <div className="font-bold text-[#A66A16] dark:text-[#D19A4A] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Reschedule Delivery Date
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">New Delivery Date</label>
                      <input
                        type="date"
                        required
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">Reason for Reschedule</label>
                      <input
                        type="text"
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        placeholder="e.g., Customer requested next-day afternoon"
                        className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReschedule(false)}
                      className="px-3 py-1.5 bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] rounded-lg border border-[#E2E5E9] dark:border-[#2B3138] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={rescheduling}
                      className="stripe-btn-primary px-4 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 font-bold"
                    >
                      {rescheduling ? 'Updating...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </form>
              )}

              {/* Route & Billing Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Origin & Destination */}
                <div className="stripe-card rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-[#171A1F] dark:text-[#E8EAED] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#3157A6] dark:text-[#6D8ED4]" />
                    Routing & Territory
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-[#8A919C] dark:text-[#737A84] block">Origin (Pickup)</span>
                      <div className="text-[#171A1F] dark:text-[#E8EAED] font-medium">{order.pickup_address}</div>
                      <div className="text-[#5F6672] dark:text-[#A7ADB5] font-mono text-[11px]">PIN: {order.pickup_pincode} ({order.pickup_zone_name || 'Zone'})</div>
                    </div>
                    <div className="text-xs pt-1.5 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                      <span className="text-[10px] uppercase font-bold text-[#8A919C] dark:text-[#737A84] block">Destination (Drop)</span>
                      <div className="text-[#171A1F] dark:text-[#E8EAED] font-semibold">{order.drop_address}</div>
                      <div className="text-[#5F6672] dark:text-[#A7ADB5] font-mono text-[11px]">PIN: {order.drop_pincode} ({order.drop_zone_name || 'Zone'})</div>
                    </div>
                  </div>
                </div>

                {/* Billing & Package Snapshot */}
                <div className="stripe-card rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#171A1F] dark:text-[#E8EAED] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2">
                      <CreditCard className="w-3.5 h-3.5 text-[#287A55] dark:text-[#55A878]" />
                      Billing & Package Spec
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-xs">
                      <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-2 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                        <span className="text-[#8A919C] dark:text-[#737A84] text-[9px] uppercase font-sans font-semibold block">Dimensions</span>
                        <span className="text-[#171A1F] dark:text-[#E8EAED]">{order.length_cm}×{order.breadth_cm}×{order.height_cm} cm</span>
                      </div>
                      <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-2 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                        <span className="text-[#8A919C] dark:text-[#737A84] text-[9px] uppercase font-sans font-semibold block">Actual / Vol Wt</span>
                        <span className="text-[#171A1F] dark:text-[#E8EAED]">{order.actual_weight_kg} / {order.volumetric_weight_kg.toFixed(2)} kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#171A1F] dark:bg-[#111417] text-white p-3 rounded-xl flex items-center justify-between border border-[#2B3138]">
                    <div>
                      <span className="text-[10px] text-[#8A919C] uppercase font-bold block">{order.order_type} · {order.payment_type}</span>
                      <span className="text-[10px] text-[#8A919C]">Chargeable Wt: {order.chargeable_weight_kg} kg</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black text-[#55A878]">₹{order.total_charge.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-Assignment Decision Engine Audit */}
              {assignments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
                    Automated Assignment Decision Engine Audit
                  </h3>
                  <AssignmentAuditCard decisions={assignments} />
                </div>
              )}

              {/* Delivery Attempt History */}
              {attempts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
                    Delivery Attempt History ({attempts.length})
                  </h3>
                  <DeliveryAttemptsList attempts={attempts} />
                </div>
              )}

              {/* Immutable Timeline */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#3157A6] dark:text-[#6D8ED4]" />
                  Lifecycle State Audit Trail ({timeline.length} Events)
                </h3>
                <OrderTimeline entries={timeline} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
