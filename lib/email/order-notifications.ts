import { Resend } from "resend";
import { logger } from "@/lib/logger";

const RESEND_PLACEHOLDER_KEY = "re_xxxxxxxxx";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";
const DEFAULT_ADMIN_EMAIL = "piyushnegi.bca2022@imsuc.ac.in";
const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

interface NewOrderEmailItem {
  title: string;
  quantity: number;
  size: string;
  price: number;
  image?: string;
  productUrl?: string;
}

interface SendNewOrderEmailsInput {
  orderId: string;
  userEmail: string;
  userName?: string;
  items: NewOrderEmailItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

interface SendOrderStatusUpdateEmailInput {
  orderId: string;
  userEmail: string;
  userName?: string;
  previousStatus?: OrderStatus;
  nextStatus: OrderStatus;
}

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatStatus(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://yugantar.studio";
}

function buildItemsHtml(items: NewOrderEmailItem[]): string {
  return items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      const safeTitle = escapeHtml(item.title);
      const safeSize = escapeHtml(item.size);
      const safeImage = item.image ? escapeHtml(item.image) : "";
      const safeProductUrl = item.productUrl ? escapeHtml(item.productUrl) : "";

      return `<tr>
  <td style="padding:12px;border-bottom:1px solid #e5e7eb;width:72px;vertical-align:top;">
    ${
      safeImage
        ? `<img src="${safeImage}" alt="${safeTitle}" width="56" height="56" style="display:block;border-radius:8px;object-fit:cover;" />`
        : ""
    }
  </td>
  <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
    <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">${safeTitle}</p>
    <p style="margin:0;color:#6b7280;font-size:12px;">Size: ${safeSize} • Qty: ${item.quantity}</p>
    ${
      safeProductUrl
        ? `<p style="margin:8px 0 0;"><a href="${safeProductUrl}" style="color:#2563eb;font-size:12px;text-decoration:none;">View product</a></p>`
        : ""
    }
  </td>
  <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;font-size:14px;font-weight:600;color:#111827;">
    ${formatCurrency(lineTotal)}
  </td>
</tr>`;
    })
    .join("");
}

function buildEmailLayout({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:24px;background:linear-gradient(135deg,#111827,#374151);color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.8;">Yugantar</p>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">${safeTitle}</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:.9;">${safeSubtitle}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">${body}</td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#6b7280;font-size:12px;">Need help? Contact <a href="mailto:support@yugantar.studio" style="color:#2563eb;text-decoration:none;">support@yugantar.studio</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendNewOrderEmails({
  orderId,
  userEmail,
  userName,
  items,
  subtotal,
  shipping,
  total,
}: SendNewOrderEmailsInput): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    return;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const adminEmail = process.env.ORDER_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

  const safeOrderId = escapeHtml(orderId);
  const safeUserName = escapeHtml((userName || "there").trim() || "there");
  const safeUserEmail = escapeHtml(userEmail);
  const itemListHtml = buildItemsHtml(items);
  const orderTrackingUrl = `${getBaseUrl()}/orders`;

  const userBody = `<p style="margin:0 0 12px;font-size:14px;color:#374151;">Hi ${safeUserName}, your order <strong>${safeOrderId}</strong> is placed successfully.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:12px 0;">
  <tr>
    <td style="padding:12px 12px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;">Order items</p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 12px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemListHtml}</table>
    </td>
  </tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;">
  <tr><td style="padding:4px 0;color:#374151;font-size:14px;">Subtotal</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#111827;">${formatCurrency(
    subtotal
  )}</td></tr>
  <tr><td style="padding:4px 0;color:#374151;font-size:14px;">Shipping</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#111827;">${formatCurrency(
    shipping
  )}</td></tr>
  <tr><td style="padding:8px 0 0;font-size:16px;font-weight:700;color:#111827;">Total</td><td style="padding:8px 0 0;text-align:right;font-size:16px;font-weight:700;color:#111827;">${formatCurrency(
    total
  )}</td></tr>
</table>
<p style="margin:18px 0 0;"><a href="${escapeHtml(
    orderTrackingUrl
  )}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Track your order</a></p>`;

  const adminBody = `<p style="margin:0 0 12px;font-size:14px;color:#374151;">New order received.</p>
<p style="margin:0 0 8px;font-size:14px;color:#111827;"><strong>Order ID:</strong> ${safeOrderId}</p>
<p style="margin:0 0 14px;font-size:14px;color:#111827;"><strong>Customer:</strong> ${safeUserName} (${safeUserEmail})</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:12px 0;">
  <tr>
    <td style="padding:0 12px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemListHtml}</table>
    </td>
  </tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;">
  <tr><td style="padding:4px 0;color:#374151;font-size:14px;">Subtotal</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#111827;">${formatCurrency(
    subtotal
  )}</td></tr>
  <tr><td style="padding:4px 0;color:#374151;font-size:14px;">Shipping</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#111827;">${formatCurrency(
    shipping
  )}</td></tr>
  <tr><td style="padding:8px 0 0;font-size:16px;font-weight:700;color:#111827;">Total</td><td style="padding:8px 0 0;text-align:right;font-size:16px;font-weight:700;color:#111827;">${formatCurrency(
    total
  )}</td></tr>
</table>`;

  const userHtml = buildEmailLayout({
    title: "Order Confirmed",
    subtitle: `Order ${orderId} is now in progress`,
    body: userBody,
  });

  const adminHtml = buildEmailLayout({
    title: "New Order Alert",
    subtitle: `Order ${orderId} needs processing`,
    body: adminBody,
  });

  const emailsToSend: Promise<unknown>[] = [];

  if (userEmail) {
    emailsToSend.push(
      resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: `Order placed: ${orderId}`,
        html: userHtml,
      })
    );
  }

  if (adminEmail) {
    emailsToSend.push(
      resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `New order received: ${orderId}`,
        html: adminHtml,
      })
    );
  }

  if (emailsToSend.length === 0) {
    return;
  }

  await Promise.all(emailsToSend);
}

export async function sendOrderStatusUpdateEmail({
  orderId,
  userEmail,
  userName,
  previousStatus,
  nextStatus,
}: SendOrderStatusUpdateEmailInput): Promise<void> {
  const resend = getResendClient();
  if (!resend || !userEmail) {
    return;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const safeOrderId = escapeHtml(orderId);
  const safeUserName = escapeHtml((userName || "there").trim() || "there");
  const formattedNextStatus = formatStatus(nextStatus);
  const formattedPreviousStatus = previousStatus
    ? formatStatus(previousStatus)
    : null;

  const ordersUrl = `${getBaseUrl()}/orders`;

  const body = `<p style="margin:0 0 12px;font-size:14px;color:#374151;">Hi ${safeUserName}, your order update is here.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="padding:14px 16px;background:#f9fafb;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Order ID</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${safeOrderId}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Current status</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#059669;">${escapeHtml(
        formattedNextStatus
      )}</p>
      ${
        formattedPreviousStatus
          ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Previous status: ${escapeHtml(
              formattedPreviousStatus
            )}</p>`
          : ""
      }
    </td>
  </tr>
</table>
<p style="margin:18px 0 0;"><a href="${escapeHtml(
    ordersUrl
  )}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View order details</a></p>`;

  const html = buildEmailLayout({
    title: "Order Status Updated",
    subtitle: `Order ${orderId} is now ${formattedNextStatus}`,
    body,
  });

  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: `Order ${orderId} status: ${formattedNextStatus}`,
    html,
  });
}
