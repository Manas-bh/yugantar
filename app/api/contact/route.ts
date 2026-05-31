import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

const RESEND_PLACEHOLDER_KEY = "re_xxxxxxxxx";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();

    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === RESEND_PLACEHOLDER_KEY) {
      return NextResponse.json(
        { success: false, error: "Email service is not configured" },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const adminEmail = "admin@yugantar.studio";

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `New contact form submission: ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
          <h2 style="margin-bottom:16px;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap;">${message}</p>
          <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;" />
          <p style="font-size:12px;color:#6b7280;">Sent from yugantar.studio contact form</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error sending contact form email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
