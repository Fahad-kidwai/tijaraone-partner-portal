/** Ordered catalog of CEO-selectable services (single source of truth). */
export const SERVICES = [
  { code: "MAINLAND_COMPANY_FORMATION", label: "Mainland Company Formation", abbr: "MC" },
  { code: "FREEZONE_COMPANY_FORMATION", label: "Freezone Company Formation", abbr: "FC" },
  { code: "BRANDING_SERVICES", label: "Branding Services", abbr: "BS" },
  { code: "WEBSITE_DEVELOPMENT", label: "Website Development", abbr: "WD" },
  { code: "VAT_REGISTRATION", label: "VAT Registration", abbr: "VR" },
  { code: "VAT_DE_REGISTRATION", label: "VAT De-registration", abbr: "VD" },
  { code: "VAT_FILING_QUARTERLY", label: "VAT Filing (Quarterly)", abbr: "VF" },
  { code: "CT_REGISTRATION", label: "CT Registration", abbr: "CR" },
  { code: "CT_DE_REGISTRATION", label: "CT De-registration", abbr: "CD" },
  { code: "CT_FILING_YEARLY", label: "CT Filing (Yearly)", abbr: "CY" },
  { code: "AUDIT_REPORT", label: "Audit Report", abbr: "AR" },
  { code: "LIQUIDATION_REPORT", label: "Liquidation Report", abbr: "LR" },
  { code: "ACCOUNTING_AND_BOOKKEEPING", label: "Accounting and Bookkeeping", abbr: "AB" },
  { code: "TAX_CONSULTANCY", label: "Tax Consultancy", abbr: "TC" },
  { code: "HR_CONSULTANCY", label: "HR Consultancy", abbr: "HR" },
  { code: "AI_AND_AUTOMATION", label: "AI and Automation", abbr: "AI" },
  { code: "BANK_ACCOUNT_OPENING_ASSISTANCE", label: "Bank Account Opening Assistance", abbr: "BA" },
  { code: "FREELANCE_VISA", label: "Freelance Visa", abbr: "FV" },
  { code: "RESIDENCE_VISA", label: "Residence Visa", abbr: "RV" },
  { code: "GOLDEN_VISA", label: "Golden Visa", abbr: "GV" },
  { code: "BUSINESS_LOAN", label: "Business Loan", abbr: "BL" },
  { code: "MORTGAGES", label: "Mortgages", abbr: "MG" },
  { code: "AUTO_LOAN", label: "Auto Loan", abbr: "AL" },
  { code: "REAL_ESTATE", label: "Real Estate", abbr: "RE" },
  { code: "OTHERS", label: "Others", abbr: "OT" },
] as const;

export type ServiceCode = (typeof SERVICES)[number]["code"];
export type ServiceAbbr = (typeof SERVICES)[number]["abbr"];

export const SERVICE_CODES = SERVICES.map((s) => s.code) as [ServiceCode, ...ServiceCode[]];

export const SERVICE_LABEL = Object.fromEntries(SERVICES.map((s) => [s.code, s.label])) as Record<
  ServiceCode,
  string
>;

export const SERVICE_ABBR = Object.fromEntries(SERVICES.map((s) => [s.code, s.abbr])) as Record<
  ServiceCode,
  ServiceAbbr
>;

export function serviceLabel(code: string): string {
  return SERVICE_LABEL[code as ServiceCode] ?? code;
}

export function serviceAbbr(code: string): ServiceAbbr | null {
  return SERVICE_ABBR[code as ServiceCode] ?? null;
}
