import React from 'react';
import { PriceQuote } from '../types';
import { Calculator, CheckCircle2, Info, Layers } from 'lucide-react';

interface Props {
  quote: PriceQuote;
  title?: string;
  isUpdating?: boolean;
}

export const PricingBreakdownCard: React.FC<Props> = ({ quote, title = 'Pricing Breakdown', isUpdating = false }) => {
  const volumetricWins = quote.volumetric_weight_kg > quote.actual_weight_kg;

  return (
    <div className="stripe-card rounded-2xl p-5 sm:p-6 space-y-4 transition-all duration-150">
      <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
        <div className="flex items-center gap-2 text-[#171A1F] dark:text-[#E8EAED] font-bold text-xs">
          <div className="p-1.5 rounded-md bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span>{title}</span>
          {isUpdating && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] animate-pulse" title="Recalculating..." />
          )}
        </div>
        <span className="text-[10px] bg-[#F1F3F5] dark:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] border border-[#E2E5E9] dark:border-[#2B3138] px-2 py-0.5 rounded font-mono font-semibold">
          Rate Card v{quote.rate_card_version} ({quote.order_type} · {quote.zone_type})
        </span>
      </div>

      {/* Weight Computation Comparison */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] rounded-xl p-2.5">
          <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-semibold uppercase tracking-wider">Actual Weight</div>
          <div className="text-base font-bold text-[#171A1F] dark:text-[#E8EAED] font-mono mt-0.5">{quote.actual_weight_kg.toFixed(2)} kg</div>
          <div className="text-[9px] text-[#8A919C] dark:text-[#737A84] mt-0.5">Scale measure</div>
        </div>

        <div className={`border rounded-xl p-2.5 ${volumetricWins ? 'bg-[#FAF3E8] dark:bg-[#292014] border-[#F2DEBF] dark:border-[#42321D]' : 'bg-[#F1F3F5] dark:bg-[#1E2328] border-[#E2E5E9] dark:border-[#2B3138]'}`}>
          <div className="text-[10px] text-[#A66A16] dark:text-[#D19A4A] font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>Volumetric</span>
            {volumetricWins && <span className="text-[9px] bg-[#F2DEBF] dark:bg-[#42321D] text-[#A66A16] dark:text-[#D19A4A] font-bold px-1 rounded">Higher</span>}
          </div>
          <div className="text-base font-bold text-[#A66A16] dark:text-[#D19A4A] font-mono mt-0.5">{quote.volumetric_weight_kg.toFixed(2)} kg</div>
          <div className="text-[9px] text-[#A66A16] dark:text-[#D19A4A] mt-0.5 font-mono">L×B×H÷5000</div>
        </div>

        <div className="bg-[#EBF1FA] dark:bg-[#182232] border border-[#D0DEF2] dark:border-[#25354E] rounded-xl p-2.5">
          <div className="text-[10px] text-[#3157A6] dark:text-[#6D8ED4] font-semibold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#3157A6] dark:text-[#6D8ED4]" />
            <span>Chargeable</span>
          </div>
          <div className="text-base font-extrabold text-[#3157A6] dark:text-[#6D8ED4] font-mono mt-0.5">{quote.chargeable_weight_kg.toFixed(2)} kg</div>
          <div className="text-[9px] text-[#3157A6] dark:text-[#6D8ED4] mt-0.5 font-mono">max(actual, vol)</div>
        </div>
      </div>

      {/* Route & Zone Details */}
      <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] rounded-xl p-3 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 truncate">
          <Layers className="w-3.5 h-3.5 text-[#426B9E] dark:text-[#7095C4] shrink-0" />
          <span className="text-[#5F6672] dark:text-[#A7ADB5] truncate text-[11px]">
            Route: <strong className="text-[#171A1F] dark:text-[#E8EAED] font-semibold">{quote.pickup_zone_name}</strong> → <strong className="text-[#171A1F] dark:text-[#E8EAED] font-semibold">{quote.drop_zone_name}</strong>
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${quote.zone_type === 'INTRA' ? 'bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E]' : 'bg-[#EBF1FA] dark:bg-[#182232] text-[#426B9E] dark:text-[#7095C4] border border-[#D0DEF2] dark:border-[#25354E]'}`}>
          {quote.zone_type} ZONE
        </span>
      </div>

      {/* Itemized Calculation */}
      <div className="space-y-2 text-xs pt-1 border-t border-[#E2E5E9] dark:border-[#2B3138]">
        <div className="flex justify-between text-[#5F6672] dark:text-[#A7ADB5]">
          <span>Base Fee ({quote.order_type} · {quote.zone_type}):</span>
          <span className="font-mono text-[#171A1F] dark:text-[#E8EAED] font-medium">₹{quote.base_fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#5F6672] dark:text-[#A7ADB5]">
          <span>Weight Charge (₹{quote.rate_per_kg}/kg × {quote.chargeable_weight_kg.toFixed(2)} kg):</span>
          <span className="font-mono text-[#171A1F] dark:text-[#E8EAED] font-medium">₹{quote.weight_charge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#171A1F] dark:text-[#E8EAED] font-medium pt-1.5 border-t border-[#E2E5E9] dark:border-[#2B3138]">
          <span>Base Charge Subtotal:</span>
          <span className="font-mono font-bold">₹{quote.base_charge.toFixed(2)}</span>
        </div>

        {quote.cod_applicable && (
          <div className="flex justify-between text-[#A66A16] dark:text-[#D19A4A] pt-0.5">
            <span>COD Surcharge (₹{quote.cod_flat} flat + {quote.cod_percent}%):</span>
            <span className="font-mono font-bold">+₹{quote.cod_charge.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-[#171A1F] dark:bg-[#111417] text-white p-3.5 rounded-xl mt-2 shadow-xs border border-[#2B3138]">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#8A919C] font-bold block">Total Amount</span>
            <span className="text-[10px] text-[#8A919C]">Guaranteed rate quote</span>
          </div>
          <span className="text-2xl font-black font-mono text-[#55A878] tracking-tight">₹{quote.total_charge.toFixed(2)}</span>
        </div>
      </div>

      {/* Explainability footer */}
      <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] rounded-xl p-2.5 flex items-start gap-2 text-xs text-[#5F6672] dark:text-[#A7ADB5]">
        <Info className="w-3.5 h-3.5 text-[#3157A6] dark:text-[#6D8ED4] shrink-0 mt-0.5" />
        <div className="text-[10px] leading-relaxed">
          <strong className="text-[#171A1F] dark:text-[#E8EAED]">Formula Audit:</strong> Chargeable weight applies {volumetricWins ? <strong className="text-[#A66A16] dark:text-[#D19A4A]">volumetric weight ({quote.volumetric_weight_kg.toFixed(2)} kg)</strong> : <strong className="text-[#171A1F] dark:text-[#E8EAED]">actual weight ({quote.actual_weight_kg.toFixed(2)} kg)</strong>}.
        </div>
      </div>
    </div>
  );
};
