import React from 'react';
import { TimelineEntry } from '../types';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Circle, Clock, ShieldCheck, User, Sparkles } from 'lucide-react';

interface Props {
  entries: TimelineEntry[];
}

export const OrderTimeline: React.FC<Props> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] text-xs text-[#5F6672] dark:text-[#A7ADB5]">
        No state transition records yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E5E9] dark:before:bg-[#2B3138]">
      {entries.map((event, idx) => {
        const isLatest = idx === entries.length - 1;
        const formattedDate = new Date(event.created_at).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'medium',
        });

        return (
          <div key={event.id} className="relative group">
            {/* Timeline Node Icon */}
            <div className="absolute -left-6 top-1">
              {isLatest ? (
                <div className="w-5 h-5 rounded-full bg-[#EBF1FA] dark:bg-[#182232] border-2 border-[#3157A6] dark:border-[#6D8ED4] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] animate-ping" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-white dark:bg-[#181C20] border-2 border-[#E2E5E9] dark:border-[#2B3138] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8A919C] dark:text-[#737A84]" />
                </div>
              )}
            </div>

            {/* Event Card */}
            <div className={`p-3.5 rounded-xl border transition-colors ${
              isLatest 
                ? 'bg-[#EBF1FA]/40 dark:bg-[#182232]/40 border-[#D0DEF2] dark:border-[#25354E]' 
                : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138]'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={event.new_status} size="sm" />
                  {event.previous_status && (
                    <span className="text-[10px] text-[#8A919C] dark:text-[#737A84]">
                      (from {event.previous_status})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#8A919C] dark:text-[#737A84] font-mono">
                  {formattedDate}
                </span>
              </div>

              {event.reason && (
                <p className="text-xs text-[#171A1F] dark:text-[#E8EAED] mt-2 font-medium bg-[#F1F3F5] dark:bg-[#1E2328] p-2 rounded-lg border border-[#E2E5E9] dark:border-[#2B3138]">
                  "{event.reason}"
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-[10px] text-[#5F6672] dark:text-[#A7ADB5]">
                {event.actor_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#8A919C] dark:text-[#737A84]" />
                    <strong className="text-[#171A1F] dark:text-[#E8EAED]">{event.actor_name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
