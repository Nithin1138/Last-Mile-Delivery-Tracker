import React from 'react';
import { TimelineEntry } from '../types';
import { StatusBadge } from './StatusBadge';
import { Clock, User, CheckCircle2, ShieldAlert, Truck, Sparkles } from 'lucide-react';

interface Props {
  entries: TimelineEntry[];
}

export const OrderTimeline: React.FC<Props> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-xs text-slate-400 p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
        No tracking events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-slate-700 before:to-slate-800">
      {entries.map((entry, idx) => {
        const isLatest = idx === entries.length - 1;
        const date = new Date(entry.created_at);
        const formattedDate = date.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        return (
          <div key={entry.id} className="relative group animate-in fade-in slide-in-from-left-2 duration-200">
            {/* Timeline Indicator Dot */}
            <div
              className={`absolute -left-7 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isLatest
                  ? 'bg-indigo-600 border-indigo-400 shadow-md shadow-indigo-500/30 ring-4 ring-indigo-500/20 scale-110'
                  : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'
              }`}
            >
              {isLatest ? (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              )}
            </div>

            {/* Timeline Event Card */}
            <div className={`border rounded-2xl p-4 shadow-lg space-y-2.5 transition-all ${
              isLatest 
                ? 'bg-slate-900/95 border-indigo-500/40 shadow-indigo-950/20' 
                : 'bg-slate-900/70 border-slate-800/80 card-hover-subtle'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={entry.new_status} size="sm" showPulse={isLatest} />
                  {entry.previous_status && (
                    <span className="text-[11px] text-slate-400">
                      (from <span className="font-mono text-slate-300 font-medium">{entry.previous_status}</span>)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formattedDate}</span>
                </div>
              </div>

              {entry.reason && (
                <div className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  <span className="text-slate-500 font-medium">Audit Note: </span>
                  {entry.reason}
                </div>
              )}

              {entry.actor_name && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Recorded by: <strong className="text-slate-200 font-semibold">{entry.actor_name}</strong></span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
