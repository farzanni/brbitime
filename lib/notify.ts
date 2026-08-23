import { SERVICES } from "@/lib/booking";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

const SERVICE_NAMES: Record<string, string> = Object.fromEntries(
  SERVICES.map((service) => [service.id, service.name]),
);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Sends a booking notification to the shop owner's Telegram.
 * Never throws — a failed notification must not fail a confirmed booking.
 */
export async function notifyBooking(input: {
  publicId: string;
  service: string;
  date: string;
  time: string;
  name: string;
  phone: string;
}): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("telegram notification skipped: credentials not configured");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const manageLink = appUrl ? `\nمدیریت: ${appUrl}/admin` : "";

  const text = [
    "🔔 <b>نوبت جدید!</b>",
    "",
    `👤 ${escapeHtml(input.name)}`,
    `📞 <code>${escapeHtml(input.phone)}</code>`,
    `💈 ${escapeHtml(SERVICE_NAMES[input.service] ?? input.service)}`,
    `📅 ${escapeHtml(input.date)} — ⏰ ${escapeHtml(input.time)}`,
    manageLink,
  ].join("\n");

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      console.error("telegram notification failed:", await response.text());
    }
  } catch (error) {
    console.error("telegram notification error:", error);
  }
}
