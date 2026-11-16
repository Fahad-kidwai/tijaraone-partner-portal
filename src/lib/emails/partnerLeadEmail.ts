import { formatAed } from "../leads/commission";
import { LEAD_STAGE_LABELS, type LEAD_STAGES } from "../schemas";
import { serviceLabel } from "../services";

export type PartnerLeadEmailKind = "CREATED" | "COMPLETED" | "PAID";

export interface PartnerLeadEmailInput {
  appUrl: string;
  leadId: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  stage: (typeof LEAD_STAGES)[number];
  kind: PartnerLeadEmailKind;
  commissionAmount: string;
  commissionPercent: string;
  paidAt?: string | null;
}

/** Partner-only notifications: client created, first COMPLETED, commission PAID. */
export function partnerLeadEmail(input: PartnerLeadEmailInput): { subject: string; html: string; text: string } {
  const link = `${input.appUrl}/dashboard/clients/${input.leadId}`;
  const service = serviceLabel(input.serviceType);
  const phase = LEAD_STAGE_LABELS[input.stage];
  const commission = `${formatAed(input.commissionAmount)} (${input.commissionPercent}%)`;

  let headline: string;
  let subject: string;
  if (input.kind === "CREATED") {
    headline = `New client ${input.clientId} registered for your referral`;
    subject = `New client ${input.clientId}`;
  } else if (input.kind === "COMPLETED") {
    headline = `Client ${input.clientId} completed — commission is payable`;
    subject = `Client ${input.clientId}: Completed`;
  } else {
    headline = `Commission paid for ${input.clientId}`;
    subject = `Client ${input.clientId}: Commission paid`;
  }

  const lines = [
    headline,
    `Client: ${input.clientName}`,
    `Service: ${service}`,
    `Phase: ${phase}`,
    `Commission: ${commission}${input.kind === "PAID" && input.paidAt ? ` · Paid on ${input.paidAt}` : ""}`,
    `View client: ${link}`,
  ];
  const text = lines.join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="color:#011550;font-size:20px">${headline}</h1>
  <p style="color:#475569">Client: <strong>${input.clientName}</strong><br/>Service: ${service}<br/>Phase: ${phase}</p>
  <p style="color:#475569">Commission: ${commission}${input.kind === "PAID" && input.paidAt ? ` · Paid on ${input.paidAt}` : ""}</p>
  <p><a href="${link}" style="color:#0052FF;font-weight:bold">View your client</a></p>
</div>`;
  return { subject, html, text };
}
