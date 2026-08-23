import React from 'react';
import { AssignmentDecision } from '../types';
import { Compass, Users, CheckCircle2, MapPin, Sparkles } from 'lucide-react';

interface Props {
  decisions: AssignmentDecision[];
}

export const AssignmentAuditCard: React.FC<Props> = ({ decisions }) => {
  if (!decisions || decisions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {decisions.map((decision) => (
        <div key={decision.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Compass className="w-4 h-4" />
              </div>
              <span>Assignment Decision Audit ({decision.selection_mode})</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {new Date(decision.created_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-xl card-hover-subtle">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Selected Fleet Agent</div>
              <div className="text-sm font-extrabold text-slate-100 mt-1">{decision.selected_agent_name || 'Auto-Assigned'}</div>
              {decision.selected_distance_km !== null && (
                <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3" />
                  {decision.selected_distance_km} km (Haversine)
                </div>
              )}
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-xl card-hover-subtle">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Candidate Pool</div>
              <div className="text-sm font-extrabold text-indigo-300 mt-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{decision.candidate_count} eligible candidate{decision.candidate_count === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-xl card-hover-subtle">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Dispatch Rule</div>
              <div className="text-xs font-bold text-emerald-400 mt-1 font-mono">
                {decision.reason || 'nearest_available_agent'}
              </div>
            </div>
          </div>

          {/* Ranked Candidates Table */}
          {decision.candidates && decision.candidates.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Candidate Ranking Breakdown:</div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Agent</th>
                      <th className="p-3">Zone Match</th>
                      <th className="p-3">Distance</th>
                      <th className="p-3">Load</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {decision.candidates.map((cand, idx) => {
                      const isSelected = cand.agent_id === decision.selected_agent_id;
                      return (
                        <tr key={cand.agent_id} className={`transition-colors ${isSelected ? 'bg-indigo-950/40 text-indigo-200 font-medium' : 'text-slate-300 hover:bg-slate-900/50'}`}>
                          <td className="p-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                          <td className="p-3 font-bold flex items-center gap-1.5">
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                            <span>{cand.agent_name}</span>
                          </td>
                          <td className="p-3">
                            {cand.zone_match ? (
                              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Same Zone</span>
                            ) : (
                              <span className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full text-[10px]">Other Zone</span>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            {cand.distance_km !== null ? `${cand.distance_km} km` : 'N/A'}
                          </td>
                          <td className="p-3 font-mono">{cand.current_load} / {cand.max_capacity}</td>
                          <td className="p-3">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {cand.availability}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
