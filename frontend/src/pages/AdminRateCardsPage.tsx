import React, { useState, useEffect } from 'react';
import { adminApi, extractErrorMessage } from '../api/client';
import { RateCard, CODSurcharge } from '../types';
import { CreditCard, Edit2, ShieldAlert, CheckCircle2, History, RefreshCw } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-400" />
          Rate Cards & COD Pricing Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Database-driven pricing rules with versioning. Editing a rate card supersedes the current version without altering historical order records.
        </p>
      </div>

      {/* Rate Cards Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200">Active Rate Cards (B2B/B2C × INTRA/INTER)</h2>
          <button
            onClick={fetchData}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rateCards.map((card) => (
            <div
              key={card.id}
              className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">
                    {card.order_type} · {card.zone_type}
                  </span>
                  <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full font-mono">
                    v{card.version}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Base Fee:</span>
                    <strong className="text-slate-100">₹{card.base_fee.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Rate / kg:</span>
                    <strong className="text-slate-100">₹{card.rate_per_kg.toFixed(2)}/kg</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Immutable history preserved</span>
                <button
                  onClick={() => handleStartEdit(card)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit Rates
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COD Surcharges Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-200">Cash on Delivery (COD) Surcharge Matrix</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codSurcharges.map((cod) => (
            <div key={cod.id} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-amber-300">{cod.order_type} COD Surcharge</span>
                <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[11px]">Flat Surcharge</span>
                  <strong className="text-slate-100 text-sm">₹{cod.flat_amount.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Percentage of Base</span>
                  <strong className="text-slate-100 text-sm">{cod.percent_of_base}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Versioned Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleSaveRateCard} className="bg-slate-900 border border-indigo-700/60 p-6 rounded-2xl max-w-md w-full space-y-4 text-xs">
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              Update Rate Card: {editingCard.order_type} / {editingCard.zone_type}
            </div>

            <div className="bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-xl text-indigo-200">
              <strong>Rate Card Versioning Rule:</strong> This action will deactivate version <code className="font-mono">v{editingCard.version}</code> and insert <code className="font-mono">v{editingCard.version + 1}</code>. Existing orders will keep their historical pricing snapshots intact.
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Base Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={editBaseFee}
                onChange={(e) => setEditBaseFee(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Rate per kg (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={editRatePerKg}
                onChange={(e) => setEditRatePerKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 font-mono text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Publish v${editingCard.version + 1}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
