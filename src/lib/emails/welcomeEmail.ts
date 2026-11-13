const SITE_URL = "https://www.tijaraone.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.split(/\s+/)[0];
  return first || trimmed;
}

export function welcomeEmail(
  appUrl: string,
  partnerName: string
): { subject: string; html: string; text: string } {
  const firstName = firstNameOf(partnerName);
  const safeFirst = escapeHtml(firstName);
  return {
    subject: "Welcome to the TijaraOne Partner Network",
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to the TijaraOne Partner Network!",
      "",
      "Your partner account has been successfully created. You can now access the portal to manage your referrals and track your activities.",
      "",
      "Get started here:",
      `Open Partner Portal: ${appUrl}`,
      "",
      "Partner ID: Your registered email address",
      "Verification: One-time password (OTP) – no password required.",
      "",
      "We look forward to a successful partnership!",
      "",
      "Best regards,",
      "Team TijaraOne",
      SITE_URL.replace(/^https:\/\//, ""),
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <p style="color:#475569">Hi ${safeFirst},</p>
  <h1 style="color:#011550;font-size:20px">Welcome to the TijaraOne Partner Network!</h1>
  <p style="color:#475569">Your partner account has been successfully created. You can now access the portal to manage your referrals and track your activities.</p>
  <p style="color:#011550;font-weight:bold">Get started here:</p>
  <p><a href="${appUrl}" style="display:inline-block;background:#0052FF;color:#fff;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:999px">Open Partner Portal</a></p>
  <p style="color:#475569"><strong>Partner ID:</strong> Your registered email address<br/><strong>Verification:</strong> One-time password (OTP) – no password required.</p>
  <p style="color:#475569">We look forward to a successful partnership!</p>
  <p style="color:#475569">Best regards,<br/><strong>Team TijaraOne</strong><br/><a href="${SITE_URL}" style="color:#0052FF">${SITE_URL.replace(/^https:\/\//, "")}</a></p>
</div>`,
  };
}
