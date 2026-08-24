import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, extractErrorMessage } from '../api/client';
import { Agent, Zone, AgentAvailability } from '../types';
import { 
  Users, 
  UserCheck, 
  Plus, 
  RefreshCw, 
  X, 
  MapPin, 
  ShieldCheck,
  Search,
  CheckCircle2,
  Phone,
  Clock,
  Filter
} from 'lucide-react';

export const AdminAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | AgentAvailability>('ALL');
  const [search, setSearch] = useState('');

  // New Agent Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [zoneId, setZoneId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [creating, setCreating] = useState(false);

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

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createAgent({
        name,
        email,
        phone,
        current_zone_id: zoneId || undefined,
        max_capacity: Number(maxCapacity),
        availability_status: 'AVAILABLE',
      });
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('+91');
      setZoneId('');
      setMaxCapacity(10);
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  // Filtered Couriers
  const filteredAgents = agents.filter((a) => {
    if (statusFilter !== 'ALL' && a.availability_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.current_zone_name && a.current_zone_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableCount = agents.filter(a => a.availability_status === 'AVAILABLE').length;
  const busyCount = agents.filter(a => a.availability_status === 'BUSY').length;
  const offlineCount = agents.filter(a => a.availability_status === 'OFFLINE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E5E9] dark:border-[#2B3138]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              Delivery Agents & Couriers
            </h1>
            <span className="text-[10px] font-mono text-[#5F6672] dark:text-[#A7ADB5] bg-[#F1F3F5] dark:bg-[#1E2328] px-2 py-0.5 rounded border border-[#E2E5E9] dark:border-[#2B3138]">
              {agents.length} active couriers
            </span>
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            Real-time courier load meters, hub zoning assignments, and dispatch availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="stripe-btn-primary text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard Courier</span>
          </button>
        </div>
      </div>

      {/* Triage & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] p-1 rounded-xl text-xs overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-[#181C20] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            All Couriers ({agents.length})
          </button>

          <button
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'AVAILABLE'
                ? 'bg-white dark:bg-[#181C20] text-[#287A55] dark:text-[#55A878] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            Available ({availableCount})
          </button>

          <button
            onClick={() => setStatusFilter('BUSY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'BUSY'
                ? 'bg-white dark:bg-[#181C20] text-[#A66A16] dark:text-[#D19A4A] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            On Route ({busyCount})
          </button>

          <button
            onClick={() => setStatusFilter('OFFLINE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'OFFLINE'
                ? 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
            }`}
          >
            Shift Ended ({offlineCount})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or hub..."
            className="w-full bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] focus:border-[#3157A6] dark:focus:border-[#6D8ED4] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] placeholder-[#8A919C] dark:placeholder-[#737A84] focus:outline-none transition-all shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="p-16 text-center text-[#8A919C] dark:text-[#737A84] text-xs stripe-card rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[11px]">Loading agents directory...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-2xl text-[#B54848] dark:text-[#D56B6B] text-xs">
          {error}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="p-16 text-center text-[#5F6672] dark:text-[#A7ADB5] text-xs stripe-card rounded-2xl space-y-3">
          <Users className="w-8 h-8 text-[#8A919C] dark:text-[#737A84] mx-auto" />
          <div className="font-bold text-[#171A1F] dark:text-[#E8EAED]">No couriers match your filter</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent, idx) => {
            const isAvailable = agent.availability_status === 'AVAILABLE';
            const loadPercent = Math.round((agent.current_load / agent.max_capacity) * 100);

            return (
              <div
                key={agent.id}
                style={{ animationDelay: `${idx * 25}ms` }}
                className="stripe-card-interactive card-enter rounded-2xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#3157A6] dark:text-[#6D8ED4]" />
                        {agent.name}
                      </h3>
                      <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono mt-0.5">{agent.email}</div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                        isAvailable
                          ? 'bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border-[#C8E5D6] dark:border-[#203D2E]'
                          : agent.availability_status === 'BUSY'
                          ? 'bg-[#FAF3E8] dark:bg-[#292014] text-[#A66A16] dark:text-[#D19A4A] border-[#F2DEBF] dark:border-[#42321D]'
                          : 'bg-[#F1F3F5] dark:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] border-[#E2E5E9] dark:border-[#2B3138]'
                      }`}
                    >
                      {agent.availability_status}
                    </span>
                  </div>

                  <div className="bg-[#F1F3F5] dark:bg-[#1E2328] p-3 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5F6672] dark:text-[#A7ADB5]">Current Hub:</span>
                      <strong className="text-[#171A1F] dark:text-[#E8EAED] font-medium">{agent.current_zone_name || 'Central Hub'}</strong>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">
                        <span>Vehicle Load Capacity:</span>
                        <span>{agent.current_load} / {agent.max_capacity} pkgs ({loadPercent}%)</span>
                      </div>
                      <div className="w-full bg-[#E2E5E9] dark:bg-[#2B3138] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            loadPercent >= 90 ? 'bg-[#B54848] dark:bg-[#D56B6B]' : loadPercent >= 60 ? 'bg-[#A66A16] dark:bg-[#D19A4A]' : 'bg-[#287A55] dark:bg-[#55A878]'
                          }`}
                          style={{ width: `${Math.min(loadPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] font-mono flex items-center justify-between pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                  <span>Phone: {agent.phone || 'N/A'}</span>
                  <span>Active: {agent.is_active ? 'Yes' : 'No'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Onboard Agent Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleCreateAgent} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-3.5 text-xs shadow-xl modal-animate">
            <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
              <div className="font-bold text-sm text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                Onboard Delivery Courier
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh.kumar@delivery.dev"
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Mobile Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setPhone('+91');
                  } else if (!val.startsWith('+')) {
                    setPhone('+91' + val.replace(/\D/g, ''));
                  } else {
                    setPhone(val);
                  }
                }}
                placeholder="+91 98765 43210"
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Home Base Hub</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Central Hub --</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Max Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 10)}
                  className="w-full linear-input rounded-lg p-2 font-mono text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="stripe-btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 font-bold"
              >
                {creating ? 'Registering...' : 'Register Courier'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
