export function otpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: "Your TijaraOne sign-in code",
    text: `Your TijaraOne sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="color:#011550;font-size:20px">Your TijaraOne sign-in code</h1>
  <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0052FF">${code}</p>
  <p style="color:#475569">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</div>`,
  };
}
