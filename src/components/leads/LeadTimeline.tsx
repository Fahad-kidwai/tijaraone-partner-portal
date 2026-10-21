import React from "react";
import { STAGE_BADGES, type LeadStageKey } from "./StageBadge";

export interface TimelineEvent {
  type: string;
  fromStage: LeadStageKey | null;
  toStage: LeadStageKey | null;
  createdAt: string;
}

function eventLabel(event: TimelineEvent): string {
  if (event.type === "CREATED") return "Token generated";
  if (event.type === "COMMISSION_PAID") return "Commission paid";
  if (event.type === "STAGE_CHANGED" && event.toStage) return `Stage changed to ${STAGE_BADGES[event.toStage].label}`;
  return event.type;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Partner-safe timeline: only CREATED and stage events ever reach this. */
export function LeadTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }
  return (
    <ol className="relative border-l-2 border-slate-100 ml-2 space-y-5">
      {events.map((event, i) => (
        <li key={i} className="pl-5 relative">
          <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#0052FF] border-2 border-white shadow" />
          <p className="text-sm font-bold text-slate-800">{eventLabel(event)}</p>
          <p className="text-xs text-slate-400">{formatDate(event.createdAt)} (Dubai)</p>
        </li>
      ))}
    </ol>
  );
}
