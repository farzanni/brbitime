import { DEFAULT_SERVICES, type ServiceItem } from "@/lib/shop";

export const SERVICES: readonly ServiceItem[] = DEFAULT_SERVICES;

const LEGACY_SERVICE_NAMES: Record<string, string> = {
  combo: "پکیج کامل (مو + ریش)",
};

export function getServiceName(serviceId: string): string {
  return (
    SERVICES.find((s) => s.id === serviceId)?.name ??
    LEGACY_SERVICE_NAMES[serviceId] ??
    serviceId
  );
}

/**
 * Open hours:
 * Morning: 9am to 1pm (09:00, 10:00, 11:00, 12:00)
 * Evening: 4pm to 10pm (16:00, 17:00, 18:00, 19:00, 20:00, 21:00)
 */
export const WORK_HOURS = [
  "۰۹",
  "۱۰",
  "۱۱",
  "۱۲",
  "۱۶",
  "۱۷",
  "۱۸",
  "۱۹",
  "۲۰",
  "۲۱",
] as const;

export type WorkHour = (typeof WORK_HOURS)[number];

export const HAIRCUT_SERVICE_IDS = ["haircut", "vip", "vip-package"] as const;
export const VIP_SERVICE_IDS = ["vip", "vip-package"] as const;

export function isHaircutService(serviceId: string): boolean {
  return (HAIRCUT_SERVICE_IDS as readonly string[]).includes(serviceId);
}

export function isVipService(serviceId: string): boolean {
  return (VIP_SERVICE_IDS as readonly string[]).includes(serviceId);
}

export const HAIRCUT_SLOTS = WORK_HOURS.map((h) => `${h}:۰۰` as const);

export const OTHER_SLOT_MINUTES = [":۴۰", ":۴۵", ":۵۰", ":۵۵"] as const;

export const OTHER_SERVICE_SLOTS = WORK_HOURS.flatMap((h) =>
  OTHER_SLOT_MINUTES.map((m) => `${h}${m}` as const)
);

export const TIME_SLOTS = [...HAIRCUT_SLOTS, ...OTHER_SERVICE_SLOTS] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export interface BookedAppointmentInfo {
  time: string;
  service: string;
}

export interface UnavailableSlotInfo {
  time: string;
  note?: string | null;
}

export interface SlotOption {
  hour: WorkHour;
  time: string;
  isBooked: boolean;
  isUnavailable?: boolean;
  unavailableNote?: string | null;
  isPassed?: boolean;
}

export interface IranTimeInfo {
  date: string; // YYYY-MM-DD in Asia/Tehran
  hour: number; // 0-23 in Asia/Tehran
  minute: number; // 0-59 in Asia/Tehran
}

/**
 * Returns current date, hour, and minute in Asia/Tehran.
 */
export function getIranDateTime(now = new Date()): IranTimeInfo {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
  };
}

/**
 * Determines whether a slot time has passed according to the business rules:
 * - If target date is before today (in Iran): passed.
 * - If target date is after today (in Iran): not passed.
 * - If target date is today:
 *   - Haircut hours (slots that start on the hour):
 *     Remain open until 15 minutes past the full clock (e.g. 4:00 is open until 4:15, 5:00 until 5:15).
 *     Closed once time passes 15 minutes after the hour (e.g. 4:16+).
 *   - Other services:
 *     Remain open until the full hour is gone (e.g. 4:59, 5:59).
 *     Closed once time passes 4:59, 5:59 (i.e. reaches 5:00 / 6:00 or later).
 */
export function isSlotPast(
  appointmentDate: string,
  hourOrTime: string,
  isHaircut: boolean,
  currentIranTime?: IranTimeInfo
): boolean {
  const iranNow = currentIranTime ?? getIranDateTime();

  if (appointmentDate < iranNow.date) {
    return true;
  }
  if (appointmentDate > iranNow.date) {
    return false;
  }

  const normalized = normalizeDigits(hourOrTime);
  const hourNum = parseInt(normalized.split(":")[0], 10);
  if (Number.isNaN(hourNum)) {
    return true;
  }

  if (isHaircut) {
    if (iranNow.hour > hourNum) {
      return true;
    }
    if (iranNow.hour === hourNum && iranNow.minute > 15) {
      return true;
    }
    return false;
  } else {
    // Open until the full hour is gone (e.g., up to :59 of that hour)
    // Closed once the clock passes :59 of that hour (i.e. current hour is greater than hourNum)
    if (iranNow.hour > hourNum) {
      return true;
    }
    return false;
  }
}

/**
 * Converts Latin / ASCII digits (0-9) to Persian digits (۰-۹).
 */
export function toPersianDigits(value: string): string {
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return value.replace(/[0-9]/g, (d) => persian[Number(d)] ?? d);
}

