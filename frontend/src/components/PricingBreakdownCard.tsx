import React from 'react';
import { PriceQuote } from '../types';
import { Calculator, CheckCircle2, Info, Layers, Sparkles, Scale } from 'lucide-react';

interface Props {
  quote: PriceQuote;
  title?: string;
}

export const PricingBreakdownCard: React.FC<Props> = ({ quote, title = 'Pricing Breakdown' }) => {
  const volumetricWins = quote.volumetric_weight_kg > quote.actual_weight_kg;

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calculator className="w-4 h-4" />
          </div>
          <span>{title}</span>
        </div>
        <span className="text-xs bg-indigo-950/70 text-indigo-300 border border-indigo-700/50 px-3 py-1 rounded-full font-mono font-semibold shadow-sm">
          Rate Card v{quote.rate_card_version} ({quote.order_type} · {quote.zone_type})
        </span>
      </div>

      {/* Weight Computation Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 card-hover-subtle">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Actual Weight</div>
          <div className="text-lg font-extrabold text-slate-100 font-mono mt-1">{quote.actual_weight_kg.toFixed(2)} kg</div>
          <div className="text-[10px] text-slate-500 mt-1">Direct scale measure</div>
        </div>

        <div className={`border rounded-xl p-3.5 card-hover-subtle ${volumetricWins ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-950/20' : 'bg-slate-950/70 border-slate-800/80'}`}>
          <div className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>Volumetric Wt</span>
            {volumetricWins && <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded font-sans">Higher</span>}
          </div>
          <div className="text-lg font-extrabold text-amber-300 font-mono mt-1">{quote.volumetric_weight_kg.toFixed(2)} kg</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">(L×B×H) ÷ 5000</div>
        </div>

        <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-3.5 shadow-md shadow-indigo-950/30 card-hover-subtle">
          <div className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chargeable Wt</span>
          </div>
          <div className="text-xl font-black text-indigo-200 font-mono mt-1">{quote.chargeable_weight_kg.toFixed(2)} kg</div>
          <div className="text-[10px] text-indigo-300/80 mt-1 font-mono">max(actual, vol)</div>
        </div>
      </div>

      {/* Route & Zone Details */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 truncate">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300 truncate">
            Route: <strong className="text-slate-100">{quote.pickup_zone_name}</strong> → <strong className="text-slate-100">{quote.drop_zone_name}</strong>
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold shrink-0 ${quote.zone_type === 'INTRA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
          {quote.zone_type} ZONE
        </span>
      </div>

      {/* Itemized Calculation */}
      <div className="space-y-2.5 text-xs pt-1">
        <div className="flex justify-between text-slate-400">
          <span>Base Minimum Fee ({quote.order_type} · {quote.zone_type}):</span>
          <span className="font-mono text-slate-200 font-semibold">₹{quote.base_fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Weight Charge (₹{quote.rate_per_kg}/kg × {quote.chargeable_weight_kg.toFixed(2)} kg):</span>
          <span className="font-mono text-slate-200 font-semibold">₹{quote.weight_charge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-200 font-medium pt-2 border-t border-slate-800/80">
          <span>Base Delivery Charge:</span>
          <span className="font-mono font-bold text-slate-100">₹{quote.base_charge.toFixed(2)}</span>
        </div>

        {quote.cod_applicable && (
          <div className="flex justify-between text-amber-300 pt-1">
            <span>COD Surcharge (Flat ₹{quote.cod_flat} + {quote.cod_percent}% of Base):</span>
            <span className="font-mono font-bold text-amber-300">+₹{quote.cod_charge.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-gradient-to-r from-emerald-950/40 via-emerald-950/20 to-transparent p-4 rounded-xl border border-emerald-500/30 mt-2 shadow-lg shadow-emerald-950/30">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Total Payable</span>
            <span className="text-[11px] text-emerald-400/80 font-medium">All taxes & surcharges included</span>
          </div>
          <span className="text-3xl font-black font-mono text-emerald-300 tracking-tight">₹{quote.total_charge.toFixed(2)}</span>
        </div>
      </div>

      {/* Explainability footer */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-slate-200">Formula Audit:</strong> Volumetric weight is computed as <code className="text-slate-300 font-mono">(L×B×H)÷5000</code>. Billing applies to {volumetricWins ? <strong className="text-amber-300">volumetric weight ({quote.volumetric_weight_kg.toFixed(2)} kg)</strong> : <strong className="text-slate-200">actual weight ({quote.actual_weight_kg.toFixed(2)} kg)</strong>}.
        </div>
      </div>
    </div>
  );
};
