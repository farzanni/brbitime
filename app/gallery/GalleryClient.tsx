"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import BrandLogo from "../BrandLogo";
import { type GalleryItem } from "@/lib/shop";
import {
  ArrowRight,
  Scissors,
  X,
  Sparkles,
  Phone,
  Camera,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export interface HaircutStyle {
  id: string;
  title: string;
  category: "all" | "fade" | "classic" | "crop" | "beard" | "salon";
  categoryLabel: string;
  tag: string;
  description: string;
  imageUrl: string;
}

const CURATED_STYLES: HaircutStyle[] = [
  {
    id: "style-fade-1",
    title: "های اسکین فید و استایل بالا (High Skin Fade)",
    category: "fade",
    categoryLabel: "فید و سایه",
    tag: "محبوب‌ترین",
    description: "فید از پوست با شیب دقیق در کناره‌ها و حجم طبیعی و حالت‌پذیر در قسمت بالا",
    imageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-classic-1",
    title: "پامپادور مات و خط‌گیری دقیق (Classic Pompadour)",
    category: "classic",
    categoryLabel: "کلاسیک و رسمی",
    tag: "رسمی و اداری",
    description: "استایل شیک و کلاسیک مناسب جلسات کاری با خط فرق تمیز و فینیش مات",
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-crop-1",
    title: "کراپ فرانسوی تکسچر دار (Textured French Crop)",
    category: "crop",
    categoryLabel: "کراپ و مدرن",
    tag: "ترند ۲۰۲۶",
    description: "کوتاهی لایه‌ای با چتری صاف و بافت برجسته، بسیار کم‌دردسر در حالت‌دهی روزمره",
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-beard-1",
    title: "فرم‌دهی خطی ریش و هیدراتاسیون (Beard Sculpt & Contour)",
    category: "beard",
    categoryLabel: "اصلاح و ریش",
    tag: "تخصصی",
    description: "اصلاح زاویه‌دار خط گونه و گردن با حوله گرم و روغن آرگان طبیعی برای درخشش و تقارن",
    imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-fade-2",
    title: "تیپر فید لایه‌بندی شده (Low Taper Fade)",
    category: "fade",
    categoryLabel: "فید و سایه",
    tag: "طبیعی",
    description: "محو شدن نرم و ظریف موها در قسمت خط ریش و پشت گردن، بدون خالی شدن بالای گوش",
    imageUrl: "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-classic-2",
    title: "استایل کناری کلاسیک (Executive Contour)",
    category: "classic",
    categoryLabel: "کلاسیک و رسمی",
    tag: "همیشگی",
    description: "پیرایش متعادل و تمیز متناسب با انواع فرم‌های صورت و سبک پوشش کت‌وشلوار",
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-crop-2",
    title: "کوئیف با حجم و حرکت طبیعی (Modern Textured Quiff)",
    category: "crop",
    categoryLabel: "کراپ و مدرن",
    tag: "استایل روزانه",
    description: "حالت‌دهی رو به بالا با شیب ملایم و حرکت آزاد موها برای جلوه‌ای پرپشت و جوان‌پسند",
    imageUrl: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-beard-2",
    title: "پکیج هماهنگ مو و ریش کامل (Full Grooming Combo)",
    category: "beard",
    categoryLabel: "اصلاح و ریش",
    tag: "پیشنهاد ویژه",
    description: "اتصال بی‌نقص فید سر به ریش با اصلاح زاویه‌ها و کانتورینگ متقارن چهره",
    imageUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-fade-3",
    title: "فید تابستانی و باز کات (Summer Buzz Cut & Fade)",
    category: "fade",
    categoryLabel: "فید و سایه",
    tag: "اسپرت",
    description: "کوتاهی یکدست در قسمت بالا همراه با فید دقیق میلی‌متری در اطراف سر",
    imageUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-classic-3",
    title: "کوپ قیچی و فلو طبیعی (Scissor Work & Flow)",
    category: "classic",
    categoryLabel: "کلاسیک و رسمی",
    tag: "تمام قیچی",
    description: "اصلاح حرفه‌ای با استفاده اختصاصی از قیچی بدون ماشین، حفظ وزن و بافت مو",
    imageUrl: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-salon-1",
    title: "محیط اختصاصی و دکوراسیون مدرن سالن",
    category: "salon",
    categoryLabel: "محیط سالن",
    tag: "فضای آرام",
    description: "فضای اختصاصی با صندلی‌های ارگونومیک، نورپردازی استاندارد و موسیقی ملایم",
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "style-salon-2",
    title: "تجهیزات و تیغ‌های سوئیسی استریل",
    category: "salon",
    categoryLabel: "محیط سالن",
    tag: "بهداشت کامل",
    description: "استفاده از پک‌های بهداشتی یکبارمصرف و استریلیزاسیون ماوراءبنفش کلیه ادوات پیرایش",
    imageUrl: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80",
  },
];

const CATEGORIES = [
  { id: "all", label: "همه مدل‌ها" },
  { id: "fade", label: "فید و سایه‌زنی" },
  { id: "classic", label: "کلاسیک و رسمی" },
  { id: "crop", label: "کراپ و مدرن" },
  { id: "beard", label: "اصلاح و ریش" },
  { id: "salon", label: "محیط سالن" },
] as const;

export default function GalleryClient({
  shopName,
  shopPhone,
  shopAddress,
  shopInstagram,
  customGallery,
}: {
  shopName: string;
  shopPhone: string;
  shopAddress?: string;
  shopInstagram?: string;
  customGallery?: GalleryItem[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalItem, setActiveModalItem] = useState<HaircutStyle | null>(null);

  // Merge custom gallery items from shop config
  const allStyles: HaircutStyle[] = useMemo(() => {
    const list = [...CURATED_STYLES];
    if (customGallery && customGallery.length > 0) {
      customGallery.forEach((item) => {
        if (!list.some((existing) => existing.imageUrl === item.imageUrl)) {
          list.push({
            id: `custom-${item.id}`,
            title: item.title,
            category: "salon",
            categoryLabel: item.tag || "گالری سالن",
            tag: item.tag || "نمونه کار",
            description: item.subtitle || "از نمونه کارهای انجام شده در سالن",
            imageUrl: item.imageUrl,
          });
        }
      });
    }
    return list;
  }, [customGallery]);

  const filteredStyles = useMemo(() => {
    if (selectedCategory === "all") return allStyles;
    return allStyles.filter((s) => s.category === selectedCategory);
  }, [allStyles, selectedCategory]);

  // Keyboard accessibility: close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveModalItem(null);
    };
    if (activeModalItem) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [activeModalItem]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#070707] text-white selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition group"
          >
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <span className="font-black text-sm text-white hidden sm:inline">
              {shopName}
            </span>
          </Link>

          <Link
            href="/#booking"
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-black shadow-sm hover:bg-neutral-200 active:scale-95 transition"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>رزرو نوبت</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-10">
        {/* Hero Section of Gallery */}
        <div className="text-center space-y-3.5 max-w-2xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-neutral-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>ژورنال تخصصی مدل مو و نمونه کارها</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            گالری مدل موی {shopName}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            مجموعه‌ای از برترین مدل‌های اصلاح موی مردانه، فیدهای میلی‌متری، کراپ، استایل کلاسیک و فرم‌دهی ریش. مدل مورد علاقه خود را انتخاب کرده و مستقیم رزرو نمایید.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === "all"
                ? allStyles.length
                : allStyles.filter((s) => s.category === cat.id).length;
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive ? "bg-black/10 text-black" : "bg-white/10 text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredStyles.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveModalItem(item)}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] cursor-pointer transition-all duration-300 hover:border-white/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
            >
              {/* Image Container with 4:5 aspect ratio */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-900">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                />

                {/* Subtle gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Top Badge */}
                <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    {item.categoryLabel}
                  </span>
                  {item.tag && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-md">
                      {item.tag}
                    </span>
                  )}
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-3 inset-x-3 space-y-1">
                  <h3 className="text-sm font-bold text-white leading-snug drop-shadow-md group-hover:text-amber-200 transition">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-neutral-300/90 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 group-hover:text-white transition">
                  مشاهده جزئیات
                </span>
                <Link
                  href="/#booking"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white hover:text-black transition"
                >
                  <Scissors className="h-3 w-3" />
                  <span>رزرو این مدل</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-neutral-900 via-black to-neutral-900 p-8 sm:p-10 text-center shadow-2xl">
          <div className="mx-auto max-w-lg space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-white mb-2 shadow-inner">
              <Scissors className="h-6 w-6 text-white" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              مدل موی مورد نظرتان را پیدا کردید؟
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              همین حالا به صورت آنلاین و در کمتر از ۲ دقیقه نوبت خود را ثبت کنید تا در روز و ساعت دلخواه، پیرایش شما انجام شود.
            </p>

            <div className="pt-2">
              <Link
                href="/#booking"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-neutral-200 active:scale-95 transition"
              >
                <Scissors className="h-4 w-4" />
                <span>رزرو آنلاین وقت در سالن</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox / Detail Modal */}
      {activeModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveModalItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#0c0c0c] shadow-2xl animate-in zoom-in-95 duration-200"
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 hover:bg-white hover:text-black transition"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Image */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-neutral-900">
              <Image
                src={activeModalItem.imageUrl}
                alt={activeModalItem.title}
                fill
                sizes="(max-width: 640px) 100vw, 600px"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent" />
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-bold text-white">
                  {activeModalItem.categoryLabel}
                </span>
                {activeModalItem.tag && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-300">
                    {activeModalItem.tag}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-white">
                {activeModalItem.title}
              </h3>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {activeModalItem.description}
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-400 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>اجرا توسط آرایشگر متخصص در سالن {shopName}</span>
                </div>
                <p className="text-[11px] text-neutral-400 pr-5">
                  کافیست هنگام مراجعه، این تصویر را به آرایشگر نشان دهید تا فرم صورت شما بررسی و اجرا شود.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/#booking"
                  onClick={() => setActiveModalItem(null)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3 text-xs sm:text-sm font-bold text-black hover:bg-neutral-200 transition active:scale-95 shadow-md"
                >
                  <Scissors className="h-4 w-4" />
                  <span>رزرو وقت برای این مدل</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveModalItem(null)}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-neutral-300 hover:text-white transition"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
          <p className="font-mono">
            © {new Date().getFullYear()} {shopName}
          </p>

          <div className="flex items-center gap-5">
            <Link href="/" className="text-neutral-400 hover:text-white transition">
              صفحه اصلی
            </Link>

            <Link href="/my" className="text-neutral-400 hover:text-white transition">
              نوبت‌های من
            </Link>

            <a href={`tel:${shopPhone}`} className="flex items-center gap-1 text-neutral-400 hover:text-white transition font-mono">
              <Phone className="h-3.5 w-3.5" />
              <span>{shopPhone}</span>
            </a>

            {shopInstagram && (
              <a
                href={`https://instagram.com/${shopInstagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-neutral-400 hover:text-white transition font-mono"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>@{shopInstagram}</span>
              </a>
            )}

            {shopAddress && (
              <span className="hidden md:inline text-neutral-500">
                {shopAddress}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
