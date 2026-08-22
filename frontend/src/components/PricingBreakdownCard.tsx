import React from 'react';
import { PriceQuote } from '../types';
import { Calculator, CheckCircle, Info, Layers } from 'lucide-react';

interface Props {
  quote: PriceQuote;
  title?: string;
}

export const PricingBreakdownCard: React.FC<Props> = ({ quote, title = 'Pricing Breakdown' }) => {
  const volumetricWins = quote.volumetric_weight_kg > quote.actual_weight_kg;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Calculator className="w-5 h-5" />
          <span>{title}</span>
        </div>
        <span className="text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-700/40 px-2.5 py-1 rounded-full font-mono">
          Rate Card v{quote.rate_card_version} ({quote.order_type} / {quote.zone_type})
        </span>
      </div>

      {/* Weight Computation Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 font-medium">Actual Weight</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">{quote.actual_weight_kg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-400 mt-1">Direct scale measurement</div>
        </div>

        <div className={`border rounded-lg p-3 ${volumetricWins ? 'bg-amber-950/20 border-amber-700/40' : 'bg-slate-900/60 border-slate-700/50'}`}>
          <div className="text-xs text-amber-400 font-medium flex items-center justify-between">
            <span>Volumetric Weight</span>
            {volumetricWins && <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded">Higher</span>}
          </div>
          <div className="text-lg font-bold text-amber-300 mt-0.5">{quote.volumetric_weight_kg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">(L × B × H) ÷ 5000</div>
        </div>

        <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-lg p-3">
          <div className="text-xs text-indigo-300 font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chargeable Weight</span>
          </div>
          <div className="text-xl font-black text-indigo-200 mt-0.5">{quote.chargeable_weight_kg.toFixed(2)} kg</div>
          <div className="text-[11px] text-indigo-300/80 mt-1 font-mono">max(actual, volumetric)</div>
        </div>
      </div>

      {/* Zone Details */}
      <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300">
            Route: <strong className="text-slate-100">{quote.pickup_zone_name}</strong> → <strong className="text-slate-100">{quote.drop_zone_name}</strong>
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded font-mono font-medium ${quote.zone_type === 'INTRA' ? 'bg-emerald-950/60 text-emerald-300' : 'bg-cyan-950/60 text-cyan-300'}`}>
          {quote.zone_type} Zone
        </span>
      </div>

      {/* Itemized Calculation */}
      <div className="space-y-2 text-sm pt-1">
        <div className="flex justify-between text-slate-300">
          <span>Base Fee ({quote.order_type} / {quote.zone_type}):</span>
          <span className="font-mono">₹{quote.base_fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Weight Charge (₹{quote.rate_per_kg}/kg × {quote.chargeable_weight_kg.toFixed(2)} kg):</span>
          <span className="font-mono">₹{quote.weight_charge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-200 font-medium pt-1 border-t border-slate-700/50">
          <span>Base Delivery Charge:</span>
          <span className="font-mono">₹{quote.base_charge.toFixed(2)}</span>
        </div>

        {quote.cod_applicable && (
          <div className="flex justify-between text-amber-300 pt-1">
            <span>COD Surcharge (Flat ₹{quote.cod_flat} + {quote.cod_percent}% of Base):</span>
            <span className="font-mono">+₹{quote.cod_charge.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-lg font-bold text-emerald-400 pt-2 border-t border-slate-700">
          <span>Total Payable:</span>
          <span className="text-2xl font-black font-mono text-emerald-300">₹{quote.total_charge.toFixed(2)}</span>
        </div>
      </div>

      {/* Explainability footer */}
      <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3 flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">How this price was calculated:</strong> Volumetric weight is computed as <code className="text-slate-300 font-mono">(L×B×H)/5000</code>. Since {volumetricWins ? 'volumetric weight is greater than actual weight, billing is on volumetric weight' : 'actual weight is greater, billing is on actual weight'}. Rate card <code className="text-slate-300 font-mono">v{quote.rate_card_version}</code> for {quote.order_type} {quote.zone_type} delivery was applied.
        </div>
      </div>
    </div>
  );
};
