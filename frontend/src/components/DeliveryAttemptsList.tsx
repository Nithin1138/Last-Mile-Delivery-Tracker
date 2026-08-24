import React from 'react';
import { DeliveryAttempt } from '../types';
import { ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  attempts: DeliveryAttempt[];
}

export const DeliveryAttemptsList: React.FC<Props> = ({ attempts }) => {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-[#F1F3F5] dark:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138] text-xs text-[#5F6672] dark:text-[#A7ADB5] font-mono">
        No failed delivery attempts recorded.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attempts.map((attempt) => {
        const timeStr = attempt.completed_at || attempt.started_at || attempt.created_at;
        const formattedDate = timeStr ? new Date(timeStr).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }) : '';

        return (
          <div
            key={attempt.id}
            className="p-3 bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] rounded-xl space-y-1.5 text-xs text-[#B54848] dark:text-[#D56B6B]"
          >
            <div className="flex items-center justify-between font-mono font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#B54848] dark:text-[#D56B6B]" />
                Attempt #{attempt.attempt_number} ({attempt.status})
              </span>
              {formattedDate && (
                <span className="text-[10px] text-[#B54848] dark:text-[#D56B6B] font-normal">
                  {formattedDate}
                </span>
              )}
            </div>
            {attempt.failure_reason && (
              <div className="text-[11px] bg-white/80 dark:bg-[#181C20]/80 p-2 rounded-lg border border-[#F2D0D0] dark:border-[#432323] text-[#171A1F] dark:text-[#E8EAED]">
                <span className="font-semibold text-[#B54848] dark:text-[#D56B6B]">Reason: </span>
                {attempt.failure_reason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
