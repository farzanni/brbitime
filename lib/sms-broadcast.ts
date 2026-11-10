import { getSql } from "@/lib/db";
import { cleanIranPhone, iranToday, formatPersianDate } from "@/lib/booking";
import { sendDirectSms } from "@/lib/sms";

export interface SmsRecipient {
  phone: string;
  name: string;
}

export interface SmsCustomer {
  id: number;
  phone: string;
  name: string;
  birthday: string | null;
  notes: string | null;
  total_visits: number;
  last_visit_at: string | null;
  created_at: string;
  booked_services: string[];
  upcoming_appointment: {
    date: string;
    time: string;
    service: string;
  } | null;
  days_since_last_visit: number | null;
}

export interface SmsBroadcastRecord {
  id: number;
  message: string;
  target_filter: string;
  recipient_count: number;
  success_count: number;
  fail_count: number;
  recipients: Array<{
    phone: string;
    name: string;
    status: "sent" | "failed";
    error?: string;
  }>;
  created_at: string;
}

/**
 * Calculates SMS character counts and part segments based on standard Iranian telecom specifications:
 * - Persian/Unicode: 70 characters for part 1, then 67 characters per subsequent part.
 * - GSM/English: 160 characters for part 1, then 153 characters per subsequent part.
 */
export function calculateSmsParts(text: string): {
  charCount: number;
  parts: number;
  isPersian: boolean;
  charsRemainingInCurrentPart: number;
} {
  const charCount = text.length;
  const isPersian =
    /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text) ||
    charCount === 0;

  if (isPersian) {
    if (charCount === 0) {
      return { charCount: 0, parts: 1, isPersian: true, charsRemainingInCurrentPart: 70 };
    }
    if (charCount <= 70) {
      return { charCount, parts: 1, isPersian: true, charsRemainingInCurrentPart: 70 - charCount };
    }
    const parts = Math.ceil(charCount / 67);
    const charsRemainingInCurrentPart = parts * 67 - charCount;
    return { charCount, parts, isPersian: true, charsRemainingInCurrentPart };
  } else {
    if (charCount <= 160) {
      return { charCount, parts: 1, isPersian: false, charsRemainingInCurrentPart: 160 - charCount };
    }
    const parts = Math.ceil(charCount / 153);
    const charsRemainingInCurrentPart = parts * 153 - charCount;
    return { charCount, parts, isPersian: false, charsRemainingInCurrentPart };
  }
}

/**
 * Personalizes an SMS template by substituting dynamic placeholders:
 * - {نام} or {name} -> recipient customer name (or fallback if empty)
 * - {سالن} or {shop} -> shop name
 * - {تاریخ} or {date} -> current Persian date
 * - {سایت} or {url} -> shop URL
 */
export function interpolateSmsTemplate(
  template: string,
  recipient: SmsRecipient,
  options?: {
    shopName?: string;
    persianDate?: string;
    shopUrl?: string;
  }
): string {
  const shopName = options?.shopName || "سالن پیرایش";
  const dateStr = options?.persianDate || "";
  const shopUrl = options?.shopUrl || "muucut.ir";
  const cleanName = recipient.name?.trim();

  let text = template;

  if (cleanName) {
    text = text.replace(/\{نام\}|\{name\}/gi, cleanName);
  } else {
    // If recipient has no name, replace greeting gracefully
    text = text
      .replace(/سلام\s*\{نام\}\s*عزیز/gi, "سلام و درود")
      .replace(/سلام\s*\{name\}\s*عزیز/gi, "سلام و درود")
      .replace(/\{نام\}|\{name\}/gi, "مشتری گرامی");
  }

  text = text.replace(/\{سالن\}|\{shop\}/gi, shopName);
  text = text.replace(/\{تاریخ\}|\{date\}/gi, dateStr);
  text = text.replace(/\{سایت\}|\{url\}/gi, shopUrl);

  return text;
}

function computeDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const visitTime = new Date(dateStr).getTime();
  if (Number.isNaN(visitTime)) return null;
  const diffMs = Date.now() - visitTime;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Ensures the `sms_broadcasts` table exists in PostgreSQL.
 */
