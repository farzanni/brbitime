import { SHOP } from "@/lib/shop";

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

async function sendKavenegarSms(apiKey: string, receptor: string, message: string, sender?: string) {
  const params = new URLSearchParams({
    receptor,
    message,
    ...(sender && { sender }),
  });
  return fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

/**
 * Sends booking confirmation SMS to customer and notification to barber.
 * Never throws — SMS failure must never fail a confirmed booking.
 */
export async function sendBookingSms(payload: BookingSmsPayload): Promise<void> {
  const provider = getProvider();
  const shopName = SHOP.name || "سالن پیرایش";
  const sender = process.env.SMS_SENDER;

  const customerMessage = `سلام ${payload.customerName} عزیز، نوبت شما در ${shopName} برای خدمت ${payload.serviceName} در تاریخ ${payload.date} ساعت ${payload.time} با موفقیت ثبت شد.`;
  const barberMessage = `نوبت جدید: ${payload.customerName} | ${payload.serviceName} | ${payload.date} ساعت ${payload.time} | تماس: ${payload.customerPhone}`;

  try {
    if (provider === "kavenegar") {
      const apiKey = process.env.KAVENEGAR_API_KEY ?? "";
      const template = process.env.KAVENEGAR_PATTERN_BOOKING;

      if (template) {
        // Fast Verify Lookup API (passes blacklist/DND)
        const params = new URLSearchParams({
          receptor: payload.customerPhone,
          token: payload.customerName.replace(/\s+/g, "."),
          token2: payload.date,
          token3: payload.time,
          template: template,
        });
        await fetch(`https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?${params.toString()}`);
      } else {
        await sendKavenegarSms(apiKey, payload.customerPhone, customerMessage, sender);
      }

      // Notify Barber
      if (SHOP.phone && SHOP.phone !== payload.customerPhone) {
        await sendKavenegarSms(apiKey, SHOP.phone, barberMessage, sender);
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
              date: payload.date,
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
    } else {
      console.log(`[SMS MOCK] Customer (${payload.customerPhone}): ${customerMessage}`);
      if (SHOP.phone) {
        console.log(`[SMS MOCK] Barber (${SHOP.phone}): ${barberMessage}`);
      }
    }
  } catch (err) {
    console.error("SMS notification failed:", err);
  }
}
