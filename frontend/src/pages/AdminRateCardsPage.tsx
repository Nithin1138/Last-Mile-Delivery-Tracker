import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, extractErrorMessage } from '../api/client';
import { RateCard, CODSurcharge } from '../types';
import { CreditCard, Edit2, ShieldAlert, CheckCircle2, History, RefreshCw, X, Sparkles, AlertCircle } from 'lucide-react';

export const AdminRateCardsPage: React.FC = () => {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [codSurcharges, setCodSurcharges] = useState<CODSurcharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Rate Card Modal (Super-seed & Versioning demonstration)
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [editBaseFee, setEditBaseFee] = useState<number>(0);
  const [editRatePerKg, setEditRatePerKg] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cardsRes, codRes] = await Promise.all([
        adminApi.listRateCards(),
        adminApi.listCODSurcharges(),
      ]);
      setRateCards(cardsRes);
      setCodSurcharges(codRes);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartEdit = (card: RateCard) => {
    setEditingCard(card);
    setEditBaseFee(card.base_fee);
    setEditRatePerKg(card.rate_per_kg);
  };

  const handleSaveRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setSaving(true);
    try {
      await adminApi.updateRateCard(editingCard.id, {
        base_fee: Number(editBaseFee),
        rate_per_kg: Number(editRatePerKg),
      });
      setEditingCard(null);
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-[#E2E5E9] dark:border-[#2B3138]">
        <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
          Rate Cards & COD Pricing Engine
        </h1>
        <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
          Immutable versioned billing matrices. Updates create a new version without modifying historical orders.
        </p>
      </div>

      {/* Rate Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
            Active Rate Cards (B2B / B2C × INTRA / INTER)
          </h2>
          <button
            onClick={fetchData}
            className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[#8A919C] dark:text-[#737A84] text-xs stripe-card rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-[11px]">Loading pricing matrix...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-2xl text-[#B54848] dark:text-[#D56B6B] text-xs">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rateCards.map((card, idx) => (
              <div
                key={card.id}
                style={{ animationDelay: `${idx * 30}ms` }}
                className="stripe-card-interactive card-enter rounded-2xl p-5 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#171A1F] dark:text-[#E8EAED] font-mono">
                      {card.order_type} · {card.zone_type}
                    </span>
                    <span className="text-[10px] bg-[#F1F3F5] dark:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] border border-[#E2E5E9] dark:border-[#2B3138] px-2 py-0.5 rounded font-mono font-bold">
                      v{card.version}
                    </span>
                  </div>

                  <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-3 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">Base Fee:</span>
                      <span className="font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold">₹{card.base_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5F6672] dark:text-[#A7ADB5] text-[11px]">Rate / kg:</span>
                      <span className="font-mono text-[#171A1F] dark:text-[#E8EAED] font-bold">₹{card.rate_per_kg.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] font-mono">
                    Effective: {card.effective_from ? new Date(card.effective_from).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Current'}
                  </div>
                </div>

                <button
                  onClick={() => handleStartEdit(card)}
                  className="w-full bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-[#E2E5E9] dark:border-[#2B3138]"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit to v{card.version + 1}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COD Surcharges Section */}
      <div className="stripe-card rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">COD Surcharge Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codSurcharges.map((cod) => (
            <div key={cod.id} className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#A66A16] dark:text-[#D19A4A]">{cod.order_type} Payment Surcharge</span>
                <span className="font-mono text-[#8A919C] dark:text-[#737A84] text-[10px]">Flat + Percentage</span>
              </div>
              <div className="text-xs text-[#5F6672] dark:text-[#A7ADB5] font-mono">
                Flat: <strong className="text-[#171A1F] dark:text-[#E8EAED]">₹{cod.flat_amount.toFixed(2)}</strong> + Percentage: <strong className="text-[#171A1F] dark:text-[#E8EAED]">{cod.percent_of_base}% of Base</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Rate Card Modal */}
      {editingCard && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleSaveRateCard} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-3.5 text-xs shadow-xl modal-animate">
            <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
              <div className="font-bold text-sm text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                Update Rate Card ({editingCard.order_type} · {editingCard.zone_type})
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#EBF1FA] dark:bg-[#182232] border border-[#D0DEF2] dark:border-[#25354E] p-2.5 rounded-lg text-[#3157A6] dark:text-[#6D8ED4] text-[11px] leading-relaxed">
              <strong>Immutable Versioning:</strong> Increments to <span className="font-mono font-bold">v{editingCard.version + 1}</span>. Historical orders retain their original frozen rates.
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Base Minimum Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editBaseFee}
                onChange={(e) => setEditBaseFee(parseFloat(e.target.value) || 0)}
                className="w-full linear-input rounded-lg p-2 font-mono text-[#171A1F] dark:text-[#E8EAED] text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Rate Per Kg (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editRatePerKg}
                onChange={(e) => setEditRatePerKg(parseFloat(e.target.value) || 0)}
                className="w-full linear-input rounded-lg p-2 font-mono text-[#171A1F] dark:text-[#E8EAED] text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="stripe-btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Publishing...' : `Publish v${editingCard.version + 1}`}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
