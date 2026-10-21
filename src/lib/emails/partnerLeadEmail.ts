import { formatAed } from "../leads/commission";

export type PartnerLeadEmailKind = "ADVANCE_TAKEN" | "CLOSED" | "PAID";

const PLAIN_WORDS: Record<PartnerLeadEmailKind, string> = {
  ADVANCE_TAKEN: "Advance taken — work has started on your client's case",
  CLOSED: "Client closed — your commission is now payable",
  PAID: "Commission paid",
};

export interface PartnerLeadEmailInput {
  appUrl: string;
  leadId: string;
  token: string;
  clientName: string;
  kind: PartnerLeadEmailKind;
  commissionAmount?: string | null;
  commissionPercent?: string | null;
  paidAt?: string | null;
}

/**
 * Partner notification (plan §6.5): Advance Taken / Closed / Paid ONLY.
 * Contains token, client name, plain-words stage and commission figures.
 * NEVER internal notes, lost reasons, or totalAmount (Q7a).
 */
export function partnerLeadEmail(input: PartnerLeadEmailInput): { subject: string; html: string; text: string } {
  const link = `${input.appUrl}/dashboard/tokens/${input.leadId}`;
  const words = PLAIN_WORDS[input.kind];
  const commission =
    input.commissionAmount != null
      ? `Commission: ${formatAed(input.commissionAmount)}${input.commissionPercent != null ? ` (${input.commissionPercent}%)` : ""}${input.kind === "PAID" && input.paidAt ? ` · Paid on ${input.paidAt}` : ""}`
      : null;
  const text = [
    `Update on your referral ${input.token} (${input.clientName})`,
    words,
    ...(commission ? [commission] : []),
    `View token: ${link}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="color:#011550;font-size:20px">Referral update: ${input.token}</h1>
  <p style="color:#475569">Client: <strong>${input.clientName}</strong></p>
  <p style="color:#475569">${words}</p>
  ${commission ? `<p style="color:#475569">${commission}</p>` : ""}
  <p><a href="${link}" style="color:#0052FF;font-weight:bold">View your token</a></p>
</div>`;
  return { subject: `Referral ${input.token}: ${words.split(" — ")[0]}`, html, text };
}
