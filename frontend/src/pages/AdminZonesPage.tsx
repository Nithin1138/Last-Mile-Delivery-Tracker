import React, { useState, useEffect } from 'react';
import { adminApi, extractErrorMessage } from '../api/client';
import { Zone, Area } from '../types';
import { Map, Plus, RefreshCw, Layers, MapPin, Sparkles } from 'lucide-react';

export const AdminZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Zone
  const [newZoneName, setNewZoneName] = useState('');
  const [addingZone, setAddingZone] = useState(false);

  // Add Area
  const [newPincode, setNewPincode] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [addingArea, setAddingArea] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [zonesRes, areasRes] = await Promise.all([
        adminApi.listZones(),
        adminApi.listAreas(),
      ]);
      setZones(zonesRes);
      setAreas(areasRes);
      if (zonesRes.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zonesRes[0].id);
      }
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    setAddingZone(true);
    try {
      await adminApi.createZone(newZoneName.trim());
      setNewZoneName('');
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setAddingZone(false);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPincode.trim() || !selectedZoneId) return;
    setAddingArea(true);
    try {
      await adminApi.createArea({
        pincode: newPincode.trim(),
        name: newAreaName.trim() || undefined,
        zone_id: selectedZoneId,
      });
      setNewPincode('');
      setNewAreaName('');
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setAddingArea(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Map className="w-5 h-5" />
          </div>
          Zones & Pincode Area Mapping
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deterministic Pincode → Area → Zone resolution powering intra/inter-zone detection and delivery routing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Zones Management (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Delivery Zones ({zones.length})
            </h2>

            {/* Create Zone Form */}
            <form onSubmit={handleCreateZone} className="flex gap-2">
              <input
                type="text"
                required
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="New Zone Name (e.g. South Delhi)"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={addingZone || !newZoneName.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </form>

            {/* Zones List */}
            <div className="space-y-2.5">
              {zones.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
                        <span>{zone.name}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Zone ID: {zone.id.slice(0, 8)}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      Active
                    </span>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Areas & Pincodes (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Pincode Coverage Directory ({areas.length})
              </h2>
              <button
                onClick={fetchData}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {/* Create Area Form */}
            <form onSubmit={handleCreateArea} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <input
                type="text"
                required
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                placeholder="6-Digit Pincode"
                className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
              />
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Area Name (e.g. Bandra)"
                className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={addingArea || !newPincode.trim() || !selectedZoneId}
                className="bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-600/25 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Map to Zone
              </button>
            </form>

            {/* Areas Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Pincode</th>
                    <th className="p-3.5">Area Name</th>
                    <th className="p-3.5">Mapped Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {areas.map((area) => (
                    <tr key={area.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-200">{area.pincode}</td>
                      <td className="p-3.5 text-slate-300">{area.name || 'Generic Locality'}</td>
                      <td className="p-3.5">
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                          {area.zone_name || 'Unassigned'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
