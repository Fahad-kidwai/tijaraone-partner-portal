import { SERVICE_TYPE_LABELS, type SERVICE_TYPES } from "../schemas";
import { waMeDigits } from "../phone";

export interface CeoNewLeadEmailInput {
  appUrl: string;
  leadId: string;
  token: string;
  partnerName: string;
  partnerCompany: string | null;
  clientName: string;
  clientPhone: string;
  serviceType: (typeof SERVICE_TYPES)[number];
}

/** CEO notification for a new referral token (plan §6.5). No internal data. */
export function ceoNewLeadEmail(input: CeoNewLeadEmailInput): { subject: string; html: string; text: string } {
  const service = SERVICE_TYPE_LABELS[input.serviceType];
  const link = `${input.appUrl}/admin/leads/${input.leadId}`;
  const partner = input.partnerCompany ? `${input.partnerName} (${input.partnerCompany})` : input.partnerName;
  const text = [
    `New referral token ${input.token}`,
    `Partner: ${partner}`,
    `Client: ${input.clientName}`,
    `Service: ${service}`,
    `Call: tel:${input.clientPhone}`,
    `WhatsApp: https://wa.me/${waMeDigits(input.clientPhone)}`,
    `Open in portal: ${link}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="color:#011550;font-size:20px">New referral token ${input.token}</h1>
  <p style="color:#475569">Partner: <strong>${input.partnerName}</strong>${input.partnerCompany ? ` (${input.partnerCompany})` : ""}</p>
  <p style="color:#475569">Client: <strong>${input.clientName}</strong><br/>Service: ${service}</p>
  <p>
    <a href="tel:${input.clientPhone}" style="color:#0052FF;font-weight:bold">Call client</a>
    &nbsp;·&nbsp;
    <a href="https://wa.me/${waMeDigits(input.clientPhone)}" style="color:#0052FF;font-weight:bold">WhatsApp</a>
    &nbsp;·&nbsp;
    <a href="${link}" style="color:#0052FF;font-weight:bold">Open lead</a>
  </p>
</div>`;
  return { subject: `New referral token ${input.token} — ${service}`, html, text };
}
