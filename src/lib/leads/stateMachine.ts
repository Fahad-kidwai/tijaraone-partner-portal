/**
 * Token phase rules — PURE module.
 * All stage/commission writes go through service.ts; no other path may
 * write stage, commission*, or completedAt.
 */

export const LEAD_STAGE_VALUES = ["ADVANCE_RECEIVED", "IN_PROGRESS", "COMPLETED"] as const;

export type LeadStageValue = (typeof LEAD_STAGE_VALUES)[number];
export type CommissionStatusValue = "EXPECTED" | "PAYABLE" | "PAID";

/** Any phase ↔ any other phase until commission is PAID (then locked). */
export function allowedNext(from: LeadStageValue, commissionStatus: CommissionStatusValue): LeadStageValue[] {
  if (commissionStatus === "PAID") return [];
  return LEAD_STAGE_VALUES.filter((s) => s !== from);
}

export function isLegalTransition(
  from: LeadStageValue,
  to: LeadStageValue,
  commissionStatus: CommissionStatusValue
): boolean {
  if (from === to) return false;
  return allowedNext(from, commissionStatus).includes(to);
}

/** Commission status derived from stage (not yet PAID). */
export function commissionStatusForStage(stage: LeadStageValue): "EXPECTED" | "PAYABLE" {
  return stage === "COMPLETED" ? "PAYABLE" : "EXPECTED";
}
