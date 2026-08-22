import React from 'react';
import { AssignmentDecision } from '../types';
import { Compass, Users, CheckCircle2, MapPin } from 'lucide-react';

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
        <div key={decision.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Compass className="w-4 h-4" />
              <span>Assignment Decision Audit ({decision.selection_mode})</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {new Date(decision.created_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-slate-400">Selected Agent</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">{decision.selected_agent_name || 'Assigned'}</div>
              {decision.selected_distance_km !== null && (
                <div className="text-[11px] text-cyan-400 mt-0.5 flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3" />
                  {decision.selected_distance_km} km (Haversine)
                </div>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-slate-400">Candidates Evaluated</div>
              <div className="text-sm font-bold text-indigo-300 mt-0.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{decision.candidate_count} eligible agent{decision.candidate_count === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-slate-400">Algorithm Reason</div>
              <div className="text-xs font-semibold text-emerald-400 mt-0.5 font-mono">
                {decision.reason || 'nearest_agent'}
              </div>
            </div>
          </div>

          {/* Ranked Candidates Table */}
          {decision.candidates && decision.candidates.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-slate-400 mb-1.5">Candidate Ranking Breakdown:</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-700/60 rounded-lg overflow-hidden">
                  <thead className="bg-slate-900/80 text-slate-400 font-mono">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">Agent</th>
                      <th className="p-2">Zone Match</th>
                      <th className="p-2">Haversine Distance</th>
                      <th className="p-2">Current Load</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                    {decision.candidates.map((cand, idx) => {
                      const isSelected = cand.agent_id === decision.selected_agent_id;
                      return (
                        <tr key={cand.agent_id} className={isSelected ? 'bg-indigo-950/40 text-indigo-200 font-medium' : 'text-slate-300'}>
                          <td className="p-2 font-mono">#{idx + 1}</td>
                          <td className="p-2 font-semibold flex items-center gap-1.5">
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                            {cand.agent_name}
                          </td>
                          <td className="p-2">
                            {cand.zone_match ? (
                              <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px]">Same Zone</span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Other Zone</span>
                            )}
                          </td>
                          <td className="p-2 font-mono">
                            {cand.distance_km !== null ? `${cand.distance_km} km` : 'No GPS'}
                          </td>
                          <td className="p-2 font-mono">{cand.current_load} / {cand.max_capacity}</td>
                          <td className="p-2">
                            <span className="bg-emerald-950/50 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">
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
