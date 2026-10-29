import { getSql } from "@/lib/db";

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  duration: string;
}

export interface ProductItem {
  id: string;
  title: string;
  price: string;
  description: string;
  tag: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  description: string;
  tag: string;
}

export interface ShopConfig {
  name: string;
  phone: string;
  instagram: string;
  address: string;
  birthdayPromoText: string;
  services: ServiceItem[];
  products: ProductItem[];
  events: EventItem[];
}

export const DEFAULT_SERVICES: ServiceItem[] = [
  { id: "haircut", name: "اصلاح و استایل مو", price: "۴۰۰٬۰۰۰ تومان", duration: "۳۰ دقیقه" },
  { id: "beard", name: "اصلاح و فرم‌دهی ریش", price: "۱۰۰٬۰۰۰ تومان", duration: "۱۰ دقیقه" },
  { id: "combo", name: "پکیج کامل (مو + ریش)", price: "۴۵۰٬۰۰۰ تومان", duration: "۴۰ دقیقه" },
  { id: "vip", name: "پکیج VIP (مو + ریش + ماسک صورت)", price: "۶۵۰٬۰۰۰ تومان", duration: "۶۰ دقیقه" },
];

export const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: "clay",
    title: "مات چسب مو (Hair Clay)",
    price: "۳۵۰٬۰۰۰ تومان",
    description: "ماندگاری ۲۴ ساعته با جلوه مات طبیعی، بدون سفیدک",
    tag: "پیشنهاد آرایشگر",
  },
  {
    id: "beard-oil",
    title: "روغن تقویتی ریش و سبیل",
    price: "۲۸۰٬۰۰۰ تومان",
    description: "نرم‌کننده، ضد خارش و براق‌کننده طبیعی ریش با عصاره آرگان",
    tag: "پرفروش",
  },
  {
    id: "aftershave",
    title: "افترشیو خنک‌کننده ضد التهاب",
    price: "۲۲۰٬۰۰۰ تومان",
    description: "حاوی آلوئه‌ورا و نعناع، آرام‌بخش پوست پس از اصلاح",
    tag: "موجود در سالن",
  },
];

export const DEFAULT_EVENTS: EventItem[] = [
  {
    id: "weekend-discount",
    title: "تخفیف ویژه آخر هفته",
    date: "پنج‌شنبه‌ها و جمعه‌ها",
    description: "۱۰٪ تخفیف برای تمام رزروهای مو و ریش در شیفت صبح",
    tag: "تخفیف ویژه",
  },
  {
    id: "birthday-club",
    title: "باشگاه تولد مشتریان",
    date: "تمام روزهای سال",
    description: "یک اصلاح موی رایگان یا ۵۰٪ تخفیف در هفته تولد شما",
    tag: "هدیه تولد",
  },
  {
    id: "hair-care-session",
    title: "مشاوره رایگان استایل و سلامت پوست",
    date: "دوشنبه‌ها ساعت ۱۷ الی ۱۹",
    description: "بررسی فرم صورت و انتخاب بهترین مدل مو مناسب شما",
    tag: "رویداد رایگان",
  },
];

export const DEFAULT_SHOP: ShopConfig = {
  name: "آرایشگاه امیر",
  phone: "09103785097",
  instagram: "amir_barber",
  address: "تهران، خیابان ولیعصر، نرسیده به میدان ونک",
  birthdayPromoText: "با ثبت تاریخ تولد، در هفته تولدتان از ما ۵۰٪ تخفیف و خدمات ویژه هدیه بگیرید.",
  services: DEFAULT_SERVICES,
  products: DEFAULT_PRODUCTS,
  events: DEFAULT_EVENTS,
};

export const SHOP = DEFAULT_SHOP;

export async function getShopConfig(): Promise<ShopConfig> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT data FROM shop_content WHERE key = 'site_config' LIMIT 1
    `;
    if (rows && rows.length > 0 && rows[0]?.data) {
      const data = rows[0].data as Partial<ShopConfig>;
      return {
        ...DEFAULT_SHOP,
        ...data,
        services: Array.isArray(data.services) && data.services.length > 0 ? data.services : DEFAULT_SERVICES,
        products: Array.isArray(data.products) && data.products.length > 0 ? data.products : DEFAULT_PRODUCTS,
        events: Array.isArray(data.events) && data.events.length > 0 ? data.events : DEFAULT_EVENTS,
      };
    }
  } catch {
    // Return fallback defaults if DB is unreachable or during build
  }

  return DEFAULT_SHOP;
}

export async function saveShopConfig(config: Partial<ShopConfig>): Promise<void> {
  const sql = getSql();
  const current = await getShopConfig();
  const merged: ShopConfig = {
    ...current,
    ...config,
  };

  await sql`
    INSERT INTO shop_content (key, data, updated_at)
    VALUES ('site_config', ${JSON.stringify(merged)}, NOW())
    ON CONFLICT (key) DO UPDATE
    SET data = ${JSON.stringify(merged)}, updated_at = NOW()
  `;
}
