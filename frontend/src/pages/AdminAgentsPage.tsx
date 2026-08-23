import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, extractErrorMessage } from '../api/client';
import { Agent, Zone } from '../types';
import { UserCheck, Plus, RefreshCw, MapPin, Battery, Activity, X } from 'lucide-react';

export const AdminAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add agent modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('agent123');
  const [phone, setPhone] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentsRes, zonesRes] = await Promise.all([
        adminApi.listAgents(),
        adminApi.listZones(),
      ]);
      setAgents(agentsRes);
      setZones(zonesRes);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.createAgent({
        name,
        email,
        password,
        phone: phone || undefined,
        zone_id: zoneId || undefined,
        max_capacity: Number(maxCapacity),
      });
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            Delivery Agent Fleet Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor agent availability, live load capacity, and geographic zone assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="text-xs bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Agent
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading fleet roster...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-lg">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {agents.map((agent, idx) => {
            const isAvailable = agent.availability_status === 'AVAILABLE';
            const isBusy = agent.availability_status === 'BUSY';
            const loadPercent = Math.min(100, Math.round((agent.current_load / agent.max_capacity) * 100));

            return (
              <div
                key={agent.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="bg-slate-900/80 border border-slate-800 card-hover-glow card-enter rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-100">{agent.name}</div>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isBusy
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {agent.availability_status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">{agent.email}</div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-medium truncate">{agent.current_zone_name || 'Floating / Unassigned'}</span>
                    </div>
                    {agent.latitude && agent.longitude && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        GPS: {agent.latitude.toFixed(4)}, {agent.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity Meter */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Load Capacity:</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {agent.current_load} / {agent.max_capacity} orders
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        loadPercent >= 100 ? 'bg-rose-500' : loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Agent Modal rendered via Portal */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleAddAgent} className="bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl max-w-md w-full space-y-4 text-xs shadow-2xl modal-animate">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Register New Delivery Agent
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-slate-100 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@delivery.dev"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-slate-100 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Assigned Operating Zone</label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="">-- Floating Agent (No Specific Zone) --</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}

              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Max Order Capacity</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 5)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 font-mono text-slate-100 focus:outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer transition-all shadow-lg shadow-indigo-600/25"
              >
                {submitting ? 'Registering...' : 'Add Agent'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
