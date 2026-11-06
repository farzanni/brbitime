import { getSql } from "@/lib/db";
import { getIranDateTime, normalizeDigits, getServiceName } from "@/lib/booking";
import { sendAppointmentReminderSms } from "@/lib/sms";

export interface AppointmentRecord {
  id: number;
  service: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  phone: string;
  created_at: string | Date;
  status: string;
  reminder_sent_at?: string | Date | null;
}

export type ReminderEvaluationStatus = "due" | "too_early" | "past" | "recently_booked";

export interface ReminderEvaluation {
  eligible: boolean;
  status: ReminderEvaluationStatus;
  minutesUntil: number;
}

/**
 * Computes exact epoch timestamp in ms for an appointment scheduled in Asia/Tehran timezone.
 * Handles Persian digits (e.g. "۱۶:۰۰", "۰۹:۴۰") and ASCII digits (e.g. "16:00").
 * Note: Iran time is permanently UTC+03:30 (standard time all year since DST abolition).
 */
export function getAppointmentTimestampMs(dateInput: string | Date, timeStr: string): number {
  const normTime = normalizeDigits(timeStr).trim();
  const [hStr, mStr] = normTime.split(":");
  const h = (hStr || "0").padStart(2, "0");
  const m = (mStr || "0").padStart(2, "0");

  let dateStr = "";
  if (dateInput instanceof Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateInput);
    dateStr = parts; // "YYYY-MM-DD"
  } else {
    dateStr = String(dateInput).split("T")[0].trim();
  }

  const iso = `${dateStr}T${h}:${m}:00+03:30`;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Date.now() : time;
}

/**
 * Evaluates whether an appointment should receive a 30-minute reminder right now.
 *
 * Rules:
 * - Window: Between 0 and 35 minutes before the appointment start time.
 * - If minutesUntil < 0: The appointment has started or passed -> "past".
 * - If minutesUntil > 35: Too early for the 30-min reminder -> "too_early".
 * - If booked in the last 15 minutes: The customer just received their confirmation SMS
 *   seconds/minutes ago; don't send an immediate duplicate -> "recently_booked".
 * - Otherwise: "due" for reminder SMS.
 */
export function evaluateAppointmentReminder(
  appt: {
    appointment_date: string | Date;
    appointment_time: string;
    created_at: string | Date;
  },
  now: Date = new Date()
): ReminderEvaluation {
  const apptMs = getAppointmentTimestampMs(appt.appointment_date, appt.appointment_time);
  const nowMs = now.getTime();
  const diffMinutes = (apptMs - nowMs) / (60 * 1000);

  if (diffMinutes < 0) {
    return { eligible: false, status: "past", minutesUntil: Math.round(diffMinutes) };
  }

  if (diffMinutes > 35) {
    return { eligible: false, status: "too_early", minutesUntil: Math.round(diffMinutes) };
  }

  // Inside the [0, 35] minute window. Check if booking was created recently (< 15 min ago)
  const createdAtMs = new Date(appt.created_at).getTime();
  const minutesSinceCreated = (nowMs - createdAtMs) / (60 * 1000);
  if (minutesSinceCreated < 15) {
    return { eligible: false, status: "recently_booked", minutesUntil: Math.round(diffMinutes) };
  }

  return { eligible: true, status: "due", minutesUntil: Math.round(diffMinutes) };
}

export interface ReminderResultDetail {
  id: number;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  service: string;
  action: "sent" | "skipped_recently_booked" | "skipped_past";
  minutesUntil?: number;
}

export interface ReminderRunResult {
  checkedAt: string;
  iranDate: string;
  candidatesCount: number;
  sentCount: number;
  skippedCount: number;
  details: ReminderResultDetail[];
}

let reminderInfraEnsured = false;

/**
 * Ensures reminder_sent_at column and partial index exist in PostgreSQL.
 * Safe, idempotent, fast.
 */
export async function ensureReminderInfrastructure(): Promise<void> {
  if (reminderInfraEnsured) return;

  const sql = getSql();
  try {
    await sql`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_appointments_reminder
      ON appointments (appointment_date, status)
      WHERE reminder_sent_at IS NULL AND status = 'booked'
    `;
    reminderInfraEnsured = true;
  } catch (error) {
    console.error("[Reminders] Infrastructure setup warning:", error);
  }
}