export async function ensureSmsBroadcastsTable(): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sms_broadcasts (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        target_filter TEXT NOT NULL,
        recipient_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        fail_count INTEGER NOT NULL DEFAULT 0,
        recipients JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_created_at
      ON sms_broadcasts (created_at DESC)
    `;
  } catch (err) {
    console.error("[ensureSmsBroadcastsTable] Error creating table:", err);
  }
}

/**
 * Fetches enriched customer records for SMS filtering and targeting.
 */
export async function getCustomersForSms(): Promise<SmsCustomer[]> {
  const sql = getSql();
  const today = iranToday();

  try {
    const rows = (await sql`
      SELECT 
        c.id, 
        c.phone, 
        c.name, 
        c.birthday, 
        c.notes, 
        c.total_visits, 
        c.last_visit_at::text AS last_visit_at, 
        c.created_at::text AS created_at,
        COALESCE(
          (
            SELECT json_agg(DISTINCT a.service)
            FROM appointments a
            WHERE a.phone = c.phone AND a.status = 'booked'
          ),
          '[]'::json
        ) AS booked_services,
        (
          SELECT json_build_object(
            'date', a.appointment_date::text,
            'time', a.appointment_time,
            'service', a.service
          )
          FROM appointments a
          WHERE a.phone = c.phone AND a.status = 'booked' AND a.appointment_date >= ${today}
          ORDER BY a.appointment_date ASC, a.appointment_time ASC
          LIMIT 1
        ) AS upcoming_appointment
      FROM customers c
      ORDER BY c.last_visit_at DESC NULLS LAST, c.id DESC
    `) as Array<{
      id: number;
      phone: string;
      name: string;
      birthday: string | null;
      notes: string | null;
      total_visits: number;
      last_visit_at: string | null;
      created_at: string;
      booked_services: string[] | string | null;
      upcoming_appointment: { date: string; time: string; service: string } | null;
    }>;

    return rows.map((r) => {
      let services: string[] = [];
      if (Array.isArray(r.booked_services)) {
        services = r.booked_services.map(String);
      } else if (typeof r.booked_services === "string") {
        try {
          const parsed = JSON.parse(r.booked_services);
          if (Array.isArray(parsed)) services = parsed.map(String);
        } catch {}
      }

      return {
        id: Number(r.id),
        phone: String(r.phone),
        name: String(r.name || ""),
        birthday: r.birthday ? String(r.birthday) : null,
        notes: r.notes ? String(r.notes) : null,
        total_visits: Number(r.total_visits || 0),
        last_visit_at: r.last_visit_at ? String(r.last_visit_at) : null,
        created_at: String(r.created_at),
        booked_services: services,
        upcoming_appointment: r.upcoming_appointment
          ? {
              date: String(r.upcoming_appointment.date),
              time: String(r.upcoming_appointment.time),
              service: String(r.upcoming_appointment.service),
            }
          : null,
        days_since_last_visit: computeDaysSince(r.last_visit_at),
      };
    });
  } catch (err) {
    console.error("[getCustomersForSms] Error querying customers:", err);
    return [];
  }
}

async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 5): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Sends an SMS broadcast campaign to a list of recipients with concurrency batching and logs to database.
 */
export async function sendBroadcastCampaign(params: {
  recipients: SmsRecipient[];
  template: string;
  filterName: string;
  shopName?: string;
  shopUrl?: string;
}): Promise<{
  broadcastId: number | null;
  total: number;
  sent: number;
  failed: number;
  details: Array<{
    phone: string;
    name: string;
    status: "sent" | "failed";
    error?: string;
  }>;
}> {
  const { recipients, template, filterName, shopName, shopUrl } = params;
  const persianTodayStr = formatPersianDate(iranToday());

  const details = await pMap(
    recipients,
    async (recipient) => {
      const cleanPhone = cleanIranPhone(recipient.phone);
      if (!/^09\d{9}$/.test(cleanPhone)) {
        return {
          phone: recipient.phone,
          name: recipient.name,
          status: "failed" as const,
          error: "شماره موبایل نامعتبر است",
        };
      }

      const personalizedMessage = interpolateSmsTemplate(template, recipient, {
        shopName,
        persianDate: persianTodayStr,
        shopUrl,
      });

      const res = await sendDirectSms(cleanPhone, personalizedMessage);
      return {
        phone: cleanPhone,
        name: recipient.name,
        status: res.ok ? ("sent" as const) : ("failed" as const),
        error: res.error,
      };
    },
    5
  );

  const sentCount = details.filter((d) => d.status === "sent").length;
  const failCount = details.filter((d) => d.status === "failed").length;

  let broadcastId: number | null = null;
  try {
    const sql = getSql();
    await ensureSmsBroadcastsTable();
    const rows = await sql`
      INSERT INTO sms_broadcasts (
        message,
        target_filter,
        recipient_count,
        success_count,
        fail_count,
        recipients,
        created_at
      )
      VALUES (
        ${template},
        ${filterName},
        ${recipients.length},
        ${sentCount},
        ${failCount},
        ${JSON.stringify(details)},
        NOW()
      )
      RETURNING id
    `;
    if (rows && rows.length > 0) {
      broadcastId = Number(rows[0].id);
    }
  } catch (err) {
    console.error("[sendBroadcastCampaign] Failed to record in DB:", err);
  }

  return {
    broadcastId,
    total: recipients.length,
    sent: sentCount,
    failed: failCount,
    details,
  };
}

/**
 * Fetches recent SMS broadcasts from PostgreSQL.
 */
export async function getSmsBroadcasts(limit = 15): Promise<SmsBroadcastRecord[]> {
  const sql = getSql();
  try {
    const rows = (await sql`
      SELECT 
        id, 
        message, 
        target_filter, 
        recipient_count, 
        success_count, 
        fail_count, 
        recipients, 
        created_at::text AS created_at
      FROM sms_broadcasts
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: number;
      message: string;
      target_filter: string;
      recipient_count: number;
      success_count: number;
      fail_count: number;
      recipients: unknown;
      created_at: string;
    }>;

    return rows.map((r) => {
      let recs: Array<{ phone: string; name: string; status: "sent" | "failed"; error?: string }> = [];
      if (Array.isArray(r.recipients)) {
        recs = r.recipients as typeof recs;
      } else if (typeof r.recipients === "string") {
        try {
          recs = JSON.parse(r.recipients);
        } catch {}
      }

      return {
        id: Number(r.id),
        message: String(r.message),
        target_filter: String(r.target_filter),
        recipient_count: Number(r.recipient_count || 0),
        success_count: Number(r.success_count || 0),
        fail_count: Number(r.fail_count || 0),
        recipients: recs,
        created_at: String(r.created_at),
      };
    });
  } catch {
    return [];
  }
}
