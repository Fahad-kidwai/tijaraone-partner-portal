import { formatAed } from "../leads/commission";
import { LEAD_STAGE_LABELS, SERVICE_TYPE_LABELS, type LEAD_STAGES, type SERVICE_TYPES } from "../schemas";

export type PartnerLeadEmailKind = "CREATED" | "COMPLETED" | "PAID";

export interface PartnerLeadEmailInput {
  appUrl: string;
  leadId: string;
  token: string;
  clientName: string;
  serviceType: (typeof SERVICE_TYPES)[number];
  stage: (typeof LEAD_STAGES)[number];
  kind: PartnerLeadEmailKind;
  commissionAmount: string;
  commissionPercent: string;
  paidAt?: string | null;
}

/** Partner-only notifications: token created, first COMPLETED, commission PAID. */
export function partnerLeadEmail(input: PartnerLeadEmailInput): { subject: string; html: string; text: string } {
  const link = `${input.appUrl}/dashboard/tokens/${input.leadId}`;
  const service = SERVICE_TYPE_LABELS[input.serviceType];
  const phase = LEAD_STAGE_LABELS[input.stage];
  const commission = `${formatAed(input.commissionAmount)} (${input.commissionPercent}%)`;

  let headline: string;
  let subject: string;
  if (input.kind === "CREATED") {
    headline = `New token ${input.token} registered for your referral`;
    subject = `New token ${input.token}`;
  } else if (input.kind === "COMPLETED") {
    headline = `Token ${input.token} completed — commission is payable`;
    subject = `Token ${input.token}: Completed`;
  } else {
    headline = `Commission paid for ${input.token}`;
    subject = `Token ${input.token}: Commission paid`;
  }

  const lines = [
    headline,
    `Client: ${input.clientName}`,
    `Service: ${service}`,
    `Phase: ${phase}`,
    `Commission: ${commission}${input.kind === "PAID" && input.paidAt ? ` · Paid on ${input.paidAt}` : ""}`,
    `View token: ${link}`,
  ];
  const text = lines.join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="color:#011550;font-size:20px">${headline}</h1>
  <p style="color:#475569">Client: <strong>${input.clientName}</strong><br/>Service: ${service}<br/>Phase: ${phase}</p>
  <p style="color:#475569">Commission: ${commission}${input.kind === "PAID" && input.paidAt ? ` · Paid on ${input.paidAt}` : ""}</p>
  <p><a href="${link}" style="color:#0052FF;font-weight:bold">View your token</a></p>
</div>`;
  return { subject, html, text };
}
