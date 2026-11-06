import { SHOP } from "@/lib/shop";
import { formatPersianDate } from "@/lib/booking";

export interface BookingSmsPayload {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
}

export type SmsProvider = "kavenegar" | "farazsms" | "mock";

function getProvider(): SmsProvider {
  const envProvider = (process.env.SMS_PROVIDER ?? "").toLowerCase();
  if (envProvider === "kavenegar" || process.env.KAVENEGAR_API_KEY) return "kavenegar";
  if (envProvider === "farazsms" || process.env.FARAZSMS_API_KEY || process.env.IPPANEL_API_KEY) return "farazsms";
  return "mock";
}

/**
 * Returns barber notification phone numbers.
 * Defaults to 09376802989 (allowed account number) for test/notifications. Supports comma-separated list.
 */
export function getBarberPhones(): string[] {
  const raw = process.env.BARBER_PHONE?.trim() || "09376802989";
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

async function sendKavenegarSms(apiKey: string, receptor: string, message: string, sender?: string) {
  try {
    const params = new URLSearchParams({
      receptor,
      message,
      ...(sender && { sender }),
    });
    const res = await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = (await res.json().catch(() => null)) as {
      return?: { status: number; message: string };
      entries?: Array<{ messageid: number; status: number; statustext: string; receptor: string }>;
    } | null;

    if (!res.ok || (json && json.return && json.return.status !== 200)) {
      console.error(
        `[Kavenegar SMS Error] Status ${json?.return?.status ?? res.status} for ${receptor}:`,
        json?.return?.message ?? "Unknown error"
      );
    } else {
      console.log(`[Kavenegar SMS Success] Sent to ${receptor} (ID: ${json?.entries?.[0]?.messageid})`);
    }
    return json;
  } catch (error) {
    console.error(`[Kavenegar SMS Network Error] Failed to send to ${receptor}:`, error);
  }
}

/**
 * Sends booking confirmation SMS to customer and notification to barber.
 * Never throws — SMS failure must never fail a confirmed booking.
 */
export async function sendBookingSms(payload: BookingSmsPayload): Promise<void> {
  const provider = getProvider();
  const shopName = SHOP.name || "سالن پیرایش";
  const sender = process.env.SMS_SENDER || "2000660110";
  const barberPhones = getBarberPhones();

  const formattedDate = formatPersianDate(payload.date);

  const customerMessage = `سلام ${payload.customerName} عزیز، نوبت شما در ${shopName} برای خدمت ${payload.serviceName} در تاریخ ${formattedDate} ساعت ${payload.time} با موفقیت ثبت شد.`;
  const barberMessage = `نوبت جدید: ${payload.customerName} | ${payload.serviceName} | ${formattedDate} ساعت ${payload.time} | تماس: ${payload.customerPhone}`;

  try {
    if (provider === "kavenegar") {
      const apiKey = process.env.KAVENEGAR_API_KEY ?? "";
      const template = process.env.KAVENEGAR_PATTERN_BOOKING;

      // 1. Send SMS to customer
      if (template) {
        // Fast Verify Lookup API (passes blacklist/DND)
        const params = new URLSearchParams({
          receptor: payload.customerPhone,
          token: payload.customerName.replace(/\s+/g, "."),
          token2: formattedDate.replace(/\s+/g, "."),
          token3: payload.time,
          template: template,
        });
        await fetch(`https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?${params.toString()}`);
      } else {
        await sendKavenegarSms(apiKey, payload.customerPhone, customerMessage, sender);
      }

      // 2. Notify Barber (send to configured barber phone e.g. 09308537418)
      for (const barberPhone of barberPhones) {
        await sendKavenegarSms(apiKey, barberPhone, barberMessage, sender);
      }
    } else if (provider === "farazsms") {
      const apiKey = process.env.FARAZSMS_API_KEY || process.env.IPPANEL_API_KEY || "";
      const patternCode = process.env.FARAZSMS_PATTERN_BOOKING;
      const originPhone = sender || "+983000505";

      if (patternCode) {
        await fetch("https://edge.ippanel.com/api/v1/pattern/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `AccessKey ${apiKey}`,
          },
          body: JSON.stringify({
            pattern_code: patternCode,
            originator: originPhone,
            recipient: payload.customerPhone,
            values: {
              name: payload.customerName,
              service: payload.serviceName,
              date: formattedDate,
              time: payload.time,
            },
          }),
        });
      } else {
        await fetch("https://edge.ippanel.com/api/v1/sms/send/webservice/single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `AccessKey ${apiKey}`,
          },
          body: JSON.stringify({
            recipient: [payload.customerPhone],
            sender: originPhone,
            message: customerMessage,
          }),
        });
      }

      // Notify Barber
      for (const barberPhone of barberPhones) {
        await fetch("https://edge.ippanel.com/api/v1/sms/send/webservice/single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `AccessKey ${apiKey}`,
          },
          body: JSON.stringify({
            recipient: [barberPhone],
            sender: originPhone,
            message: barberMessage,
          }),
        });
      }
    } else {
      console.log(`[SMS MOCK] Customer (${payload.customerPhone}): ${customerMessage}`);
      for (const barberPhone of barberPhones) {
        console.log(`[SMS MOCK] Barber (${barberPhone}): ${barberMessage}`);
      }
    }
  } catch (err) {
    console.error("SMS notification failed:", err);
  }
}

