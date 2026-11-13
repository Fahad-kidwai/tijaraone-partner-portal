/** Ordered catalog of CEO-selectable services (single source of truth). */
export const SERVICES = [
  { code: "MAINLAND_COMPANY_FORMATION", label: "Mainland Company Formation" },
  { code: "FREEZONE_COMPANY_FORMATION", label: "Freezone Company Formation" },
  { code: "BRANDING_SERVICES", label: "Branding Services" },
  { code: "WEBSITE_DEVELOPMENT", label: "Website Development" },
  { code: "VAT_REGISTRATION", label: "VAT Registration" },
  { code: "VAT_DE_REGISTRATION", label: "VAT De-registration" },
  { code: "VAT_FILING_QUARTERLY", label: "VAT Filing (Quarterly)" },
  { code: "CT_REGISTRATION", label: "CT Registration" },
  { code: "CT_DE_REGISTRATION", label: "CT De-registration" },
  { code: "CT_FILING_YEARLY", label: "CT Filing (Yearly)" },
  { code: "AUDIT_REPORT", label: "Audit Report" },
  { code: "LIQUIDATION_REPORT", label: "Liquidation Report" },
  { code: "ACCOUNTING_AND_BOOKKEEPING", label: "Accounting and Bookkeeping" },
  { code: "TAX_CONSULTANCY", label: "Tax Consultancy" },
  { code: "HR_CONSULTANCY", label: "HR Consultancy" },
  { code: "AI_AND_AUTOMATION", label: "AI and Automation" },
  { code: "BANK_ACCOUNT_OPENING_ASSISTANCE", label: "Bank Account Opening Assistance" },
  { code: "FREELANCE_VISA", label: "Freelance Visa" },
  { code: "RESIDENCE_VISA", label: "Residence Visa" },
  { code: "GOLDEN_VISA", label: "Golden Visa" },
  { code: "BUSINESS_LOAN", label: "Business Loan" },
  { code: "MORTGAGES", label: "Mortgages" },
  { code: "AUTO_LOAN", label: "Auto Loan" },
  { code: "REAL_ESTATE", label: "Real Estate" },
  { code: "OTHERS", label: "Others" },
] as const;

export type ServiceCode = (typeof SERVICES)[number]["code"];

export const SERVICE_CODES = SERVICES.map((s) => s.code) as [ServiceCode, ...ServiceCode[]];

export const SERVICE_LABEL = Object.fromEntries(SERVICES.map((s) => [s.code, s.label])) as Record<
  ServiceCode,
  string
>;

export function serviceLabel(code: string): string {
  return SERVICE_LABEL[code as ServiceCode] ?? code;
}
