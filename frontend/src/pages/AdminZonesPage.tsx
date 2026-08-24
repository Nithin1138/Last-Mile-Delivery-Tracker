import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, extractErrorMessage } from '../api/client';
import { Zone, Area } from '../types';
import { Map, Plus, RefreshCw, X, Sparkles, MapPin, Search } from 'lucide-react';

export const AdminZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('');

  // New Zone Modal
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [creatingZone, setCreatingZone] = useState(false);

  // New Pincode Modal
  const [isAddPinOpen, setIsAddPinOpen] = useState(false);
  const [pinPincode, setPinPincode] = useState('');
  const [pinZoneId, setPinZoneId] = useState('');
  const [pinName, setPinName] = useState('');
  const [creatingPin, setCreatingPin] = useState(false);

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
    setCreatingZone(true);
    try {
      await adminApi.createZone(zoneName.trim());
      setIsAddZoneOpen(false);
      setZoneName('');
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setCreatingZone(false);
    }
  };

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinZoneId) return;
    setCreatingPin(true);
    try {
      await adminApi.createArea({
        pincode: pinPincode.trim(),
        zone_id: pinZoneId,
        name: pinName.trim() || undefined,
      });
      setIsAddPinOpen(false);
      setPinPincode('');
      setPinZoneId('');
      setPinName('');
      await fetchData();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setCreatingPin(false);
    }
  };

  // Filtered pincodes
  const filteredAreas = areas.filter((a) => {
    if (selectedZoneFilter && a.zone_id !== selectedZoneFilter) return false;
    if (pincodeSearch.trim()) {
      const q = pincodeSearch.toLowerCase();
      return (
        a.pincode.includes(q) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.zone_name && a.zone_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E5E9] dark:border-[#2B3138]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
              Geographic Zones & Pincode Coverage
            </h1>
            <span className="text-[10px] font-mono text-[#5F6672] dark:text-[#A7ADB5] bg-[#F1F3F5] dark:bg-[#1E2328] px-2 py-0.5 rounded border border-[#E2E5E9] dark:border-[#2B3138]">
              {zones.length} zones · {areas.length} mapped pincodes
            </span>
          </div>
          <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
            Territory boundaries and deterministic pincode mapping for dynamic intra/inter routing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddZoneOpen(true)}
            className="stripe-btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Zone</span>
          </button>
          <button
            onClick={() => setIsAddPinOpen(true)}
            className="bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] border border-[#E2E5E9] dark:border-[#2B3138] text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-[#3157A6] dark:text-[#6D8ED4]" />
            <span>Map Pincode</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zones List (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
              Defined Territories ({zones.length})
            </h2>
            <button
              onClick={fetchData}
              className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => setSelectedZoneFilter('')}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedZoneFilter === ''
                  ? 'bg-[#EBF1FA] dark:bg-[#182232] border-[#3157A6] dark:border-[#6D8ED4] text-[#3157A6] dark:text-[#6D8ED4] font-bold shadow-2xs'
                  : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>All Territories</span>
                <span className="font-mono text-[11px]">{areas.length} pincodes</span>
              </div>
            </div>

            {zones.map((zone) => (
              <div
                key={zone.id}
                onClick={() => setSelectedZoneFilter(selectedZoneFilter === zone.id ? '' : zone.id)}
                className={`p-4 rounded-2xl border text-xs space-y-2 cursor-pointer transition-all ${
                  selectedZoneFilter === zone.id
                    ? 'bg-[#EBF1FA] dark:bg-[#182232] border-[#3157A6] dark:border-[#6D8ED4] shadow-xs'
                    : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#3157A6]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#F1F3F5] dark:bg-[#111417] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E] px-2 py-0.5 rounded">
                    ZONE
                  </span>
                  <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] font-mono">{zone.area_count || 0} pincodes</span>
                </div>
                <div className="text-xs font-bold text-[#171A1F] dark:text-[#E8EAED]">{zone.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pincodes Coverage Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A1F] dark:text-[#E8EAED]">
              Pincode Route Mappings ({filteredAreas.length})
            </h2>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
              <input
                type="text"
                value={pincodeSearch}
                onChange={(e) => setPincodeSearch(e.target.value)}
                placeholder="Search 6-digit PIN or area..."
                className="w-full bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] focus:border-[#3157A6] dark:focus:border-[#6D8ED4] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#171A1F] dark:text-[#E8EAED] placeholder-[#8A919C] dark:placeholder-[#737A84] focus:outline-none transition-all shadow-2xs font-mono"
              />
              {pincodeSearch && (
                <button
                  onClick={() => setPincodeSearch('')}
                  className="absolute right-2.5 top-2 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="stripe-card rounded-2xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F1F3F5] dark:bg-[#1E2328] text-[#5F6672] dark:text-[#A7ADB5] font-mono text-[10px] uppercase border-b border-[#E2E5E9] dark:border-[#2B3138] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Pincode</th>
                    <th className="px-4 py-2.5 font-semibold">Area Name</th>
                    <th className="px-4 py-2.5 font-semibold">Zone Territory</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E5E9] dark:divide-[#2B3138] bg-white dark:bg-[#181C20]">
                  {filteredAreas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-[#8A919C] dark:text-[#737A84]">
                        No matching pincodes found.
                      </td>
                    </tr>
                  ) : (
                    filteredAreas.map((area) => (
                      <tr key={area.id} className="hover:bg-[#F1F3F5]/80 dark:hover:bg-[#1E2328]/80 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-[#171A1F] dark:text-[#E8EAED]">{area.pincode}</td>
                        <td className="px-4 py-2.5 text-[#171A1F] dark:text-[#E8EAED] font-medium">{area.name || 'Central'}</td>
                        <td className="px-4 py-2.5 text-[#3157A6] dark:text-[#6D8ED4] font-medium">{area.zone_name || 'Hub'}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E] px-2 py-0.5 rounded font-mono font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Zone Modal */}
      {isAddZoneOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleCreateZone} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-3.5 text-xs shadow-xl modal-animate">
            <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
              <div className="font-bold text-sm text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                <Map className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                Define Geographic Zone
              </div>
              <button
                type="button"
                onClick={() => setIsAddZoneOpen(false)}
                className="text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Zone Name</label>
              <input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Bangalore Urban Hub"
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setIsAddZoneOpen(false)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingZone}
                className="stripe-btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 font-bold"
              >
                {creatingZone ? 'Saving...' : 'Create Zone'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Map Pincode Modal */}
      {isAddPinOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleCreatePin} className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl max-w-md w-full p-6 space-y-3.5 text-xs shadow-xl modal-animate">
            <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
              <div className="font-bold text-sm text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                Map Pincode to Territory
              </div>
              <button
                type="button"
                onClick={() => setIsAddPinOpen(false)}
                className="text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">6-Digit PIN Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={pinPincode}
                onChange={(e) => setPinPincode(e.target.value)}
                placeholder="560001"
                className="w-full linear-input rounded-lg p-2 font-mono text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Area / Landmark Name</label>
              <input
                type="text"
                value={pinName}
                onChange={(e) => setPinName(e.target.value)}
                placeholder="MG Road, Bangalore Central"
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#171A1F] dark:text-[#E8EAED] mb-1 font-semibold text-[11px]">Assign To Zone Territory</label>
              <select
                required
                value={pinZoneId}
                onChange={(e) => setPinZoneId(e.target.value)}
                className="w-full linear-input rounded-lg p-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer"
              >
                <option value="">-- Select Territory --</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
              <button
                type="button"
                onClick={() => setIsAddPinOpen(false)}
                className="px-3 py-1.5 bg-[#F1F3F5] dark:bg-[#1E2328] hover:bg-[#E2E5E9] dark:hover:bg-[#2B3138] text-[#171A1F] dark:text-[#E8EAED] rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingPin || !pinPincode || !pinZoneId}
                className="stripe-btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 font-bold"
              >
                {creatingPin ? 'Mapping...' : 'Save Mapping'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