export interface ReminderSmsPayload {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
}

/**
 * Sends a 30-minute appointment reminder SMS to the customer.
 * Never throws — SMS failure must never crash cron or caller.
 */
export async function sendAppointmentReminderSms(payload: ReminderSmsPayload): Promise<boolean> {
  const provider = getProvider();
  const shopName = SHOP.name || "مو کات";
  const sender = process.env.SMS_SENDER || "2000660110";

  const customerMessage = `سلام ${payload.customerName} عزیز،\nیادآوری: نوبت شما در ${shopName} تا حدود ۳۰ دقیقه دیگر (ساعت ${payload.time}) برای خدمت ${payload.serviceName} می‌باشد. منتظر دیدارتان هستیم.`;

  try {
    if (provider === "kavenegar") {
      const apiKey = process.env.KAVENEGAR_API_KEY ?? "";
      const template = process.env.KAVENEGAR_PATTERN_REMINDER;

      if (template) {
        const params = new URLSearchParams({
          receptor: payload.customerPhone,
          token: payload.customerName.replace(/\s+/g, "."),
          token2: payload.time.replace(/\s+/g, "."),
          token3: shopName.replace(/\s+/g, "."),
          template: template,
        });
        await fetch(`https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?${params.toString()}`);
      } else {
        await sendKavenegarSms(apiKey, payload.customerPhone, customerMessage, sender);
      }
      return true;
    } else if (provider === "farazsms") {
      const apiKey = process.env.FARAZSMS_API_KEY || process.env.IPPANEL_API_KEY || "";
      const patternCode = process.env.FARAZSMS_PATTERN_REMINDER;
      const originPhone = sender || "+983000505";

      if (patternCode) {
        await fetch("https://edge.ippanel.com/api/v1/pattern/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `AccessKey ${apiKey}`,
          },
          body: JSON.stringify({
            pattern_code: patternCode,
            originator: originPhone,
            recipient: payload.customerPhone,
            values: {
              name: payload.customerName,
              service: payload.serviceName,
              time: payload.time,
            },
          }),
        });
      } else {
        await fetch("https://edge.ippanel.com/api/v1/sms/send/webservice/single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `AccessKey ${apiKey}`,
          },
          body: JSON.stringify({
            recipient: [payload.customerPhone],
            sender: originPhone,
            message: customerMessage,
          }),
        });
      }
      return true;
    } else {
      console.log(`[SMS MOCK REMINDER] Customer (${payload.customerPhone}): ${customerMessage}`);
      return true;
    }
  } catch (err) {
    console.error(`[SMS Reminder Error] Failed to send reminder to ${payload.customerPhone}:`, err);
    return false;
  }
}

