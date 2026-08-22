import React from 'react';
import { TimelineEntry } from '../types';
import { StatusBadge } from './StatusBadge';
import { Clock, User } from 'lucide-react';

interface Props {
  entries: TimelineEntry[];
}

export const OrderTimeline: React.FC<Props> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-sm text-slate-400 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        No tracking history recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-700">
      {entries.map((entry, idx) => {
        const isLatest = idx === entries.length - 1;
        const date = new Date(entry.created_at);
        const formattedDate = date.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        return (
          <div key={entry.id} className="relative group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isLatest
                  ? 'bg-indigo-600 border-indigo-400 ring-4 ring-indigo-500/20'
                  : 'bg-slate-900 border-slate-600'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-500'}`} />
            </div>

            {/* Timeline Content */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.new_status} size="sm" />
                  {entry.previous_status && (
                    <span className="text-xs text-slate-400">
                      (from <span className="font-mono text-slate-300">{entry.previous_status}</span>)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formattedDate}</span>
                </div>
              </div>

              {entry.reason && (
                <div className="mt-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 font-medium">Note: </span>
                  {entry.reason}
                </div>
              )}

              {entry.actor_name && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>Updated by: <strong className="text-slate-300">{entry.actor_name}</strong></span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
