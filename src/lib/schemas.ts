import { z } from "zod";
import { parsePhone } from "./phone";
import { DEFAULT_COMMISSION_PERCENT } from "./leads/commission";

/**
 * Single source of truth for every input shape (client + server).
 * DTO types are inferred from these schemas / the mappers in later phases;
 * never redefine API types ad-hoc in a component.
 */

export const ROLES = ["CEO", "PARTNER"] as const;
export const SERVICE_TYPES = [
  "MAINLAND_SETUP",
  "FREEZONE_LICENSE",
  "CORPORATE_TAX",
  "BANK_ACCOUNT_SETUP",
  "GOLDEN_VISA",
] as const;
export const SERVICE_TYPE_LABELS: Record<(typeof SERVICE_TYPES)[number], string> = {
  MAINLAND_SETUP: "Mainland Setup",
  FREEZONE_LICENSE: "Freezone License",
  CORPORATE_TAX: "Corporate Tax",
  BANK_ACCOUNT_SETUP: "Bank Account Setup",
  GOLDEN_VISA: "Golden Visa",
};

export const LEAD_STAGES = [
  "NEW",
  "WON_ADVANCE_PENDING",
  "WON_ADVANCE_TAKEN",
  "WON_IN_PROCESS",
  "WON_CLOSED",
  "LOST",
] as const;
export const COMMISSION_STATUSES = ["NOT_SET", "EXPECTED", "PAYABLE", "PAID"] as const;
export const LOST_REASONS = ["PRICE", "NO_RESPONSE", "WENT_ELSEWHERE", "NOT_ELIGIBLE", "OTHER"] as const;

export { DEFAULT_COMMISSION_PERCENT };

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

export const phoneSchema = z.string().trim().transform((value, ctx) => {
  try {
    return parsePhone(value).e164;
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid phone number (UAE default, or + / 00 for other countries)",
    });
    return z.NEVER;
  }
});

/** AED / percent amounts travel as decimal strings — never JS floats. */
export const decimalStringSchema = (max: number) =>
  z
    .string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places")
    .refine((v) => Number(v) > 0 && Number(v) <= max, { message: `Must be greater than 0` });

export const totalAmountSchema = decimalStringSchema(10_000_000);
export const commissionPercentSchema = z
  .string()
  .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a percentage with up to 2 decimal places")
  .refine((v) => Number(v) > 0 && Number(v) <= 100, { message: "Percentage must be between 0 and 100" });

export const otpCodeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

// --- Auth (Phase 1) ---
export const requestOtpSchema = z.object({ email: emailSchema });
export const verifyOtpSchema = z.object({ email: emailSchema, code: otpCodeSchema });

// --- Partners (Phase 2) ---
export const createPartnerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: emailSchema,
    phone: phoneSchema,
    companyName: z.string().trim().min(1, "Company name is required").max(160),
    sendWelcomeEmail: z.boolean().optional().default(true),
  })
  .strict();
export const updatePartnerSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    companyName: z.string().trim().min(1).max(160).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// --- Leads (Phases 3–4) ---
// Strict: partnerId (or any other server-owned field) in the body is rejected.
export const createLeadSchema = z
  .object({
    clientName: z.string().trim().min(1, "Client company / name is required").max(160),
    clientPhone: phoneSchema,
    serviceType: z.enum(SERVICE_TYPES),
    requirementNote: z.string().trim().max(500, "Note must be 500 characters or fewer").optional(),
  })
  .strict();

export const partnerLeadQuerySchema = z.object({
  stage: z.enum(LEAD_STAGES).optional(),
  serviceType: z.enum(SERVICE_TYPES).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest", "clientName"]).default("newest"),
});

export const commissionsQuerySchema = z.object({
  status: z.enum(["expected", "payable", "paid"]).optional(),
  partnerId: z.string().trim().max(40).optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM")
    .optional(),
});

export const adminLeadQuerySchema = z.object({
  stage: z.enum(LEAD_STAGES).optional(),
  stageGroup: z.enum(["new", "won", "lost"]).optional(),
  serviceType: z.enum(SERVICE_TYPES).optional(),
  partnerId: z.string().trim().max(40).optional(),
  q: z.string().trim().max(120).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  sort: z.enum(["newest", "oldest", "clientName"]).default("newest"),
});

export const stageTransitionSchema = z
  .object({
    toStage: z.enum(LEAD_STAGES),
    expectedStage: z.enum(LEAD_STAGES),
    totalAmount: totalAmountSchema.optional(),
    commissionPercent: commissionPercentSchema.optional(),
    lostReason: z.enum(LOST_REASONS).optional(),
    lostReasonNote: z.string().trim().max(500).optional(),
  })
  .strict();

export const updateLeadSchema = z
  .object({
    internalNote: z.string().trim().max(2000).nullable().optional(),
    totalAmount: totalAmountSchema.optional(),
    commissionPercent: commissionPercentSchema.optional(),
  })
  .strict();

export const markCommissionPaidSchema = z
  .object({
    paidAt: z.string().date("Enter a valid date"),
    paidRef: z.string().trim().max(120).optional(),
  })
  .strict();

// --- Partner profile (Q8: phone only) ---
export const updateProfileSchema = z.object({ phone: phoneSchema }).strict();

// --- Pagination / filters ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type StageTransitionInput = z.infer<typeof stageTransitionSchema>;

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
