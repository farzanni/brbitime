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

/**
 * Send booking confirmation SMS to the customer and alert SMS to the barber.
 * Never throws — SMS failure must never break user booking.
 */
export async function sendBookingSms(payload: BookingSmsPayload): Promise<void> {
  const provider = getProvider();
  const shopName = SHOP.name || "سالن پیرایش";

  const customerMessage = `سلام ${payload.customerName} عزیز، نوبت شما در ${shopName} برای خدمت ${payload.serviceName} در تاریخ ${payload.date} ساعت ${payload.time} با موفقیت ثبت شد.`;
  const barberMessage = `نوبت جدید: ${payload.customerName} | ${payload.serviceName} | ${payload.date} ساعت ${payload.time} | تماس: ${payload.customerPhone}`;

  try {
    if (provider === "kavenegar") {
      const apiKey = process.env.KAVENEGAR_API_KEY ?? "";
      const template = process.env.KAVENEGAR_PATTERN_BOOKING;

      if (template) {
        // Fast Verify Lookup API (passes through blacklisted DND numbers)
        const params = new URLSearchParams({
          receptor: payload.customerPhone,
          token: payload.customerName.replace(/\s+/g, "."),
          token2: payload.date,
          token3: payload.time,
          template: template,
        });
        await fetch(`https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?${params.toString()}`);
      } else {
        // Standard SMS API
        const params = new URLSearchParams({
          receptor: payload.customerPhone,
          message: customerMessage,
          ...(process.env.SMS_SENDER && { sender: process.env.SMS_SENDER }),
        });
        await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
      }

      // Notify Barber Phone if configured
      if (SHOP.phone && SHOP.phone !== payload.customerPhone) {
        const barberParams = new URLSearchParams({
          receptor: SHOP.phone,
          message: barberMessage,
          ...(process.env.SMS_SENDER && { sender: process.env.SMS_SENDER }),
        });
        await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: barberParams.toString(),
        });
      }
    } else if (provider === "farazsms") {
      const apiKey = process.env.FARAZSMS_API_KEY || process.env.IPPANEL_API_KEY || "";
      const patternCode = process.env.FARAZSMS_PATTERN_BOOKING;
      const originPhone = process.env.SMS_SENDER || "+983000505";

      if (patternCode) {
        // Pattern API (passes blacklist)
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
        // Simple FarazSMS / IPPanel Send
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
      // Mock / Dev mode fallback (no API key configured)
      console.log("-----------------------------------------");
      console.log(`[SMS DEV MOCK] To Customer (${payload.customerPhone}):`);
      console.log(customerMessage);
      if (SHOP.phone) {
        console.log(`[SMS DEV MOCK] To Barber (${SHOP.phone}):`);
        console.log(barberMessage);
      }
      console.log("-----------------------------------------");
    }
  } catch (err) {
    console.error("SMS notification failed:", err);
  }
}
