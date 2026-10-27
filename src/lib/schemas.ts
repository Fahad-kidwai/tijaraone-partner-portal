import { z } from "zod";
import { parsePhone } from "./phone";
import { DEFAULT_COMMISSION_PERCENT } from "./leads/commission";

/**
 * Single source of truth for every input shape (client + server).
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

export const LEAD_STAGES = ["ADVANCE_RECEIVED", "IN_PROGRESS", "COMPLETED"] as const;
export const LEAD_STAGE_LABELS: Record<(typeof LEAD_STAGES)[number], string> = {
  ADVANCE_RECEIVED: "Advance Received",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};
export const COMMISSION_STATUSES = ["EXPECTED", "PAYABLE", "PAID"] as const;

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

// --- Auth ---
export const requestOtpSchema = z.object({ email: emailSchema });
export const verifyOtpSchema = z.object({ email: emailSchema, code: otpCodeSchema });

// --- Partners ---
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

// --- Tokens / Leads (CEO create; partners are read-only) ---
export const createLeadSchema = z
  .object({
    partnerId: z.string().trim().min(1).max(40),
    clientName: z.string().trim().min(1, "Client name is required").max(120),
    serviceType: z.enum(SERVICE_TYPES),
    totalAmount: totalAmountSchema,
    commissionPercent: commissionPercentSchema.optional(),
    stage: z.enum(LEAD_STAGES).optional().default("ADVANCE_RECEIVED"),
    internalNote: z.string().trim().max(2000).optional(),
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
  serviceType: z.enum(SERVICE_TYPES).optional(),
  partnerId: z.string().trim().max(40).optional(),
  q: z.string().trim().max(120).optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM")
    .optional(),
  sort: z.enum(["newest", "oldest", "clientName"]).default("newest"),
});

/** Merged stage + field edit. Client-sent commissionAmount/commissionStatus rejected. */
export const updateLeadSchema = z
  .object({
    toStage: z.enum(LEAD_STAGES).optional(),
    expectedStage: z.enum(LEAD_STAGES).optional(),
    clientName: z.string().trim().min(1).max(120).optional(),
    serviceType: z.enum(SERVICE_TYPES).optional(),
    totalAmount: totalAmountSchema.optional(),
    commissionPercent: commissionPercentSchema.optional(),
    internalNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.toStage !== undefined && val.expectedStage === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "expectedStage is required when changing stage", path: ["expectedStage"] });
    }
  });

export const markCommissionPaidSchema = z
  .object({
    paidAt: z.string().date("Enter a valid date"),
    paidRef: z.string().trim().max(120).optional(),
  })
  .strict();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
