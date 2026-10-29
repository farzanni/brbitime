import { Suspense } from "react";
import BookingForm from "./BookingForm";
import ErrorBanner from "./ErrorBanner";
import ProductsSection from "./ProductsSection";
import EventsSection from "./EventsSection";
import { iranToday } from "@/lib/booking";
import { getShopConfig } from "@/lib/shop";
import { Scissors, MapPin, Phone, Camera, Clock, ShieldCheck } from "lucide-react";

/**
 * Statically rendered + revalidated every 600s so Vercel serves it
 * straight from the edge cache, keeping TTFB minimal.
 */
export const revalidate = 600;

export default async function Home() {
  const shop = await getShopConfig();

  return (
    <main dir="rtl" className="min-h-screen bg-neutral-950 text-white selection:bg-amber-400 selection:text-neutral-950">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-25">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-4 py-1.5 text-xs text-neutral-300 backdrop-blur-md">
            <Scissors className="h-3.5 w-3.5 text-amber-400" />
            <span>نوبت‌دهی آنلاین و خدمات تخصصی</span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl text-white">
            {shop.name}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-400">
            خدمات موردنظرت رو انتخاب کن، ساعت دلخواهت رو بردار و بدون معطلی اصلاح شو.
          </p>

          {/* Quick info bar */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
            {shop.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                {shop.address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              همه‌روزه از ساعت ۱۵:۰۰ تا ۲۱:۰۰
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              تضمین کیفیت و بهداشت ابزار
            </span>
          </div>
        </header>

        {/* 3-Column Responsive Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Right Column in RTL: Products */}
          <div className="order-2 rounded-3xl border border-neutral-800/80 bg-neutral-900/30 p-5 backdrop-blur-md lg:order-1 lg:col-span-3">
            <ProductsSection products={shop.products} />
          </div>

          {/* Center Column: Booking Form */}
          <div className="order-1 lg:order-2 lg:col-span-6">
            <Suspense fallback={null}>
              <ErrorBanner />
            </Suspense>

            <BookingForm minDate={iranToday()} />
          </div>

          {/* Left Column in RTL: Events & Discounts */}
          <div className="order-3 rounded-3xl border border-neutral-800/80 bg-neutral-900/30 p-5 backdrop-blur-md lg:order-3 lg:col-span-3">
            <EventsSection events={shop.events} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-900 pt-8 text-xs text-neutral-500">
          <p>© {shop.name} — تمامی حقوق محفوظ است.</p>

          <div className="flex items-center gap-6">
            <a href={`tel:${shop.phone}`} className="flex items-center gap-1 hover:text-white transition">
              <Phone className="h-3.5 w-3.5 text-amber-400" />
              <span>{shop.phone}</span>
            </a>

            {shop.instagram && (
              <a
                href={`https://instagram.com/${shop.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-white transition"
              >
                <Camera className="h-3.5 w-3.5 text-pink-400" />
                <span>@{shop.instagram}</span>
              </a>
            )}

            <a href="/admin" className="text-neutral-600 hover:text-neutral-400 transition">
              پنل آرایشگر
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
