/**
 * Lead stage state machine — PURE module (plan §4).
 * This table is the single source of truth for legal stage moves.
 * Every stage/commission write in the codebase goes through
 * transitionLead() in service.ts, which consults this module;
 * no other code path may write stage, commission*, lost*, or closedAt.
 */

export const LEAD_STAGE_VALUES = [
  "NEW",
  "WON_ADVANCE_PENDING",
  "WON_ADVANCE_TAKEN",
  "WON_IN_PROCESS",
  "WON_CLOSED",
  "LOST",
] as const;

export type LeadStageValue = (typeof LEAD_STAGE_VALUES)[number];
export type CommissionStatusValue = "NOT_SET" | "EXPECTED" | "PAYABLE" | "PAID";

const TRANSITIONS: Record<LeadStageValue, LeadStageValue[]> = {
  NEW: ["WON_ADVANCE_PENDING", "LOST"],
  WON_ADVANCE_PENDING: ["WON_ADVANCE_TAKEN", "LOST"],
  WON_ADVANCE_TAKEN: ["WON_IN_PROCESS", "LOST"],
  WON_IN_PROCESS: ["WON_CLOSED", "LOST"],
  // Undo-close is listed here but removed by allowedNext() once PAID.
  WON_CLOSED: ["WON_IN_PROCESS"],
  LOST: ["NEW"],
};

/**
 * Legal next stages from `from`. The WON_CLOSED → WON_IN_PROCESS undo is
 * only offered while the commission is not PAID (money terminal state).
 */
export function allowedNext(from: LeadStageValue, commissionStatus: CommissionStatusValue): LeadStageValue[] {
  if (from === "WON_CLOSED" && commissionStatus === "PAID") return [];
  return [...TRANSITIONS[from]];
}

export function isLegalTransition(
  from: LeadStageValue,
  to: LeadStageValue,
  commissionStatus: CommissionStatusValue
): boolean {
  return allowedNext(from, commissionStatus).includes(to);
}

/** Stages from which moving to LOST clears a set commission (audit-logged). */
export function isCommissionedStage(stage: LeadStageValue): boolean {
  return stage === "WON_ADVANCE_TAKEN" || stage === "WON_IN_PROCESS" || stage === "WON_CLOSED";
}
