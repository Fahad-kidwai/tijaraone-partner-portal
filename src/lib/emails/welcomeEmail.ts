export function welcomeEmail(appUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: "Welcome to the TijaraOne Partner Portal",
    text: `Welcome to TijaraOne. You have been added as a referral partner. Sign in at ${appUrl} using this email address — we will email you a one-time 6-digit code, no password is needed.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="color:#011550;font-size:20px">Welcome to TijaraOne</h1>
  <p style="color:#475569">You have been added as a referral partner. Sign in using this email address — we will email you a one-time 6-digit code, no password is needed.</p>
  <p><a href="${appUrl}" style="color:#0052FF;font-weight:bold">Open the Partner Portal</a></p>
</div>`,
  };
}