/**
 * Normalizes Persian and Arabic numerals to standard Latin digits,
 * stripping extraneous spaces and hyphens.
 */
export function normalizeDigits(value: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .replace(/[\s-]/g, "");
}

/**
 * Computes available slots for each hour window of the working day.
 * - Haircut services: only on-the-hour slots (09:00, 10:00, etc.), max 1 per hour.
 * - Other services: sequential slots (:40, :45, :50) with max 3 per hour.
 *   If a VIP haircut was booked at :00, allows only 1 more other reservation (:55).
 */
export function getSlotsForService(
  serviceId: string,
  bookedAppointments: readonly BookedAppointmentInfo[],
  unavailableSlots: readonly UnavailableSlotInfo[] = [],
  targetDate?: string,
  currentIranTime?: IranTimeInfo
): SlotOption[] {
  const isHaircut = isHaircutService(serviceId);

  // Normalize booked appointment times to Persian digits for consistent comparison
  const normalizedAppointments = bookedAppointments.map((appt) => ({
    time: toPersianDigits(appt.time),
    service: appt.service,
  }));

  const normalizedUnavailable = unavailableSlots.map((u) => ({
    time: u.time === "all-day" ? "all-day" : toPersianDigits(u.time),
    note: u.note ?? null,
  }));

  const allDayBlock = normalizedUnavailable.find(
    (u) => u.time === "all-day" || u.time === "all" || u.time === "کل روز"
  );

  return WORK_HOURS.map((hour) => {
    const isPassed = targetDate
      ? isSlotPast(targetDate, hour, isHaircut, currentIranTime)
      : false;

    // Check if whole day or this hour is blocked by admin
    const hourUnavailable =
      allDayBlock ??
      normalizedUnavailable.find(
        (u) =>
          u.time === `${hour}:۰۰` ||
          u.time === hour ||
          u.time.startsWith(`${hour}:`)
      );

    if (hourUnavailable) {
      return {
        hour,
        time: isHaircut ? `${hour}:۰۰` : `${hour}:۴۰`,
        isBooked: true,
        isUnavailable: true,
        unavailableNote: hourUnavailable.note || null,
        isPassed,
      };
    }

    if (isHaircut) {
      const time = `${hour}:۰۰`;
      const isBooked = normalizedAppointments.some((appt) => appt.time === time);
      return {
        hour,
        time,
        isBooked,
        isPassed,
      };
    }

    // Other services (Beard, Lineup, Styling, Wax, Cleansing, etc.)
    const haircutAppt = normalizedAppointments.find(
      (appt) => appt.time === `${hour}:۰۰`
    );
    const hasVipHaircut = haircutAppt ? isVipService(haircutAppt.service) : false;

    // Existing other service bookings in this hour (times ending in :40, :45, :50, :55)
    const existingOtherAppts = normalizedAppointments.filter(
      (appt) => appt.time.startsWith(`${hour}:`) && appt.time !== `${hour}:۰۰`
    );
    const existingOtherTimes = new Set(existingOtherAppts.map((a) => a.time));

    if (hasVipHaircut) {
      const vipSlot = `${hour}:۵۵`;
      const isVipSlotBooked = existingOtherTimes.has(vipSlot);

      // VIP allows at most 1 reservation after the haircut (:55)
      if (isVipSlotBooked || existingOtherAppts.length >= 2) {
        return {
          hour,
          time: vipSlot,
          isBooked: true,
          isPassed,
        };
      }

      return {
        hour,
        time: vipSlot,
        isBooked: false,
        isPassed,
      };
    }

    // Standard sequence for other services (:40 -> :45 -> :50), max 3
    const sequence = [":۴۰", ":۴۵", ":۵۰"] as const;
    const availableMinute = sequence.find(
      (m) => !existingOtherTimes.has(`${hour}${m}`)
    );

    if (availableMinute && existingOtherAppts.length < 3) {
      return {
        hour,
        time: `${hour}${availableMinute}`,
        isBooked: false,
        isPassed,
      };
    }

    // Hour full for other services
    return {
      hour,
      time: `${hour}:۴۰`,
      isBooked: true,
      isPassed,
    };
  });
}

export function iranToday(): string {
  return getIranDateTime().date;
}

/**
 * Formats an ISO date (YYYY-MM-DD) or Date object into standard Persian format:
 * "weekday day month" (weekday in text, day in num, month in text).
 * Example: "2026-11-06" -> "جمعه ۱۵ آبان"
 */
export function formatPersianDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  try {
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      const parts = trimmed.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        // Noon UTC ensures the date remains identical across all timezones including Asia/Tehran
        const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
        return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          timeZone: "Asia/Tehran",
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(d);
      }
      const d = new Date(trimmed);
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        timeZone: "Asia/Tehran",
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(d);
    }
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(dateInput);
  } catch {
    return String(dateInput);
  }
}

