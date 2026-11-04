import { DEFAULT_SERVICES, type ServiceItem } from "@/lib/shop";

export const SERVICES: readonly ServiceItem[] = DEFAULT_SERVICES;

export const TIME_SLOTS = [
  "۱۵:۰۰",
  "۱۵:۳۰",
  "۱۶:۰۰",
  "۱۶:۳۰",
  "۱۷:۰۰",
  "۱۷:۳۰",
  "۱۸:۰۰",
  "۱۸:۳۰",
  "۱۹:۰۰",
  "۱۹:۳۰",
] as const;

export function iranToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
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
