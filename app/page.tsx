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
import { Phone, Camera } from "lucide-react";

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
      className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black"
    >
      {/* 1. Floating Glassy Navbar on Scroll */}
      <GlassyHeader phone={shop.phone} shopName={shop.name} />

      {/* 2. High-end Marble Background Light Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.08] via-white/[0.01] to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 space-y-12">
        {/* 3. Classy Landing Hero Section */}
        <HeroSection
          name={shop.name}
          tagline={shop.tagline}
          address={shop.address}
          phone={shop.phone}
        />

        {/* 4. Main Content Grid (Mobile First: Timeline -> Products -> Booking) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Timeline of Events (Mobile: 1st under hero / Desktop: Left column) */}
          <div
            id="timeline"
            className="order-1 scroll-mt-20 rounded-3xl border border-white/[0.08] bg-[#080808]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl lg:order-3 lg:col-span-3"
          >
            <EventsSection events={shop.events} />
          </div>

          {/* Products Showcase (Mobile: 2nd under hero / Desktop: Right column) */}
          <div className="order-2 rounded-3xl border border-white/[0.08] bg-[#080808]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl lg:order-1 lg:col-span-3">
            <ProductsSection products={shop.products} />
          </div>

          {/* Booking Core (Mobile: 3rd / Desktop: Center column) */}
          <div
            id="booking"
            className="order-3 scroll-mt-20 lg:order-2 lg:col-span-6"
          >
            <Suspense fallback={null}>
              <ErrorBanner />
            </Suspense>

            <BookingForm minDate={iranToday()} />
          </div>
        </div>

        {/* 5. Photo Gallery Section of Barbershop */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#080808]/90 p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <GallerySection gallery={shop.gallery} />
        </div>

        {/* 6. Minimalist Luxury Footer */}
        <footer className="border-t border-white/[0.08] pt-8 pb-12 flex flex-wrap items-center justify-between gap-4 text-[11px] text-neutral-500">
          <p className="font-mono">
            © {new Date().getFullYear()} {shop.name} — ALL RIGHTS RESERVED.
          </p>

          <div className="flex items-center gap-6">
            <a
              href={`tel:${shop.phone}`}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
            >
              <Phone className="h-3.5 w-3.5 text-neutral-300" />
              <span className="font-mono">{shop.phone}</span>
            </a>

            {shop.instagram && (
              <a
                href={`https://instagram.com/${shop.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
              >
                <Camera className="h-3.5 w-3.5 text-neutral-300" />
                <span className="font-mono">@{shop.instagram}</span>
              </a>
            )}

            <a
              href="/admin"
              className="rounded-lg border border-white/10 px-2.5 py-1 text-neutral-400 hover:border-white/30 hover:text-white transition"
            >
              ورود آرایشگر
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
