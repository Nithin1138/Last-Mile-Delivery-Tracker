import React, { useState, useEffect } from 'react';
import { ordersApi, extractErrorMessage } from '../api/client';
import { PriceQuote, Order, AssignmentDecision } from '../types';
import { PricingBreakdownCard } from '../components/PricingBreakdownCard';
import { 
  Package, 
  MapPin, 
  Calculator, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  CreditCard,
  ShieldCheck,
  Zap,
  Box,
  Truck,
  HelpCircle,
  Check,
  Building2,
  User,
  Sliders,
  Compass,
  RotateCcw,
  Clock
} from 'lucide-react';

interface Props {
  onOrderCreated: (orderId: string) => void;
}

export const OrderCreatePage: React.FC<Props> = ({ onOrderCreated }) => {
  // Form State
  const [pickupAddress, setPickupAddress] = useState('Road No. 36, Jubilee Hills, Hyderabad');
  const [pickupPincode, setPickupPincode] = useState('500034');
  const [dropAddress, setDropAddress] = useState('Benz Circle, MG Road, Vijayawada');
  const [dropPincode, setDropPincode] = useState('520010');

  // Package Dimensions
  const [lengthCm, setLengthCm] = useState<number>(50);
  const [breadthCm, setBreadthCm] = useState<number>(40);
  const [heightCm, setHeightCm] = useState<number>(30);
  const [actualWeightKg, setActualWeightKg] = useState<number>(8);

  // Business Parameters
  const [orderType, setOrderType] = useState<'B2C' | 'B2B'>('B2C');
  const [paymentType, setPaymentType] = useState<'PREPAID' | 'COD'>('COD');

  // Pricing State
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'inter' | 'intra' | 'heavy' | null>('inter');
  const [activeSize, setActiveSize] = useState<'small' | 'standard' | 'large' | null>('standard');

  // Dominant Post-Confirmation State
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [assignedDecision, setAssignedDecision] = useState<AssignmentDecision | null>(null);
  const [dispatchStep, setDispatchStep] = useState<'IDLE' | 'CREATING' | 'DISPATCHING' | 'SUCCESS'>('IDLE');

  // Computed Volumetric Weight for instant feedback
  const volumetricWeightKg = (lengthCm * breadthCm * heightCm) / 5000;
  const chargeableWeightKg = Math.max(actualWeightKg, volumetricWeightKg);
  const isVolumetricHigher = volumetricWeightKg > actualWeightKg;

  // Preset Route Benchmarks for cognitive ease
  const applyPreset = (type: 'inter' | 'intra' | 'heavy') => {
    setActivePreset(type);
    if (type === 'inter') {
      setPickupAddress('Road No. 36, Jubilee Hills, Hyderabad');
      setPickupPincode('500034');
      setDropAddress('Benz Circle, MG Road, Vijayawada');
      setDropPincode('520010');
      setLengthCm(50);
      setBreadthCm(40);
      setHeightCm(30);
      setActualWeightKg(8);
      setOrderType('B2C');
      setPaymentType('COD');
      setActiveSize('standard');
    } else if (type === 'intra') {
      setPickupAddress('Abids Commercial Centre, Hyderabad');
      setPickupPincode('500001');
      setDropAddress('Mindspace Cyber Towers, HITEC City, Madhapur');
      setDropPincode('500081');
      setLengthCm(25);
      setBreadthCm(20);
      setHeightCm(15);
      setActualWeightKg(2.5);
      setOrderType('B2C');
      setPaymentType('PREPAID');
      setActiveSize('small');
    } else if (type === 'heavy') {
      setPickupAddress('Gajuwaka Industrial Hub, Visakhapatnam');
      setPickupPincode('530045');
      setDropAddress('Kukatpally Commercial Complex, Hyderabad');
      setDropPincode('500090');
      setLengthCm(80);
      setBreadthCm(60);
      setHeightCm(50);
      setActualWeightKg(28);
      setOrderType('B2B');
      setPaymentType('PREPAID');
      setActiveSize(null);
    }
  };

  // Quick Package Size Selection
  const applySize = (size: 'small' | 'standard' | 'large') => {
    setActiveSize(size);
    if (size === 'small') {
      setLengthCm(25);
      setBreadthCm(20);
      setHeightCm(15);
      setActualWeightKg(2.5);
    } else if (size === 'standard') {
      setLengthCm(50);
      setBreadthCm(40);
      setHeightCm(30);
      setActualWeightKg(8);
    } else if (size === 'large') {
      setLengthCm(70);
      setBreadthCm(50);
      setHeightCm(45);
      setActualWeightKg(22);
    }
  };

  // Fetch quote whenever inputs change
  useEffect(() => {
    // Instant optimistic calculation if we already know rate card values
    if (quote && lengthCm > 0 && breadthCm > 0 && heightCm > 0 && actualWeightKg > 0) {
      const vol = (lengthCm * breadthCm * heightCm) / 5000;
      const chargeable = Math.max(actualWeightKg, vol);
      const weightCharge = chargeable * quote.rate_per_kg;
      const baseCharge = quote.base_fee + weightCharge;
      const codApplies = paymentType === 'COD';
      const codCharge = codApplies ? (quote.cod_flat + (baseCharge * quote.cod_percent) / 100) : 0;
      const totalCharge = baseCharge + codCharge;

      setQuote((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          actual_weight_kg: Number(actualWeightKg),
          volumetric_weight_kg: Number(vol),
          chargeable_weight_kg: Number(chargeable),
          order_type: orderType,
          payment_type: paymentType,
          weight_charge: Number(weightCharge.toFixed(2)),
          base_charge: Number(baseCharge.toFixed(2)),
          cod_applicable: codApplies,
          cod_charge: Number(codCharge.toFixed(2)),
          total_charge: Number(totalCharge.toFixed(2)),
        };
      });
    }

    const fetchQuote = async () => {
      if (!pickupPincode || !dropPincode || lengthCm <= 0 || breadthCm <= 0 || heightCm <= 0 || actualWeightKg <= 0) {
        return;
      }
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await ordersApi.getQuote({
          pickup_pincode: pickupPincode,
          drop_pincode: dropPincode,
          length_cm: Number(lengthCm),
          breadth_cm: Number(breadthCm),
          height_cm: Number(heightCm),
          actual_weight_kg: Number(actualWeightKg),
          order_type: orderType,
          payment_type: paymentType,
        });
        setQuote(res);
      } catch (err: any) {
        setQuoteError(extractErrorMessage(err));
      } finally {
        setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 120);
    return () => clearTimeout(timer);
  }, [pickupPincode, dropPincode, lengthCm, breadthCm, heightCm, actualWeightKg, orderType, paymentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitLoading(true);
    setDispatchStep('CREATING');

    try {
      const order = await ordersApi.createOrder({
        pickup_address: pickupAddress,
        pickup_pincode: pickupPincode,
        drop_address: dropAddress,
        drop_pincode: dropPincode,
        length_cm: Number(lengthCm),
        breadth_cm: Number(breadthCm),
        height_cm: Number(heightCm),
        actual_weight_kg: Number(actualWeightKg),
        order_type: orderType,
        payment_type: paymentType,
      });

      setDispatchStep('DISPATCHING');

      // Fetch fresh order details and assignment decisions
      const [freshOrder, assignments] = await Promise.all([
        ordersApi.getOrder(order.id).catch(() => order),
        ordersApi.getAssignments(order.id).catch(() => []),
      ]);

      setCreatedOrder(freshOrder);
      if (assignments.length > 0) {
        setAssignedDecision(assignments[assignments.length - 1]);
      }
      setDispatchStep('SUCCESS');
    } catch (err: any) {
      setSubmitError(extractErrorMessage(err));
      setDispatchStep('IDLE');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Dominant Visual Confirmation Screen
  if (dispatchStep === 'SUCCESS' && createdOrder) {
    const isAssigned = createdOrder.status === 'ASSIGNED' || !!createdOrder.agent_id;
    const courierName = createdOrder.agent_name || assignedDecision?.selected_agent_name;
    const distanceKm = assignedDecision?.selected_distance_km;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-in fade-in duration-200">
        <div className={`stripe-card rounded-2xl p-6 sm:p-8 space-y-6 border-t-4 ${isAssigned ? 'border-t-[#287A55] dark:border-t-[#55A878]' : 'border-t-[#3157A6] dark:border-t-[#6D8ED4]'}`}>
          <div className="text-center space-y-2 pb-4 border-b border-[#E2E5E9] dark:border-[#2B3138]">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-2xs border ${
              isAssigned 
                ? 'bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border-[#C8E5D6] dark:border-[#203D2E]'
                : 'bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border-[#D0DEF2] dark:border-[#25354E]'
            }`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              {isAssigned ? 'Order Confirmed & Courier Dispatched' : 'Order Confirmed & Queued for Dispatch'}
            </h1>
            <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5]">
              {isAssigned
                ? 'Shipment registered in database and automatically assigned to the nearest available courier.'
                : 'Shipment registered in database. Active couriers are currently at peak capacity — queued for dispatch.'}
            </p>
          </div>

          {/* 3-Step Milestone Progression */}
          <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center gap-3 text-[#287A55] dark:text-[#55A878] font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Order <strong className="font-mono text-[#171A1F] dark:text-[#E8EAED]">#{createdOrder.id.slice(0, 8)}</strong> Created & Validated</span>
            </div>
            
            {isAssigned ? (
              <>
                <div className="flex items-center gap-3 text-[#287A55] dark:text-[#55A878] font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Nearest-Agent Haversine Dispatch Engine Executed</span>
                </div>
                <div className="flex items-start gap-3 text-[#3157A6] dark:text-[#6D8ED4] font-semibold pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                  <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-2">
                      <span>Courier Assigned:</span>
                      <span className="text-[#287A55] dark:text-[#55A878] bg-[#EAF5F0] dark:bg-[#16271E] px-2 py-0.5 rounded border border-[#C8E5D6] dark:border-[#203D2E]">
                        {courierName || 'Assigned Courier'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-normal">
                      {distanceKm !== undefined && distanceKm !== null ? `${distanceKm} km away · ` : ''}Assignment: Nearest Available Courier
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 text-[#A66A16] dark:text-[#D19A4A] font-semibold pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold">Dispatch Queue: Pending Available Courier</div>
                  <div className="text-[11px] font-normal text-[#5F6672] dark:text-[#A7ADB5]">
                    All couriers in pickup zone are currently executing deliveries. Dispatch will retry automatically.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Routing & Order Specs Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white dark:bg-[#181C20] rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#8A919C] dark:text-[#737A84] block">Route</span>
              <div className="text-[#171A1F] dark:text-[#E8EAED] font-medium truncate">{createdOrder.drop_address}</div>
              <div className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">PIN: <span className="font-mono">{createdOrder.drop_pincode}</span> ({createdOrder.drop_zone_name || 'Zone'})</div>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#181C20] rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#8A919C] dark:text-[#737A84] block">Pricing & Specs</span>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6672] dark:text-[#A7ADB5]">Chargeable: {createdOrder.chargeable_weight_kg} kg</span>
                <span className="text-sm font-mono font-bold text-[#287A55] dark:text-[#55A878]">₹{createdOrder.total_charge.toFixed(2)}</span>
              </div>
              <div className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">{createdOrder.order_type} · {createdOrder.payment_type}</div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => onOrderCreated(createdOrder.id)}
              className="w-full sm:flex-1 stripe-btn-primary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Track Live Shipment & Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setDispatchStep('IDLE');
                setCreatedOrder(null);
                setAssignedDecision(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] text-xs font-semibold cursor-pointer transition-colors"
            >
              Book Another Shipment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Header Banner with In-Line 1-Click Route Presets */}
      <div className="pb-3.5 border-b border-[#E2E5E9] dark:border-[#2B3138] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED] whitespace-nowrap">
              Shipment Booking & Rate Engine
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E] px-2 py-0.5 rounded-full shadow-2xs">
              <Zap className="w-3 h-3 text-[#287A55] dark:text-[#55A878]" />
              Guaranteed Live Quote
            </span>
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            Deterministic route mapping, volumetric weight calculation (<code className="font-mono text-[#171A1F] dark:text-[#E8EAED]">L×B×H÷5000</code>), and automated courier dispatch.
          </p>
        </div>

        {/* In-Line 1-Click Route Presets */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-semibold flex items-center gap-1 mr-0.5">
            <Compass className="w-3 h-3 text-[#3157A6] dark:text-[#6D8ED4]" />
            Route Presets:
          </span>

          <button
            type="button"
            onClick={() => applyPreset('inter')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
              activePreset === 'inter'
                ? 'bg-[#3157A6] text-white border-[#3157A6] shadow-xs'
                : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] border-[#E2E5E9] dark:border-[#2B3138] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            <span>Hyd ➔ Vijayawada</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                activePreset === 'inter'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4]'
              }`}
            >
              Inter
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('intra')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
              activePreset === 'intra'
                ? 'bg-[#3157A6] text-white border-[#3157A6] shadow-xs'
                : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] border-[#E2E5E9] dark:border-[#2B3138] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            <span>Hyd ➔ HITEC City</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                activePreset === 'intra'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#EBF7EE] dark:bg-[#162B1D] text-[#287A55] dark:text-[#55A878]'
              }`}
            >
              Intra
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('heavy')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
              activePreset === 'heavy'
                ? 'bg-[#3157A6] text-white border-[#3157A6] shadow-xs'
                : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] border-[#E2E5E9] dark:border-[#2B3138] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            <span>Vizag ➔ Hyd</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                activePreset === 'heavy'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#FAF3E8] dark:bg-[#292014] text-[#A66A16] dark:text-[#D19A4A]'
              }`}
            >
              28kg
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Studio (7 Cols) */}
        <div className="lg:col-span-7 stripe-card rounded-2xl p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Origin & Destination */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417] text-[11px] font-bold flex items-center justify-center">1</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
                    Origin & Destination Route
                  </h3>
                </div>
                <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">Pincode Territory Match</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup Address */}
                <div className="p-3.5 bg-[#F1F3F5] dark:bg-[#1E2328] rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
                      Pickup Origin
                    </span>
                    <span className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5]">Sender</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Full street address / facility"
                    className="w-full linear-input rounded-lg px-2.5 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] placeholder-[#8A919C] dark:placeholder-[#737A84]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-medium">Pickup PIN:</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pickupPincode}
                      onChange={(e) => setPickupPincode(e.target.value)}
                      className="w-24 linear-input rounded-lg px-2 py-1 text-xs font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold text-center"
                    />
                  </div>
                </div>

                {/* Drop Address */}
                <div className="p-3.5 bg-[#F1F3F5] dark:bg-[#1E2328] rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4]" />
                      Delivery Destination
                    </span>
                    <span className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5]">Recipient</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    placeholder="Full recipient address / landmark"
                    className="w-full linear-input rounded-lg px-2.5 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] placeholder-[#8A919C] dark:placeholder-[#737A84]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-medium">Delivery PIN:</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={dropPincode}
                      onChange={(e) => setDropPincode(e.target.value)}
                      className="w-24 linear-input rounded-lg px-2 py-1 text-xs font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Package Weight & Dimensions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417] text-[11px] font-bold flex items-center justify-center">2</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
                    Package Size & Dimensions
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => applySize('small')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer border ${
                      activeSize === 'small'
                        ? 'bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border-[#3157A6]/40 dark:border-[#6D8ED4]/40'
                        : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-transparent hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5]'
                    }`}
                  >
                    Small (2.5kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySize('standard')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer border ${
                      activeSize === 'standard'
                        ? 'bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border-[#3157A6]/40 dark:border-[#6D8ED4]/40'
                        : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-transparent hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5]'
                    }`}
                  >
                    Medium (8kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySize('large')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer border ${
                      activeSize === 'large'
                        ? 'bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border-[#3157A6]/40 dark:border-[#6D8ED4]/40'
                        : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-transparent hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5]'
                    }`}
                  >
                    Heavy (22kg)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                  <label className="block text-[10px] uppercase font-bold text-[#5F6672] dark:text-[#A7ADB5] mb-1">Length</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      required
                      value={lengthCm}
                      onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                      className="w-full linear-input rounded-lg px-2 py-1 text-xs font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold"
                    />
                    <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">cm</span>
                  </div>
                </div>

                <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                  <label className="block text-[10px] uppercase font-bold text-[#5F6672] dark:text-[#A7ADB5] mb-1">Breadth</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      required
                      value={breadthCm}
                      onChange={(e) => setBreadthCm(parseFloat(e.target.value) || 0)}
                      className="w-full linear-input rounded-lg px-2 py-1 text-xs font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold"
                    />
                    <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">cm</span>
                  </div>
                </div>

                <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
                  <label className="block text-[10px] uppercase font-bold text-[#5F6672] dark:text-[#A7ADB5] mb-1">Height</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      required
                      value={heightCm}
                      onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                      className="w-full linear-input rounded-lg px-2 py-1 text-xs font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold"
                    />
                    <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">cm</span>
                  </div>
                </div>

                <div className="bg-[#FAF3E8] dark:bg-[#292014] p-2.5 rounded-xl border border-[#F2DEBF] dark:border-[#42321D]">
                  <label className="block text-[10px] uppercase font-bold text-[#A66A16] dark:text-[#D19A4A] mb-1">Scale Weight</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      value={actualWeightKg}
                      onChange={(e) => setActualWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-[#181C20] border border-[#F2DEBF] dark:border-[#42321D] rounded-lg px-2 py-1 text-xs font-mono text-[#A66A16] dark:text-[#D19A4A] font-bold focus:outline-none"
                    />
                    <span className="text-[11px] text-[#A66A16] dark:text-[#D19A4A] font-mono font-bold">kg</span>
                  </div>
                </div>
              </div>

              {/* Real-time Weight Explainer (Cognitive Clarity) */}
              <div className="p-3 bg-[#F1F3F5] dark:bg-[#1E2328] rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4] shrink-0" />
                  <span className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">
                    Volumetric weight: <strong className="font-mono text-[#171A1F] dark:text-[#E8EAED]">{volumetricWeightKg.toFixed(2)} kg</strong> vs Scale: <strong className="font-mono text-[#171A1F] dark:text-[#E8EAED]">{actualWeightKg} kg</strong>
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3157A6] dark:text-[#6D8ED4] bg-[#EBF1FA] dark:bg-[#182232] px-2.5 py-0.5 rounded-lg border border-[#D0DEF2] dark:border-[#25354E]">
                  Chargeable: {chargeableWeightKg.toFixed(2)} kg {isVolumetricHigher ? '(Volumetric Higher)' : '(Actual Higher)'}
                </div>
              </div>
            </div>

            {/* Step 3: Customer Segment & Payment Mode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417] text-[11px] font-bold flex items-center justify-center">3</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
                    Shipping Plan & Payment Mode
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Order Type Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5]">Shipment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('B2C')}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        orderType === 'B2C'
                          ? 'bg-[#EBF1FA] dark:bg-[#182232] border-[#3157A6] dark:border-[#6D8ED4] text-[#3157A6] dark:text-[#6D8ED4] shadow-xs'
                          : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                      }`}
                    >
                      <div className="font-bold">B2C Retail</div>
                      <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-normal mt-0.5">Direct to consumer</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('B2B')}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        orderType === 'B2B'
                          ? 'bg-[#EBF1FA] dark:bg-[#182232] border-[#3157A6] dark:border-[#6D8ED4] text-[#3157A6] dark:text-[#6D8ED4] shadow-xs'
                          : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                      }`}
                    >
                      <div className="font-bold">B2B Commercial</div>
                      <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-normal mt-0.5">Enterprise freight</div>
                    </button>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5]">Payment Collection</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('PREPAID')}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        paymentType === 'PREPAID'
                          ? 'bg-[#EAF5F0] dark:bg-[#16271E] border-[#287A55] dark:border-[#55A878] text-[#287A55] dark:text-[#55A878] shadow-xs'
                          : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Prepaid
                      </div>
                      <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-normal mt-0.5">No surcharge</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('COD')}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        paymentType === 'COD'
                          ? 'bg-[#FAF3E8] dark:bg-[#292014] border-[#A66A16] dark:border-[#D19A4A] text-[#A66A16] dark:text-[#D19A4A] shadow-xs'
                          : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        Cash on Delivery
                      </div>
                      <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-normal mt-0.5">Standard COD fee</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] p-3 rounded-xl flex items-center gap-2 text-xs text-[#B54848] dark:text-[#D56B6B]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Final Submission Button */}
            <button
              type="submit"
              disabled={submitLoading || !quote}
              className="w-full stripe-btn-success py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md text-sm"
            >
              {submitLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching to Agent & Reserving Slot...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Dispatch Shipment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Dynamic Price Card & Reassurance (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          {!quote && quoteLoading && (
            <div className="p-8 stripe-card rounded-2xl text-center text-[#8A919C] dark:text-[#737A84] text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-[11px]">Computing dynamic rate quote...</span>
            </div>
          )}

          {quoteError && !quote && (
            <div className="p-5 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-2xl text-[#B54848] dark:text-[#D56B6B] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Route Calculation Error:</strong>
                {quoteError}
              </div>
            </div>
          )}

          {quote && (
            <div className="space-y-4">
              <PricingBreakdownCard quote={quote} title="Dynamic Rate Calculation" isUpdating={quoteLoading} />

              {/* Psychological Trust & Assurance Badge */}
              <div className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl p-4 text-xs space-y-2.5">
                <div className="font-bold text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#287A55] dark:text-[#55A878]" />
                  Service Level Commitments
                </div>
                <div className="space-y-1.5 text-[11px] text-[#5F6672] dark:text-[#A7ADB5]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
                    <span>Instant Automated Agent Dispatch within 60 seconds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
                    <span>Real-Time transactional milestone tracking & live proof of delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
                    <span>Up to 3 free delivery attempts on failed attempts</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
