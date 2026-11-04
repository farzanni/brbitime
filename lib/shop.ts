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

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  tag: string;
}

export interface ShopConfig {
  name: string;
  tagline: string;
  phone: string;
  instagram: string;
  address: string;
  birthdayPromoText: string;
  services: ServiceItem[];
  products: ProductItem[];
  events: EventItem[];
  gallery: GalleryItem[];
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
    title: "مشاوره استایل و آنالیز چهره",
    date: "دوشنبه‌ها ساعت ۱۷ الی ۱۹",
    description: "بررسی فرم صورت و انتخاب بهترین مدل مو مناسب شما",
    tag: "رویداد رایگان",
  },
];

export const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: "g1",
    title: "فضای اختصاصی سالن",
    subtitle: "طراحی مدرن بر پایه سنگ‌های تیره و مرمر مشکی",
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80",
    tag: "فضای سالن",
  },
  {
    id: "g2",
    title: "ابزار اختصاصی و اصلاح کلاسیک",
    subtitle: "تیغ‌های سوئیسی استریل و ابزار تمام فلزی",
    imageUrl: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80",
    tag: "ابزار کار",
  },
  {
    id: "g3",
    title: "استایل و فید مدرن",
    subtitle: "طراحی خطوط متناسب با ساختار هندسی صورت",
    imageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80",
    tag: "هنر پیرایش",
  },
  {
    id: "g4",
    title: "فرم‌دهی تخصصی ریش",
    subtitle: "اصلاح دقیق زاویه‌ها با حوله گرم و روغن آرگان",
    imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
    tag: "مراقبت ریش",
  },
];

export const DEFAULT_SHOP: ShopConfig = {
  name: "مو کات",
  tagline: "مجموعه سالن تخصصی مو کات",
  phone: "09103785097",
  instagram: "muucut.ir",
  address: "تهران، خیابان ولیعصر، نرسیده به میدان ونک",
  birthdayPromoText: "با ثبت تاریخ تولد، در هفته تولدتان از ما ۵۰٪ تخفیف و خدمات ویژه هدیه بگیرید.",
  services: DEFAULT_SERVICES,
  products: DEFAULT_PRODUCTS,
  events: DEFAULT_EVENTS,
  gallery: DEFAULT_GALLERY,
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
        gallery: Array.isArray(data.gallery) && data.gallery.length > 0 ? data.gallery : DEFAULT_GALLERY,
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
