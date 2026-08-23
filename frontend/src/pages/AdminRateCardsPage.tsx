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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          Rate Cards & COD Pricing Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Database-driven pricing rules with immutable versioning. Editing a rate card supersedes the active version without modifying historical orders.
        </p>
      </div>

      {/* Rate Cards Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Rate Cards (B2B/B2C × INTRA/INTER)</h2>
          <button
            onClick={fetchData}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading pricing matrices...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-lg">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
            {rateCards.map((card, idx) => (
              <div
                key={card.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="bg-slate-900/80 border border-slate-800 card-hover-glow card-enter rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between backdrop-blur-xl"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100">
                      {card.order_type} · {card.zone_type}
                    </span>
                    <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      v{card.version}
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Base Minimum Fee:</span>
                      <span className="font-mono text-slate-100 font-bold">₹{card.base_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Weight Charge:</span>
                      <span className="font-mono text-slate-100 font-bold">₹{card.rate_per_kg.toFixed(2)} / kg</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    Updated: {card.effective_from ? new Date(card.effective_from).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Active'}
                  </div>
                </div>

                <button
                  onClick={() => handleStartEdit(card)}
                  className="w-full bg-slate-800 hover:bg-indigo-600 active:scale-95 text-slate-200 hover:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit & Create v{card.version + 1}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COD Surcharges Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 backdrop-blur-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Active COD Surcharge Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codSurcharges.map((cod) => (
            <div key={cod.id} className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl space-y-2 card-hover-subtle">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400">{cod.order_type} Payment Mode</span>
                <span className="font-mono text-slate-500 text-[10px]">Flat + Percentage</span>
              </div>
              <div className="text-xs text-slate-300 font-mono">
                Flat: <strong className="text-slate-100">₹{cod.flat_amount.toFixed(2)}</strong> + Percentage: <strong className="text-slate-100">{cod.percent_of_base}% of base</strong>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Edit Rate Card Modal rendered via Portal */}
      {editingCard && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleSaveRateCard} className="bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl max-w-md w-full space-y-4 text-xs shadow-2xl modal-animate">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Update Rate Card ({editingCard.order_type} · {editingCard.zone_type})
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-2xl text-indigo-300 text-[11px] leading-relaxed">
              <strong>Immutable Versioning:</strong> Saving will increment to <span className="font-mono font-bold">v{editingCard.version + 1}</span>. All future orders will use this rate, while historical orders remain locked to their creation rates.
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Base Minimum Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editBaseFee}
                onChange={(e) => setEditBaseFee(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 font-mono text-slate-100 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Rate Per Kg (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editRatePerKg}
                onChange={(e) => setEditRatePerKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 font-mono text-slate-100 focus:outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer transition-all shadow-lg shadow-indigo-600/25"
              >
                {saving ? 'Creating New Version...' : `Publish v${editingCard.version + 1}`}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
