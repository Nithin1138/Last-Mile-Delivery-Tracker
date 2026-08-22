import React from 'react';
import { DeliveryAttempt } from '../types';
import { AlertCircle, CheckCircle, Clock, Truck, ShieldAlert } from 'lucide-react';

interface Props {
  attempts: DeliveryAttempt[];
}

export const DeliveryAttemptsList: React.FC<Props> = ({ attempts }) => {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="text-sm text-slate-400 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
        No delivery attempts recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt) => {
        const isFailed = attempt.status === 'FAILED';
        const isDelivered = attempt.status === 'DELIVERED';
        const isInProgress = attempt.status === 'IN_PROGRESS';

        return (
          <div
            key={attempt.id}
            className={`border rounded-xl p-4 transition-all ${
              isFailed
                ? 'bg-rose-950/20 border-rose-700/40 text-rose-200'
                : isDelivered
                ? 'bg-emerald-950/20 border-emerald-700/40 text-emerald-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
                  Attempt #{attempt.attempt_number}
                </span>
                {isDelivered && (
                  <span className="flex items-center gap-1 text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Success
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-1 text-xs bg-rose-950/80 text-rose-300 border border-rose-700 px-2 py-0.5 rounded-full font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Failed
                  </span>
                )}
                {isInProgress && (
                  <span className="flex items-center gap-1 text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded-full font-medium">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    In Progress
                  </span>
                )}
              </div>

              {attempt.agent_name && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Truck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Agent: <strong>{attempt.agent_name}</strong></span>
                </div>
              )}
            </div>

            {/* Failure Reason */}
            {isFailed && attempt.failure_reason && (
              <div className="mt-3 text-xs bg-rose-900/30 border border-rose-700/50 p-2.5 rounded-lg flex items-start gap-2 text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300">Failure Reason: </strong>
                  {attempt.failure_reason}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400 font-mono">
              {attempt.started_at && (
                <div>Started: {new Date(attempt.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              )}
              {attempt.completed_at && (
                <div>Completed: {new Date(attempt.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
