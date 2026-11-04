export function toAsciiDigits(value: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)));
}

export const PERSIAN_MONTHS = [
  { id: 1, name: "فروردین", days: 31 },
  { id: 2, name: "اردیبهشت", days: 31 },
  { id: 3, name: "خرداد", days: 31 },
  { id: 4, name: "تیر", days: 31 },
  { id: 5, name: "مرداد", days: 31 },
  { id: 6, name: "شهریور", days: 31 },
  { id: 7, name: "مهر", days: 30 },
  { id: 8, name: "آبان", days: 30 },
  { id: 9, name: "آذر", days: 30 },
  { id: 10, name: "دی", days: 30 },
  { id: 11, name: "بهمن", days: 30 },
  { id: 12, name: "اسفند", days: 29 },
] as const;

export interface ParsedBirthday {
  month: number;
  day: number;
  year: number | null;
  formatted: string;
  normalized: string; // "MM-DD" or "YYYY-MM-DD"
}

export interface BirthdayStatus {
  isRegistered: boolean;
  formattedDate: string;
  monthName: string;
  day: number;
  year: number | null;
  isBirthdayToday: boolean;
  isBirthdayWeek: boolean;
  isBirthdayMonth: boolean;
  discountEligible: boolean;
  discountPercent: number;
}

/** Get current Shamsi date parts using Iran timezone */
export function getIranShamsi(date: Date = new Date()): { year: number; month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return {
      year: parseInt(get("year"), 10) || 1403,
      month: parseInt(get("month"), 10) || 1,
      day: parseInt(get("day"), 10) || 1,
    };
  } catch {
    return { year: 1403, month: 1, day: 1 };
  }
}

/** Convert day and month into day-of-year index (1..365) in Persian calendar */
export function getPersianDayOfYear(month: number, day: number): number {
  let count = 0;
  for (let m = 1; m < month; m++) {
    count += m <= 6 ? 31 : 30;
  }
  return count + day;
}

/** Standardize month, day, and optional year into canonical string: YYYY-MM-DD or MM-DD */
export function formatNormalizedBirthday(month: number, day: number, year?: number | null): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  if (year && year >= 1300 && year <= 1450) {
    return `${year}-${m}-${d}`;
  }
  return `${m}-${d}`;
}

/** Parse any raw birthday string (standardized, legacy, or Persian digits) */
export function parseBirthday(raw: string | null | undefined): ParsedBirthday | null {
  if (!raw) return null;

  const clean = toAsciiDigits(String(raw).trim()).replace(/\//g, "-").replace(/\\/g, "-");
  if (!clean) return null;

  // Pattern 1: YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const monthObj = PERSIAN_MONTHS[month - 1];
      const validDay = Math.min(day, monthObj.days);
      const normalized = formatNormalizedBirthday(month, validDay, year);
      const formatted = `${validDay} ${monthObj.name} ${year}`;
      return { month, day: validDay, year, formatted, normalized };
    }
  }

  // Pattern 2: MM-DD
  const mdMatch = clean.match(/^(\d{1,2})-(\d{1,2})$/);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10);
    const day = parseInt(mdMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const monthObj = PERSIAN_MONTHS[month - 1];
      const validDay = Math.min(day, monthObj.days);
      const normalized = formatNormalizedBirthday(month, validDay);
      const formatted = `${validDay} ${monthObj.name}`;
      return { month, day: validDay, year: null, formatted, normalized };
    }
  }

  // Fallback pattern: detect month name in Persian text
  for (const m of PERSIAN_MONTHS) {
    if (clean.includes(m.name)) {
      const numbers = clean.replace(m.name, "").match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const day = parseInt(numbers[0], 10);
        const year = numbers[1] && numbers[1].length === 4 ? parseInt(numbers[1], 10) : null;
        if (day >= 1 && day <= 31) {
          const validDay = Math.min(day, m.days);
          const normalized = formatNormalizedBirthday(m.id, validDay, year);
          const formatted = year ? `${validDay} ${m.name} ${year}` : `${validDay} ${m.name}`;
          return { month: m.id, day: validDay, year, formatted, normalized };
        }
      }
    }
  }

  return null;
}

/**
 * Check if the customer's birthday qualifies for the salon's 50% birthday promo.
 * A customer is eligible during their birthday week (within +/- 3 days of birthday).
 */
export function checkBirthdayStatus(
  birthdayRaw: string | null | undefined,
  targetDate?: Date | string
): BirthdayStatus {
  const parsed = parseBirthday(birthdayRaw);
  if (!parsed) {
    return {
      isRegistered: false,
      formattedDate: "",
      monthName: "",
      day: 0,
      year: null,
      isBirthdayToday: false,
      isBirthdayWeek: false,
      isBirthdayMonth: false,
      discountEligible: false,
      discountPercent: 0,
    };
  }

  const baseDate = targetDate
    ? typeof targetDate === "string"
      ? new Date(targetDate + "T12:00:00")
      : targetDate
    : new Date();

  const currentShamsi = getIranShamsi(baseDate);

  const customerDayOfYear = getPersianDayOfYear(parsed.month, parsed.day);
  const currentDayOfYear = getPersianDayOfYear(currentShamsi.month, currentShamsi.day);

  // Calculate shortest circular difference on 365-day calendar
  let diff = Math.abs(customerDayOfYear - currentDayOfYear);
  if (diff > 182) {
    diff = 365 - diff;
  }

  const isBirthdayToday = parsed.month === currentShamsi.month && parsed.day === currentShamsi.day;
  const isBirthdayWeek = diff <= 3; // Within 3 days before or after birthday
  const isBirthdayMonth = parsed.month === currentShamsi.month;

  return {
    isRegistered: true,
    formattedDate: parsed.formatted,
    monthName: PERSIAN_MONTHS[parsed.month - 1]?.name || "",
    day: parsed.day,
    year: parsed.year,
    isBirthdayToday,
    isBirthdayWeek,
    isBirthdayMonth,
    discountEligible: isBirthdayWeek,
    discountPercent: isBirthdayWeek ? 50 : 0,
  };
}
