import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { transitionLead } from "@/lib/leads/service";
import { ServiceError } from "@/lib/partners/service";
import { allowedNext, LEAD_STAGE_VALUES, type LeadStageValue } from "@/lib/leads/stateMachine";
import { generateToken } from "@/lib/leads/token";
import type { Lead, User } from "@prisma/client";

/**
 * The exhaustive 6x6 transition matrix — deliberately in its own file and
 * run via `npm run test:slow` so the default `npm test` stays fast.
 * Both suites run before every phase sign-off.
 */
const IS_DEV = process.env.NEON_BRANCH === "dev";
const RUN = IS_DEV ? describe : describe.skip;
const PREFIX = `matrix-test-${randomUUID().slice(0, 8)}`;

let counter = 0;
const email = (label: string) => `${PREFIX}-${label}-${counter++}@dev.tijaraone.local`;

let ceo: User;
let partner: User;
const silentMail = { sendMail: async () => {} };

async function leadAt(stage: LeadStageValue): Promise<Lead> {
  const lead = await prisma.lead.create({
    data: {
      token: generateToken(),
      partnerId: partner.id,
      clientName: `Matrix ${counter++}`,
      clientPhone: `+97153${String(1000000 + counter++).slice(-7)}`,
      serviceType: "MAINLAND_SETUP",
      stage,
      ...(stage === "WON_ADVANCE_TAKEN" || stage === "WON_IN_PROCESS" || stage === "WON_CLOSED"
        ? {
            totalAmount: "10000.00",
            commissionPercent: "25.00",
            commissionAmount: "2500.00",
            commissionStatus: stage === "WON_CLOSED" ? "PAYABLE" : "EXPECTED",
          }
        : {}),
      ...(stage === "WON_CLOSED" ? { closedAt: new Date() } : {}),
      ...(stage === "LOST" ? { lostReason: "PRICE" as const } : {}),
    },
  });
  await prisma.leadEvent.create({ data: { leadId: lead.id, actorId: partner.id, type: "CREATED", toStage: "NEW" } });
  return lead;
}

RUN("leads: transition matrix 6x6 (slow, dev branch)", () => {
  beforeAll(async () => {
    if (!IS_DEV) throw new Error("NEON_BRANCH must be dev");
    ceo = await prisma.user.create({
      data: { role: "CEO", name: "Matrix CEO", email: email("ceo"), phone: "+971500000001", companyName: "Matrix Co" },
    });
    partner = await prisma.user.create({
      data: { role: "PARTNER", name: "Matrix Partner", email: email("partner"), phone: "+971500000002", companyName: "Matrix Co" },
    });
  });

  afterAll(async () => {
    await prisma.leadEvent.deleteMany({ where: { actor: { email: { startsWith: PREFIX } } } });
    await prisma.lead.deleteMany({ where: { partner: { email: { startsWith: PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it(
    "every legal pair succeeds, every illegal pair is 409 INVALID_TRANSITION with allowedNext",
    { timeout: 600_000 },
    async () => {
      for (const from of LEAD_STAGE_VALUES) {
        for (const to of LEAD_STAGE_VALUES) {
          const lead = await leadAt(from);
          const legal = allowedNext(from, "EXPECTED").includes(to);
          const input = {
            toStage: to,
            expectedStage: from,
            ...(to === "WON_ADVANCE_TAKEN" ? { totalAmount: "5000.00" } : {}),
            ...(to === "LOST" ? { lostReason: "PRICE" as const } : {}),
          };
          if (legal) {
            const dto = await transitionLead(ceo, lead.id, input, prisma, silentMail);
            expect(dto.stage).toBe(to);
          } else {
            try {
              await transitionLead(ceo, lead.id, input, prisma, silentMail);
              expect.unreachable("should have thrown");
            } catch (error) {
              expect(error).toBeInstanceOf(ServiceError);
              const e = error as ServiceError;
              expect(e.status).toBe(409);
              expect(e.code).toBe("INVALID_TRANSITION");
              expect(e.extra?.allowedNext).toEqual(allowedNext(from, "EXPECTED"));
            }
          }
        }
      }
    }
  );
});
