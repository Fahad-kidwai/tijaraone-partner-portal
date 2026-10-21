import { describe, it, expect } from "vitest";
import {
  allowedNext,
  isLegalTransition,
  LEAD_STAGE_VALUES,
  type LeadStageValue,
} from "@/lib/leads/stateMachine";

const EXPECTED: Record<LeadStageValue, LeadStageValue[]> = {
  NEW: ["WON_ADVANCE_PENDING", "LOST"],
  WON_ADVANCE_PENDING: ["WON_ADVANCE_TAKEN", "LOST"],
  WON_ADVANCE_TAKEN: ["WON_IN_PROCESS", "LOST"],
  WON_IN_PROCESS: ["WON_CLOSED", "LOST"],
  WON_CLOSED: ["WON_IN_PROCESS"],
  LOST: ["NEW"],
};

describe("leads: state machine transition table (pure)", () => {
  it("allowedNext matches the plan §4 table exactly for every stage", () => {
    for (const stage of LEAD_STAGE_VALUES) {
      expect(allowedNext(stage, "EXPECTED")).toEqual(EXPECTED[stage]);
    }
  });

  it("undo-close disappears once the commission is PAID (terminal money state)", () => {
    expect(allowedNext("WON_CLOSED", "PAID")).toEqual([]);
    expect(isLegalTransition("WON_CLOSED", "WON_IN_PROCESS", "PAID")).toBe(false);
    expect(isLegalTransition("WON_CLOSED", "WON_IN_PROCESS", "PAYABLE")).toBe(true);
  });

  it("every other from/to pair in the 6x6 grid is illegal", () => {
    for (const from of LEAD_STAGE_VALUES) {
      for (const to of LEAD_STAGE_VALUES) {
        const legal = EXPECTED[from].includes(to);
        expect(isLegalTransition(from, to, "EXPECTED")).toBe(legal);
      }
    }
  });
});