/**
 * Finds all appointments due for their 30-minute reminder and dispatches SMS.
 * Uses atomic updates (RETURNING id) so concurrent invocations never double-send.
 */
export async function dispatchUpcomingReminders(referenceDate: Date = new Date()): Promise<ReminderRunResult> {
  await ensureReminderInfrastructure();

  const iranNow = getIranDateTime(referenceDate);
  const todayStr = iranNow.date;

  // Also query tomorrow in case of midnight transitions
  const tomorrow = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = getIranDateTime(tomorrow).date;

  const sql = getSql();

  const rows = (await sql`
    SELECT
      id,
      service,
      appointment_date::text AS appointment_date,
      appointment_time,
      customer_name,
      phone,
      created_at,
      status,
      reminder_sent_at
    FROM appointments
    WHERE appointment_date IN (${todayStr}, ${tomorrowStr})
      AND status = 'booked'
      AND reminder_sent_at IS NULL
    ORDER BY appointment_date ASC, appointment_time ASC
  `) as AppointmentRecord[];

  const details: ReminderResultDetail[] = [];
  let sentCount = 0;
  let skippedCount = 0;
  const skippedIds: number[] = [];

  for (const appt of rows) {
    const evaluation = evaluateAppointmentReminder(appt, referenceDate);

    if (evaluation.status === "past" || evaluation.status === "recently_booked") {
      skippedIds.push(appt.id);
      skippedCount++;
      details.push({
        id: appt.id,
        customerName: appt.customer_name,
        phone: appt.phone,
        date: appt.appointment_date,
        time: appt.appointment_time,
        service: getServiceName(appt.service),
        action: evaluation.status === "past" ? "skipped_past" : "skipped_recently_booked",
        minutesUntil: evaluation.minutesUntil,
      });
    } else if (evaluation.status === "due") {
      // Atomically claim the appointment to prevent double dispatch
      const claimed = await sql`
        UPDATE appointments
        SET reminder_sent_at = NOW()
        WHERE id = ${appt.id}
          AND reminder_sent_at IS NULL
          AND status = 'booked'
        RETURNING id
      `;

      if (claimed && claimed.length > 0) {
        const serviceName = getServiceName(appt.service);
        const smsSent = await sendAppointmentReminderSms({
          customerName: appt.customer_name,
          customerPhone: appt.phone,
          serviceName,
          date: appt.appointment_date,
          time: appt.appointment_time,
        });

        if (smsSent) {
          sentCount++;
          details.push({
            id: appt.id,
            customerName: appt.customer_name,
            phone: appt.phone,
            date: appt.appointment_date,
            time: appt.appointment_time,
            service: serviceName,
            action: "sent",
            minutesUntil: evaluation.minutesUntil,
          });
        }
      }
    }
  }

  // Batch update skipped candidates
  if (skippedIds.length > 0) {
    await sql`
      UPDATE appointments
      SET reminder_sent_at = NOW()
      WHERE id = ANY(${skippedIds})
        AND reminder_sent_at IS NULL
    `;
  }

  return {
    checkedAt: referenceDate.toISOString(),
    iranDate: todayStr,
    candidatesCount: rows.length,
    sentCount,
    skippedCount,
    details,
  };
}

// In-memory throttle for opportunistic background executions
let lastOpportunisticCheck = 0;
const OPPORTUNISTIC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Opportunistically triggers a reminder check if at least 3 minutes have elapsed.
 * Safe to call from Next.js server actions or after() hooks.
 */
export async function checkRemindersOpportunistically(): Promise<void> {
  const now = Date.now();
  if (now - lastOpportunisticCheck < OPPORTUNISTIC_INTERVAL_MS) {
    return;
  }
  lastOpportunisticCheck = now;

  try {
    await dispatchUpcomingReminders();
  } catch (error) {
    console.error("[Reminders] Opportunistic dispatch error:", error);
  }
}
