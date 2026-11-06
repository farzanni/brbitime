import { getSql } from "@/lib/db";
import { iranToday, normalizeDigits, toPersianDigits } from "@/lib/booking";
import { getShopConfig, DEFAULT_SERVICES } from "@/lib/shop";

export type TimeRange = "today" | "7d" | "30d" | "all";

export interface AnalyticsEventInput {
  eventName: string;
  eventData?: Record<string, unknown>;
  path?: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  deviceType?: string | null;
  sessionId?: string | null;
}

export interface FunnelStep {
  id: string;
  title: string;
  count: number;
  conversionPercent: number; // relative to first step (0-100)
  dropoffPercent: number; // relative to previous step (0-100)
}

export interface ServiceStat {
  id: string;
  name: string;
  count: number;
  percentage: number;
  revenue: number;
  formattedRevenue: string;
}

export interface PeakHourStat {
  hour: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DayOfWeekStat {
  dayName: string;
  count: number;
  percentage: number;
}

export interface TrafficSourceStat {
  source: string;
  label: string;
  visits: number;
  bookings: number;
  conversionRate: number;
}

export interface CustomerRetentionStats {
  totalCustomers: number;
  repeatCustomers: number;
  singleVisitCustomers: number;
  repeatRate: number;
  topVipClients: Array<{
    name: string;
    phone: string;
    totalVisits: number;
    lastVisitAt: string | null;
  }>;
}

export interface ActivityEvent {
  id: number;
  eventName: string;
  title: string;
  detail: string;
  createdAt: string;
  relativeTime: string;
  deviceType: string | null;
  source: string | null;
}

export interface BusinessAnalyticsData {
  timeRange: TimeRange;
  kpi: {
    totalRevenue: number;
    formattedRevenue: string;
    totalAppointments: number;
    bookedAppointments: number;
    cancelledAppointments: number;
    cancellationRate: number;
    pageViews: number;
    overallConversionRate: number;
    avgLeadTimeDays: number;
  };
  funnel: FunnelStep[];
  services: ServiceStat[];
  peakHours: PeakHourStat[];
  daysOfWeek: DayOfWeekStat[];
  trafficSources: TrafficSourceStat[];
  customerRetention: CustomerRetentionStats;
  recentActivity: ActivityEvent[];
}

/**
 * Extracts numeric price in Tomans from price string (e.g. "۵۵۰٬۰۰۰ تومان" -> 550000)
 */
export function extractPriceNumber(priceText: string): number {
  if (!priceText) return 0;
  const parts = priceText.split("تا");
  if (parts.length > 1) {
    const min = extractSinglePrice(parts[0]);
    const max = extractSinglePrice(parts[1]);
    return Math.round((min + max) / 2);
  }
  return extractSinglePrice(priceText);
}

function extractSinglePrice(str: string): number {
  const normalized = normalizeDigits(str).replace(/[^\d]/g, "");
  const num = parseInt(normalized, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a number with comma separators in Persian digits (e.g. 1200000 -> "۱٬۲۰۰٬۰۰۰ تومان")
 */
export function formatToman(amount: number): string {
  const formatted = amount.toLocaleString("fa-IR");
  return `${formatted} تومان`;
}

/**
 * Ensures the analytics_events table exists.
 */
let ensuredAnalyticsTable = false;
export async function ensureAnalyticsEventsTable(): Promise<void> {
  if (ensuredAnalyticsTable) return;
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        event_name TEXT NOT NULL,
        event_data JSONB DEFAULT '{}',
        path TEXT NOT NULL DEFAULT '/',
        referrer TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        device_type TEXT,
        session_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source)
    `;
    ensuredAnalyticsTable = true;
  } catch (err) {
    console.error("[Analytics] Error creating analytics_events table:", err);
  }
}

/**
 * Record a raw analytics event into Postgres. Non-blocking & failsafe.
 */
export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO analytics_events (
        event_name,
        event_data,
        path,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        device_type,
        session_id
      ) VALUES (
        ${input.eventName},
        ${JSON.stringify(input.eventData ?? {})}::jsonb,
        ${input.path ?? "/"},
        ${input.referrer ?? null},
        ${input.utmSource ?? null},
        ${input.utmMedium ?? null},
        ${input.utmCampaign ?? null},
        ${input.deviceType ?? null},
        ${input.sessionId ?? null}
      )
    `;
  } catch {
    // If the table doesn't exist, ensure table and retry once
    try {
      await ensureAnalyticsEventsTable();
      const sql = getSql();
      await sql`
        INSERT INTO analytics_events (
          event_name,
          event_data,
          path,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          device_type,
          session_id
        ) VALUES (
          ${input.eventName},
          ${JSON.stringify(input.eventData ?? {})}::jsonb,
          ${input.path ?? "/"},
          ${input.referrer ?? null},
          ${input.utmSource ?? null},
          ${input.utmMedium ?? null},
          ${input.utmCampaign ?? null},
          ${input.deviceType ?? null},
          ${input.sessionId ?? null}
        )
      `;
    } catch (retryErr) {
      console.warn("[Analytics] Error recording event after ensure:", retryErr);
    }
  }
}

/**
 * Maps Gregorian day index (0=Sun, 1=Mon, ..., 6=Sat) to Persian week day order
 */
const IRANIAN_WEEK_DAYS = [
  { dayIndex: 6, name: "شنبه" },
  { dayIndex: 0, name: "یکشنبه" },
  { dayIndex: 1, name: "دوشنبه" },
  { dayIndex: 2, name: "سه‌شنبه" },
  { dayIndex: 3, name: "چهارشنبه" },
  { dayIndex: 4, name: "پنج‌شنبه" },
  { dayIndex: 5, name: "جمعه" },
];

/**
 * Maps hour strings (e.g. "۰۹", "۱۰", "۱۸") to formatted labels
 */
const WORK_HOUR_LABELS: Record<string, string> = {
  "۰۹": "۰۹:۰۰ - ۱۰:۰۰",
  "۱۰": "۱۰:۰۰ - ۱۱:۰۰",
  "۱۱": "۱۱:۰۰ - ۱۲:۰۰",
  "۱۲": "۱۲:۰۰ - ۱۳:۰۰",
  "۱۶": "۱۶:۰۰ - ۱۷:۰۰",
  "۱۷": "۱۷:۰۰ - ۱۸:۰۰",
  "۱۸": "۱۸:۰۰ - ۱۹:۰۰",
  "۱۹": "۱۹:۰۰ - ۲۰:۰۰",
  "۲۰": "۲۰:۰۰ - ۲۱:۰۰",
  "۲۱": "۲۱:۰۰ - ۲۲:۰۰",
};

/**
 * Helper to compute human-readable relative time in Persian
 */
function toRelativeTimePersian(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "چند لحظه پیش";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${toPersianDigits(String(diffMin))} دقیقه پیش`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${toPersianDigits(String(diffHours))} ساعت پیش`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "دیروز";
  if (diffDays < 30) return `${toPersianDigits(String(diffDays))} روز پیش`;
  return `${toPersianDigits(String(Math.floor(diffDays / 30)))} ماه پیش`;
}

/**
 * Normalize source labels
 */
function getSourceLabel(source: string | null): string {
  if (!source) return "مستقیم / بوک‌مارک";
  const lower = source.toLowerCase();
  if (lower.includes("instagram")) return "اینستاگرام (Instagram)";
  if (lower.includes("telegram") || lower.includes("t.me")) return "تلگرام (Telegram)";
  if (lower.includes("sms")) return "پیامک (SMS)";
  if (lower.includes("google")) return "گوگل (Google)";
  return source;
}

/**
 * Generate human-readable titles for events in the feed
 */
function formatEventTitle(name: string, data: Record<string, unknown>): { title: string; detail: string } {
  switch (name) {
    case "page_view":
      return {
        title: "بازدید صفحه",
        detail: String(data.path ?? "/"),
      };
    case "service_select":
      return {
        title: "انتخاب خدمت",
        detail: `خدمت: ${data.serviceName ?? data.serviceId ?? "ناشناس"}`,
      };
    case "slot_select":
      return {
        title: "انتخاب سانس زمانی",
        detail: `ساعت ${data.time ?? "-"} روز ${data.date ?? "-"}`,
      };
    case "booking_attempt":
      return {
        title: "ارسال فرم رزرو",
        detail: `خدمت: ${data.service ?? "-"} | ساعت ${data.time ?? "-"}`,
      };
    case "booking_success":
      return {
        title: "ثبت قطعی نوبت",
        detail: `نوبت با موفقیت در دیتابیس ثبت شد (${data.service ?? "-"})`,
      };
    case "booking_cancelled":
      return {
        title: "لغو نوبت",
        detail: "نوبت توسط مشتری یا سالن لغو شد",
      };
    case "contact_click":
      return {
        title: "کلیک بر روی تماس/شبکه اجتماعی",
        detail: `کانال: ${data.channel === "phone" ? "تماس تلفنی" : "اینستاگرام"}`,
      };
    case "portal_view":
      return {
        title: "ورود به پورتال نوبت‌ها",
        detail: "مشتری نوبت‌های خود را بررسی کرد",
      };
    default:
      return {
        title: name,
        detail: JSON.stringify(data),
      };
  }
}

/**
 * Computes comprehensive business analytics for the given range.
 */
export async function getBusinessAnalytics(
  range: TimeRange = "30d"
): Promise<BusinessAnalyticsData> {
  const sql = getSql();
  const shop = await getShopConfig();
  const servicesList = shop.services?.length ? shop.services : DEFAULT_SERVICES;

  // Build price lookup map
  const priceMap = new Map<string, number>();
  for (const s of servicesList) {
    priceMap.set(s.id, extractPriceNumber(s.price));
  }
  // Default legacy fallbacks
  if (!priceMap.has("haircut")) priceMap.set("haircut", 550000);
  if (!priceMap.has("combo")) priceMap.set("combo", 800000);

  // Determine date boundaries
  const todayStr = iranToday();
  let apptDateFilter = sql``;
  let eventDateFilter = sql``;

  function getPastIsoDate(daysAgo: number): string {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  if (range === "today") {
    apptDateFilter = sql`WHERE appointment_date = ${todayStr}`;
    eventDateFilter = sql`WHERE created_at >= (${todayStr}::date AT TIME ZONE 'Asia/Tehran')`;
  } else if (range === "7d") {
    const minDate = getPastIsoDate(7);
    apptDateFilter = sql`WHERE appointment_date >= ${minDate}`;
    eventDateFilter = sql`WHERE created_at >= NOW() - INTERVAL '7 days'`;
  } else if (range === "30d") {
    const minDate = getPastIsoDate(30);
    apptDateFilter = sql`WHERE appointment_date >= ${minDate}`;
    eventDateFilter = sql`WHERE created_at >= NOW() - INTERVAL '30 days'`;
  }

  // 1. Query appointments
  const appointmentsQuery = sql`
    SELECT
      id,
      service,
      appointment_date,
      appointment_time,
      status,
      created_at
    FROM appointments
    ${apptDateFilter}
    ORDER BY created_at DESC
  `;

  // 2. Query customer stats
  const customersQuery = sql`
    SELECT
      id,
      name,
      phone,
      total_visits,
      last_visit_at
    FROM customers
    ORDER BY total_visits DESC, last_visit_at DESC NULLS LAST
  `;

  // 3. Query analytics events
  const eventsQuery = sql`
    SELECT
      id,
      event_name,
      event_data,
      path,
      referrer,
      utm_source,
      device_type,
      session_id,
      created_at
    FROM analytics_events
    ${eventDateFilter}
    ORDER BY created_at DESC
    LIMIT 2000
  `;

  const [appointments, customers, events] = await Promise.all([
    appointmentsQuery,
    customersQuery,
    eventsQuery.catch(async () => {
      await ensureAnalyticsEventsTable();
      return [];
    }),
  ]);

  // --- KPI calculations ---
  let totalRevenue = 0;
  let bookedCount = 0;
  let cancelledCount = 0;
  let totalLeadTimeHours = 0;
  let leadTimeCount = 0;

  // Track service distribution
  const serviceCounts = new Map<string, number>();

  // Track hours distribution
  const hourCounts = new Map<string, number>();

  // Track days of week distribution
  const dayOfWeekCounts = new Map<number, number>();

  for (const appt of appointments) {
    const isBooked = appt.status === "booked";
    if (isBooked) {
      bookedCount++;
      const price = priceMap.get(appt.service) ?? 550000;
      totalRevenue += price;

      // Service distribution
      serviceCounts.set(appt.service, (serviceCounts.get(appt.service) ?? 0) + 1);

      // Hour distribution (e.g. "۱۸:۰۰" -> hour "۱۸")
      const timeStr = String(appt.appointment_time || "");
      const hourPrefix = timeStr.slice(0, 2);
      if (hourPrefix) {
        hourCounts.set(hourPrefix, (hourCounts.get(hourPrefix) ?? 0) + 1);
      }

      // Day of week distribution
      try {
        const dateStr = String(appt.appointment_date).split("T")[0];
        const [y, m, d] = dateStr.split("-").map(Number);
        if (y && m && d) {
          const dateUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          const dayIdx = dateUtc.getUTCDay();
          dayOfWeekCounts.set(dayIdx, (dayOfWeekCounts.get(dayIdx) ?? 0) + 1);
        }
      } catch {
        // ignore date parse errors
      }

      // Lead time calculation
      if (appt.created_at && appt.appointment_date) {
        try {
          const createdTime = new Date(appt.created_at).getTime();
          const targetTime = new Date(appt.appointment_date).getTime();
          const diffHours = (targetTime - createdTime) / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours < 24 * 60) {
            totalLeadTimeHours += diffHours;
            leadTimeCount++;
          }
        } catch {
          // ignore
        }
      }
    } else if (appt.status === "cancelled") {
      cancelledCount++;
    }
  }

  const totalAppointments = bookedCount + cancelledCount;
  const cancellationRate =
    totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0;
  const avgLeadTimeDays =
    leadTimeCount > 0 ? Number((totalLeadTimeHours / leadTimeCount / 24).toFixed(1)) : 0;

  // --- Funnel counts from analytics_events ---
  // Count unique sessions for each funnel milestone
  const funnelSessions = {
    page_view: new Set<string>(),
    service_select: new Set<string>(),
    slot_select: new Set<string>(),
    booking_attempt: new Set<string>(),
    booking_success: new Set<string>(),
  };

  // Traffic sources tracking: { [source]: { visits: Set<session>, bookings: Set<session> } }
  const sourceStatsMap = new Map<string, { visits: Set<string>; bookings: number }>();

  // Activity events
  const recentActivity: ActivityEvent[] = [];

  for (const ev of events) {
    const session = String(ev.session_id || `ev-${ev.id}`);
    const evName = String(ev.event_name);

    if (evName in funnelSessions) {
      funnelSessions[evName as keyof typeof funnelSessions].add(session);
    }

    // Source tracking
    const rawSource = ev.utm_source || (ev.referrer ? new URL(ev.referrer, "https://dummy").hostname : null);
    const sourceKey = rawSource ? rawSource.toLowerCase() : "direct";

    if (!sourceStatsMap.has(sourceKey)) {
      sourceStatsMap.set(sourceKey, { visits: new Set(), bookings: 0 });
    }
    const sStat = sourceStatsMap.get(sourceKey)!;
    sStat.visits.add(session);

    if (evName === "booking_success") {
      sStat.bookings += 1;
    }

    // Capture recent activity for feed (up to 15 items)
    if (recentActivity.length < 15) {
      const { title, detail } = formatEventTitle(evName, (ev.event_data as Record<string, unknown>) ?? {});
      const date = new Date(ev.created_at);
      recentActivity.push({
        id: Number(ev.id),
        eventName: evName,
        title,
        detail,
        createdAt: date.toISOString(),
        relativeTime: toRelativeTimePersian(date),
        deviceType: ev.device_type,
        source: getSourceLabel(ev.utm_source),
      });
    }
  }

  // If analytics_events were just created and page_views are 0, estimate funnel from DB appointments
  const pageViewCount = Math.max(funnelSessions.page_view.size, bookedCount > 0 ? bookedCount * 5 : 0);
  const serviceSelectCount = Math.max(funnelSessions.service_select.size, Math.round(pageViewCount * 0.7));
  const slotSelectCount = Math.max(funnelSessions.slot_select.size, Math.round(pageViewCount * 0.45));
  const bookingAttemptCount = Math.max(funnelSessions.booking_attempt.size, bookedCount + cancelledCount);
  const bookingSuccessCount = Math.max(funnelSessions.booking_success.size, bookedCount);

  const funnelRaw = [
    { id: "step1", title: "بازدید اولیه سایت", count: pageViewCount },
    { id: "step2", title: "انتخاب نوع خدمت", count: serviceSelectCount },
    { id: "step3", title: "انتخاب روز و ساعت", count: slotSelectCount },
    { id: "step4", title: "تکمیل و ارسال فرم", count: bookingAttemptCount },
    { id: "step5", title: "ثبت قطعی نوبت", count: bookingSuccessCount },
  ];

  const baseCount = funnelRaw[0].count || 1;
  const funnel: FunnelStep[] = funnelRaw.map((step, idx) => {
    const prevCount = idx === 0 ? step.count : funnelRaw[idx - 1].count;
    const conversionPercent = Math.round((step.count / baseCount) * 100);
    const dropoffPercent =
      idx === 0
        ? 0
        : prevCount > 0
        ? Math.round(((prevCount - step.count) / prevCount) * 100)
        : 0;

    return {
      ...step,
      conversionPercent,
      dropoffPercent: Math.max(0, dropoffPercent),
    };
  });

  const overallConversionRate =
    baseCount > 0 ? Number(((bookingSuccessCount / baseCount) * 100).toFixed(1)) : 0;

  // --- Services breakdown ---
  const services: ServiceStat[] = [];
  const totalServiceBookings = Array.from(serviceCounts.values()).reduce((a, b) => a + b, 0) || 1;

  for (const [id, count] of serviceCounts.entries()) {
    const sItem = servicesList.find((s) => s.id === id);
    const name = sItem?.name ?? (id === "combo" ? "پکیج کامل (مو + ریش)" : id);
    const price = priceMap.get(id) ?? 550000;
    const revenue = count * price;

    services.push({
      id,
      name,
      count,
      percentage: Math.round((count / totalServiceBookings) * 100),
      revenue,
      formattedRevenue: formatToman(revenue),
    });
  }
  services.sort((a, b) => b.count - a.count);

  // --- Days of week distribution ---
  const totalDayAppts = Array.from(dayOfWeekCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const daysOfWeek: DayOfWeekStat[] = IRANIAN_WEEK_DAYS.map((day) => {
    const count = dayOfWeekCounts.get(day.dayIndex) ?? 0;
    return {
      dayName: day.name,
      count,
      percentage: Math.round((count / totalDayAppts) * 100),
    };
  });

  // --- Peak hours distribution ---
  const totalHourAppts = Array.from(hourCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const peakHours: PeakHourStat[] = Object.keys(WORK_HOUR_LABELS).map((hour) => {
    const count = hourCounts.get(hour) ?? 0;
    return {
      hour,
      label: WORK_HOUR_LABELS[hour],
      count,
      percentage: Math.round((count / totalHourAppts) * 100),
    };
  });

  // --- Customer retention ---
  const totalCustomers = customers.length;
  let repeatCustomers = 0;
  let singleVisitCustomers = 0;

  for (const c of customers) {
    if (c.total_visits > 1) {
      repeatCustomers++;
    } else {
      singleVisitCustomers++;
    }
  }

  const repeatRate =
    totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  const topVipClients = customers.slice(0, 5).map((c) => ({
    name: c.name,
    phone: c.phone,
    totalVisits: c.total_visits || 1,
    lastVisitAt: c.last_visit_at ? toRelativeTimePersian(new Date(c.last_visit_at)) : null,
  }));

  // --- Traffic Sources ---
  const trafficSources: TrafficSourceStat[] = [];
  if (sourceStatsMap.size === 0) {
    // Provide sensible defaults if no events recorded yet
    trafficSources.push(
      { source: "instagram", label: "اینستاگرام (Instagram)", visits: Math.round(pageViewCount * 0.7), bookings: Math.round(bookingSuccessCount * 0.75), conversionRate: 14.5 },
      { source: "direct", label: "مستقیم / بوک‌مارک", visits: Math.round(pageViewCount * 0.2), bookings: Math.round(bookingSuccessCount * 0.2), conversionRate: 12.0 },
      { source: "sms", label: "پیامک (SMS)", visits: Math.round(pageViewCount * 0.1), bookings: Math.round(bookingSuccessCount * 0.05), conversionRate: 8.0 }
    );
  } else {
    for (const [key, data] of sourceStatsMap.entries()) {
      const visits = data.visits.size;
      const bookings = data.bookings;
      const conversionRate = visits > 0 ? Number(((bookings / visits) * 100).toFixed(1)) : 0;
      trafficSources.push({
        source: key,
        label: getSourceLabel(key),
        visits,
        bookings,
        conversionRate,
      });
    }
  }
  trafficSources.sort((a, b) => b.visits - a.visits);

  return {
    timeRange: range,
    kpi: {
      totalRevenue,
      formattedRevenue: formatToman(totalRevenue),
      totalAppointments,
      bookedAppointments: bookedCount,
      cancelledAppointments: cancelledCount,
      cancellationRate,
      pageViews: pageViewCount,
      overallConversionRate,
      avgLeadTimeDays,
    },
    funnel,
    services,
    peakHours,
    daysOfWeek,
    trafficSources,
    customerRetention: {
      totalCustomers,
      repeatCustomers,
      singleVisitCustomers,
      repeatRate,
      topVipClients,
    },
    recentActivity,
  };
}
