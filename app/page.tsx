import { Suspense } from "react";
import BookingForm from "./BookingForm";
import ErrorBanner from "./ErrorBanner";
import ProductsSection from "./ProductsSection";
import EventsSection from "./EventsSection";
import GallerySection from "./GallerySection";
import HeroSection from "./HeroSection";
import GlassyHeader from "./GlassyHeader";
import { iranToday } from "@/lib/booking";
import { getShopConfig } from "@/lib/shop";
import { Phone, Camera, MapPin } from "lucide-react";

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
        {/* 4. Booking Section (Center Stage) */}
        <section id="booking" className="scroll-mt-20">
          <Suspense fallback={null}>
            <ErrorBanner />
          </Suspense>

          <BookingForm minDate={iranToday()} />
        </section>

        {/* 5. Clean Gallery */}
        <section id="gallery">
          <GallerySection gallery={shop.gallery} />
        </section>

        {/* 6. Products & Events in a balanced 2-column grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProductsSection products={shop.products} />
          <EventsSection events={shop.events} />
        </section>

        {/* 7. Clean Minimalist Footer */}
        <footer className="border-t border-white/10 pt-8 pb-10 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
          <p className="font-mono">
            © {new Date().getFullYear()} {shop.name}
          </p>

          <div className="flex items-center gap-5">
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
