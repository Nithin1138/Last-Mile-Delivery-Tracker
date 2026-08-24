import React from 'react';
import { AssignmentDecision, AssignmentCandidate } from '../types';
import { Compass, CheckCircle2, ShieldAlert, Users, Navigation } from 'lucide-react';

interface Props {
  decisions: AssignmentDecision[];
}

export const AssignmentAuditCard: React.FC<Props> = ({ decisions }) => {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] text-xs text-[#5F6672] dark:text-[#A7ADB5]">
        No automated assignment decisions recorded.
      </div>
    );
  }

  const latest = decisions[decisions.length - 1];

  return (
    <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] rounded-2xl p-4 space-y-3.5 text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-[#E2E5E9] dark:border-[#2B3138] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-[#171A1F] dark:text-[#E8EAED]">Assignment Decision Audit</div>
            <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5]">Mode: <span className="font-semibold uppercase">{latest.selection_mode}</span></div>
          </div>
        </div>

        <span className="text-[10px] bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E] px-2 py-0.5 rounded font-semibold">
          Evaluated {latest.candidate_count} courier(s)
        </span>
      </div>

      {/* Selected Winner */}
      <div className="bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] p-3 rounded-xl space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#171A1F] dark:text-[#E8EAED] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#287A55] dark:text-[#55A878]" />
            Selected: {latest.selected_agent_name || 'Agent'}
          </span>
          {latest.selected_distance_km !== null && latest.selected_distance_km !== undefined && (
            <span className="text-[10px] text-[#3157A6] dark:text-[#6D8ED4] bg-[#EBF1FA] dark:bg-[#182232] px-2 py-0.5 rounded font-semibold border border-[#D0DEF2] dark:border-[#25354E]">
              <span className="font-mono">{latest.selected_distance_km}</span> km away
            </span>
          )}
        </div>
        {latest.reason && (
          <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5]">
            Decision Factor: <span className="font-medium text-[#171A1F] dark:text-[#E8EAED]">{latest.reason}</span>
          </div>
        )}
      </div>

      {/* Candidates Evaluated Matrix */}
      {latest.candidates && latest.candidates.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] uppercase font-bold tracking-wider">Candidate Score Matrix</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {latest.candidates.map((c: AssignmentCandidate) => {
              const isChosen = c.agent_id === latest.selected_agent_id;
              return (
                <div
                  key={c.agent_id}
                  className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                    isChosen
                      ? 'bg-[#EAF5F0]/60 dark:bg-[#16271E]/60 border-[#C8E5D6] dark:border-[#203D2E] text-[#171A1F] dark:text-[#E8EAED]'
                      : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] text-[#5F6672] dark:text-[#A7ADB5]'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="truncate">{c.agent_name}</span>
                    {isChosen && <span className="text-[9px] text-[#287A55] dark:text-[#55A878] font-bold uppercase">Dispatched</span>}
                  </div>
                  <div className="flex justify-between text-[10px] text-[#8A919C] dark:text-[#737A84]">
                    <span>Load: {c.current_load}/{c.max_capacity}</span>
                    {c.distance_km !== null && <span><span className="font-mono">{c.distance_km}</span> km</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
