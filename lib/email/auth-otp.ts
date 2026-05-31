import { Resend } from "resend";
import { logger } from "@/lib/logger";

const RESEND_PLACEHOLDER_KEY = "re_xxxxxxxxx";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY || RESEND_PLACEHOLDER_KEY;

  if (!apiKey || apiKey === RESEND_PLACEHOLDER_KEY) {
    logger.warn(
      "Resend email skipped: replace RESEND_API_KEY placeholder re_xxxxxxxxx"
    );
    return null;
  }

  return new Resend(apiKey);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendSignupOtpEmail(input: {
  email: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email service is not configured");
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const safeName = escapeHtml(input.name || "there");
  const safeOtp = escapeHtml(input.otp);

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your email</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:24px;background:linear-gradient(135deg,#111827,#374151);color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.8;">Yugantar</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">Verify your email</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 12px;font-size:14px;color:#374151;">Hi ${safeName}, use this OTP to complete your signup:</p>
          <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">${safeOtp}</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">This code expires in ${input.expiresInMinutes} minutes. If you did not request this, you can ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await resend.emails.send({
    from: fromEmail,
    to: input.email,
    subject: "Your Yugantar OTP for signup",
    html,
  });
}
