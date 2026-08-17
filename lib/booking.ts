export const SERVICES = [
  { id: "haircut", name: "اصلاح مو", price: "۴۰۰٬۰۰۰ تومان", duration: "۳۰ دقیقه" },
  { id: "beard", name: "اصلاح ریش", price: "۱۰۰٬۰۰۰ تومان", duration: "۱۰ دقیقه" },
  { id: "combo", name: "مو + ریش", price: "۴۵۰٬۰۰۰ تومان", duration: "۴۰ دقیقه" },
] as const;

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
