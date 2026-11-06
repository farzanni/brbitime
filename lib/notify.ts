import { SERVICES } from "@/lib/booking";
import { sendBookingSms, sendCancellationSms } from "@/lib/sms";

const SERVICE_NAMES: Record<string, string> = {
  combo: "پکیج کامل (مو + ریش)",
  ...Object.fromEntries(SERVICES.map((service) => [service.id, service.name])),
};

/**
 * Sends booking confirmation SMS to customer and notification to barber.
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

  try {
    await sendBookingSms({
      customerName: input.name,
      customerPhone: input.phone,
      serviceName: serviceTitle,
      date: input.date,
      time: input.time,
    });
  } catch (error) {
    console.error("[Notify] SMS booking dispatch error:", error);
  }
}

export interface CancelNotificationInput {
  service: string;
  date: string;
  time: string;
  name: string;
  phone: string;
}

/**
 * Alerts the barber via SMS when a customer cancels their booking.
 * Never throws — a failed alert must not break the cancellation flow.
 */
export async function notifyCancellation(input: CancelNotificationInput): Promise<void> {
  const serviceTitle = SERVICE_NAMES[input.service] ?? input.service;

  try {
    await sendCancellationSms({
      customerName: input.name,
      customerPhone: input.phone,
      serviceName: serviceTitle,
      date: input.date,
      time: input.time,
    });
  } catch (error) {
    console.error("[Notify] Cancellation SMS dispatch error:", error);
  }
}
