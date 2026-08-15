export const SERVICES = [
  { id: "haircut", name: "اصلاح مو", price: "۳۵۰٬۰۰۰ تومان", duration: "۴۵ دقیقه" },
  { id: "beard", name: "اصلاح ریش", price: "۲۰۰٬۰۰۰ تومان", duration: "۳۰ دقیقه" },
  { id: "combo", name: "مو + ریش", price: "۵۰۰٬۰۰۰ تومان", duration: "۶۰ دقیقه" },
] as const;

export const TIME_SLOTS = [
  "۱۰:۰۰",
  "۱۱:۰۰",
  "۱۲:۰۰",
  "۱۴:۰۰",
  "۱۵:۰۰",
  "۱۶:۰۰",
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
