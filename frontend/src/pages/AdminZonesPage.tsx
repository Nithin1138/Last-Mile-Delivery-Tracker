import React, { useState, useEffect } from 'react';
import { adminApi, extractErrorMessage } from '../api/client';
import { Zone, Area } from '../types';
import { Map, Plus, RefreshCw, Layers, MapPin } from 'lucide-react';

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
    if (!newZoneName) return;
    setAddingZone(true);
    try {
      await adminApi.createZone(newZoneName);
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
    if (!newPincode || !selectedZoneId) return;
    setAddingArea(true);
    try {
      await adminApi.createArea({
        pincode: newPincode,
        name: newAreaName || undefined,
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Map className="w-6 h-6 text-indigo-400" />
          Zones & Pincode Area Mapping
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Deterministic Pincode → Area → Zone resolution powering fast intra/inter-zone detection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Zones Management (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Delivery Zones ({zones.length})
            </h2>

            {/* Add Zone Form */}
            <form onSubmit={handleCreateZone} className="flex gap-2">
              <input
                type="text"
                required
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="New zone name (e.g. West Hub)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
              <button
                type="submit"
                disabled={addingZone || !newZoneName}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </form>

            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="font-semibold text-slate-200">{zone.name}</div>
                  <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {areas.filter((a) => a.zone_id === zone.id).length} pincodes
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Pincode Areas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Pincode Mappings ({areas.length})
            </h2>

            {/* Add Area Form */}
            <form onSubmit={handleCreateArea} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
              <input
                type="text"
                required
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                placeholder="Pincode (e.g. 560001)"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
              />
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Locality Name"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
              <div className="flex gap-2">
                <select
                  required
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={addingArea || !newPincode || !selectedZoneId}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  Map
                </button>
              </div>
            </form>

            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-mono sticky top-0">
                  <tr>
                    <th className="p-3">Pincode</th>
                    <th className="p-3">Area / Locality</th>
                    <th className="p-3">Assigned Zone</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                  {areas.map((area) => (
                    <tr key={area.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-indigo-300">{area.pincode}</td>
                      <td className="p-3 text-slate-200">{area.name || '—'}</td>
                      <td className="p-3 font-medium text-slate-300">{area.zone_name}</td>
                      <td className="p-3">
                        <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[10px]">
                          Active
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
