import { SERVICES } from "@/lib/booking";

const SERVICE_NAMES: Record<string, string> = Object.fromEntries(
  SERVICES.map((service) => [service.id, service.name]),
);

type Target = { token: string; chatId: string };

/**
 * Notification targets. Preferred form (supports many shops / owners):
 *   TELEGRAM_TARGETS="BOT_TOKEN:CHAT_ID,BOT_TOKEN:CHAT_ID"
 *
 * Falls back to the classic single-shop pair:
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 */
function getTargets(): Target[] {
  const raw = process.env.TELEGRAM_TARGETS ?? "";

  const parsed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex === -1) return null;
      const token = entry.slice(0, separatorIndex).trim();
      const chatId = entry.slice(separatorIndex + 1).trim();
      return token && chatId ? { token, chatId } : null;
    })
    .filter((target): target is Target => target !== null);

  if (parsed.length > 0) return parsed;

  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";
  return token && chatId ? [{ token, chatId }] : [];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Sends a booking notification to every configured Telegram target
 * (shop owner, operator, ...).
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
  const targets = getTargets();

  if (targets.length === 0) {
    console.warn("telegram notification skipped: no targets configured");
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

  await Promise.allSettled(
    targets.map(async ({ token, chatId }) => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: "HTML",
            }),
            signal: AbortSignal.timeout(8000),
          },
        );

        if (!response.ok) {
          console.error(
            "telegram notification failed:",
            chatId.slice(0, 4),
            await response.text(),
          );
        }
      } catch (error) {
        console.error("telegram notification error:", error);
      }
    }),
  );
}
