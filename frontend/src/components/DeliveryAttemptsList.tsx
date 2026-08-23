import React from 'react';
import { DeliveryAttempt } from '../types';
import { CheckCircle2, Clock, Truck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface Props {
  attempts: DeliveryAttempt[];
}

export const DeliveryAttemptsList: React.FC<Props> = ({ attempts }) => {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="text-xs text-slate-400 p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
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
            className={`border rounded-2xl p-4 transition-all shadow-lg card-hover-subtle ${
              isFailed
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-200 shadow-rose-950/10'
                : isDelivered
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200 shadow-emerald-950/10'
                : 'bg-slate-950/70 border-slate-800/80 text-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs bg-slate-900 px-3 py-1 rounded-xl border border-slate-700/80 font-mono text-slate-100 shadow-sm">
                  Attempt #{attempt.attempt_number}
                </span>
                {isDelivered && (
                  <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Delivered Successfully
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-1 text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Delivery Failed
                  </span>
                )}
                {isInProgress && (
                  <span className="flex items-center gap-1 text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    Out for Delivery
                  </span>
                )}
              </div>

              {attempt.agent_name && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Truck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Assigned Agent: <strong className="text-slate-100 font-semibold">{attempt.agent_name}</strong></span>
                </div>
              )}
            </div>

            {/* Failure Reason */}
            {isFailed && attempt.failure_reason && (
              <div className="mt-3 text-xs bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl text-rose-300 leading-relaxed">
                <div className="font-semibold text-rose-400 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Recorded Failure Reason:
                </div>
                <div>{attempt.failure_reason}</div>
              </div>
            )}

            {/* Attempt Timestamps */}
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400 font-mono">
              {attempt.started_at && (
                <div>
                  <span className="text-slate-500">Started: </span>
                  {new Date(attempt.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {attempt.completed_at && (
                <div>
                  <span className="text-slate-500">Finished: </span>
                  {new Date(attempt.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
