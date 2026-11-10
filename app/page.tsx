import { Suspense } from "react";
import Link from "next/link";
import BookingForm from "./BookingForm";
import ErrorBanner from "./ErrorBanner";
import ProductsSection from "./ProductsSection";
import EventsSection from "./EventsSection";
import HeroSection from "./HeroSection";
import GlassyHeader from "./GlassyHeader";
import { iranToday } from "@/lib/booking";
import { getShopConfig } from "@/lib/shop";
import { Phone, Camera, MapPin, ArrowLeft } from "lucide-react";

/**
 * Statically rendered + revalidated every 600s so Vercel serves it
 * straight from the edge cache, keeping TTFB minimal.
 */
export const revalidate = 600;

export default async function Home() {
  const shop = await getShopConfig();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#070707] text-white selection:bg-white selection:text-black"
    >
      {/* 1. Header on scroll */}
      <GlassyHeader phone={shop.phone} shopName={shop.name} />

      {/* 2. Clean Hero */}
      <HeroSection
        name={shop.name}
        tagline={shop.tagline}
        address={shop.address}
        mapUrl={shop.mapUrl}
        phone={shop.phone}
      />

      {/* 3. Subtle background depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pb-20 sm:px-6 space-y-16">
        {/* 1. Events and Discounts Section (First) */}
        <section id="discounts" className="scroll-mt-20">
          <EventsSection events={shop.events} />
        </section>

        {/* 2. Products Section (Then Products) */}
        <section id="products" className="scroll-mt-20">
          <ProductsSection products={shop.products} />
        </section>

        {/* 3. Taking a time / Booking Section (Then Taking a time) */}
        <section id="booking" className="scroll-mt-20">
          <Suspense fallback={null}>
            <ErrorBanner />
          </Suspense>

          <BookingForm minDate={iranToday()} />
        </section>

        {/* 4. Link to Haircuts Gallery Page */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] p-6 text-center sm:text-right flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Camera className="h-4 w-4 text-neutral-300" />
              <span>ژورنال و گالری مدل مو</span>
            </h3>
            <p className="text-xs text-neutral-400">
              مشاهده ده‌ها نمونه کار فید، کراپ، استایل کلاسیک و ریش در صفحه اختصاصی گالری
            </p>
          </div>
          <Link
            href="/gallery"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20 hover:border-white/35 transition active:scale-95"
          >
            <span>مشاهده گالری مدل‌ها</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 5. Clean Minimalist Footer */}
        <footer className="border-t border-white/10 pt-8 pb-10 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
          <p className="font-mono">
            © {new Date().getFullYear()} {shop.name}
          </p>

          <div className="flex items-center gap-5">
            <Link
              href="/gallery"
              className="text-neutral-400 hover:text-white transition"
            >
              گالری مدل مو
            </Link>
            <a
              href={`tel:${shop.phone}`}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="font-mono">{shop.phone}</span>
            </a>

            {shop.instagram && (
              <a
                href={`https://instagram.com/${shop.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="font-mono">@{shop.instagram}</span>
              </a>
            )}

            {shop.mapUrl && (
              <a
                href={shop.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>مسیریابی نقشه</span>
              </a>
            )}

            <a
              href="/admin"
              className="text-neutral-500 hover:text-neutral-300 transition"
            >
              ورود آرایشگر
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
