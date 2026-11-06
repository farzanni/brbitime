import { SERVICES, formatPersianDate } from "@/lib/booking";
import { sendBookingSms } from "@/lib/sms";

const SERVICE_NAMES: Record<string, string> = {
  combo: "پکیج کامل (مو + ریش)",
  ...Object.fromEntries(SERVICES.map((service) => [service.id, service.name])),
};

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

function normalizeTelegramChatId(chatId: string): string {
  const trimmed = chatId.trim();
  // Telegram Supergroup/Channel IDs are 13 digits starting with -100
  // If an ID starts with a single '-' and has 9-11 digits (e.g. -5514479498), auto-prefix with -100
  if (/^-[0-9]{9,11}$/.test(trimmed)) {
    return `-100${trimmed.slice(1)}`;
  }
  return trimmed;
}

async function sendTelegramMessage(token: string, rawChatId: string, text: string): Promise<void> {
  const primaryChatId = normalizeTelegramChatId(rawChatId);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: primaryChatId,
        text,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return;
    const errorBody = await res.text();
    // Fallback: If Telegram returns 400 'chat not found' and the raw ID had a leading '-',
    // the user may have mistakenly prepended '-' to a private user ID. Try positive user ID.
    if (res.status === 400 && errorBody.includes("chat not found") && rawChatId.startsWith("-")) {
      const fallbackChatId = rawChatId.replace(/^-+/, "").trim();
      const retryRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: fallbackChatId,
          text,
          parse_mode: "HTML",
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (retryRes.ok) return;
    }
    console.error("telegram notification failed for chat:", primaryChatId.slice(0, 5), errorBody);
  } catch (error) {
    console.error("telegram notification network error:", error);
  }
}

/**
 * Sends a booking notification to SMS (customer & barber) and
 * to configured Telegram targets (shop owner, operator, ...).
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
  const serviceTitle = SERVICE_NAMES[input.service] ?? input.service;
  const formattedDate = formatPersianDate(input.date);

  // Send SMS to customer & barber (runs safely in background without throwing)
  const smsPromise = sendBookingSms({
    customerName: input.name,
    customerPhone: input.phone,
    serviceName: serviceTitle,
    date: input.date,
    time: input.time,
  }).catch((error) => {
    console.error("SMS booking dispatch error:", error);
  });

  const targets = getTargets();

  if (targets.length === 0) {
    console.warn("telegram notification skipped: no targets configured");
    await smsPromise;
    return;
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const manageLink = appUrl ? `\nمدیریت: ${appUrl}/admin` : "";

  const text = [
    "🔔 <b>نوبت جدید!</b>",
    "",
    `👤 ${escapeHtml(input.name)}`,
    `📞 <code>${escapeHtml(input.phone)}</code>`,
    `💈 ${escapeHtml(serviceTitle)}`,
    `📅 ${escapeHtml(formattedDate)} — ⏰ ${escapeHtml(input.time)}`,
    manageLink,
  ].join("\n");

  const telegramPromises = targets.map(({ token, chatId }) =>
    sendTelegramMessage(token, chatId, text)
  );

  await Promise.allSettled([smsPromise, ...telegramPromises]);
}

export interface CancelNotificationInput {
  service: string;
  date: string;
  time: string;
  name: string;
  phone: string;
}

export async function notifyCancellation(input: CancelNotificationInput) {
  const targets = getTargets();
  if (targets.length === 0) return;

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const manageLink = appUrl ? `\nمدیریت: ${appUrl}/admin` : "";
  const formattedDate = formatPersianDate(input.date);

  const text = [
    "⚠️ <b>لغو نوبت توسط مشتری!</b>",
    "",
    `👤 ${escapeHtml(input.name)}`,
    `📞 <code>${escapeHtml(input.phone)}</code>`,
    `💈 ${escapeHtml(SERVICE_NAMES[input.service] ?? input.service)}`,
    `📅 ${escapeHtml(formattedDate)} — ⏰ ${escapeHtml(input.time)}`,
    manageLink,
  ].join("\n");

  const telegramPromises = targets.map(({ token, chatId }) =>
    sendTelegramMessage(token, chatId, text)
  );

  await Promise.allSettled(telegramPromises);
}
