import React, { useState, useEffect } from 'react';
import { ordersApi, extractErrorMessage } from '../api/client';
import { PriceQuote } from '../types';
import { PricingBreakdownCard } from '../components/PricingBreakdownCard';
import { Package, MapPin, Calculator, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  onOrderCreated: (orderId: string) => void;
}

export const OrderCreatePage: React.FC<Props> = ({ onOrderCreated }) => {
  // Form State
  const [pickupAddress, setPickupAddress] = useState('Block B, Connaught Place, New Delhi');
  const [pickupPincode, setPickupPincode] = useState('110001');
  const [dropAddress, setDropAddress] = useState('Hiranandani Gardens, Powai, Mumbai');
  const [dropPincode, setDropPincode] = useState('400076');

  // Package Dimensions
  const [lengthCm, setLengthCm] = useState<number>(50);
  const [breadthCm, setBreadthCm] = useState<number>(40);
  const [heightCm, setHeightCm] = useState<number>(30);
  const [actualWeightKg, setActualWeightKg] = useState<number>(8);

  // Business Parameters
  const [orderType, setOrderType] = useState<'B2B' | 'B2C'>('B2C');
  const [paymentType, setPaymentType] = useState<'PREPAID' | 'COD'>('COD');

  // Pricing State
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch quote whenever inputs change
  useEffect(() => {
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
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 250);
    return () => clearTimeout(timer);
  }, [pickupPincode, dropPincode, lengthCm, breadthCm, heightCm, actualWeightKg, orderType, paymentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitLoading(true);

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
      onOrderCreated(order.id);
    } catch (err: any) {
      setSubmitError(extractErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-400" />
          Create Order & Live Price Preview
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Zone detection, volumetric weight (<code className="font-mono text-slate-300">L×B×H÷5000</code>), rate card resolution, and COD charges computed server-side before confirmation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Demo Pre-fill */}
            <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-xl text-xs">
              <span className="text-indigo-300 font-medium">Quick Preset (Worked Example from Brief):</span>
              <button
                type="button"
                onClick={() => {
                  setPickupPincode('110001');
                  setDropPincode('400076');
                  setLengthCm(50);
                  setBreadthCm(40);
                  setHeightCm(30);
                  setActualWeightKg(8);
                  setOrderType('B2C');
                  setPaymentType('COD');
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg transition-colors"
              >
                Load Canonical 50×40×30 cm (8 kg)
              </button>
            </div>

            {/* Addresses & Pincodes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-700 pb-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Origin & Destination
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">Pickup Address</label>
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Pincode:</label>
                    <input
                      type="text"
                      required
                      value={pickupPincode}
                      onChange={(e) => setPickupPincode(e.target.value)}
                      placeholder="e.g. 110001"
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>

                {/* Drop */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">Drop Address</label>
                  <input
                    type="text"
                    required
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Pincode:</label>
                    <input
                      type="text"
                      required
                      value={dropPincode}
                      onChange={(e) => setDropPincode(e.target.value)}
                      placeholder="e.g. 400076"
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Package Dimensions & Weight */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-700 pb-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                Package Dimensions & Weight
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Length (cm)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={lengthCm}
                    onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Breadth (cm)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={breadthCm}
                    onChange={(e) => setBreadthCm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-amber-300 mb-1">Actual Wt (kg)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={actualWeightKg}
                    onChange={(e) => setActualWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-sm font-mono text-amber-200 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Order & Payment Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                Order & Payment Mode
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Order Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('B2C')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                        orderType === 'B2C'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      B2C Retail
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('B2B')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                        orderType === 'B2B'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      B2B Commercial
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('PREPAID')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                        paymentType === 'PREPAID'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Prepaid
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('COD')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                        paymentType === 'COD'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Cash on Delivery
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="bg-rose-950/40 border border-rose-800 p-3 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitLoading || !quote}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 text-base transition-colors shadow-lg disabled:opacity-50"
            >
              {submitLoading ? 'Creating Order...' : 'Confirm & Place Order'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Live Pricing Breakdown Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {quoteLoading && (
            <div className="p-8 bg-slate-800/60 border border-slate-700 rounded-xl text-center text-slate-400 text-sm">
              Calculating real-time rates from database...
            </div>
          )}

          {quoteError && !quoteLoading && (
            <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <div>
                <strong className="block font-semibold">Pricing Calculation Error:</strong>
                {quoteError}
              </div>
            </div>
          )}

          {quote && !quoteLoading && (
            <PricingBreakdownCard quote={quote} title="Live Price Quote" />
          )}
        </div>
      </div>
    </div>
  );
};
