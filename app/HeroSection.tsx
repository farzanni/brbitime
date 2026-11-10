import Link from "next/link";
import Image from "next/image";
import BrandLogo from "./BrandLogo";
import { MapPin, Scissors, User, ShoppingBag, Tag, Camera } from "lucide-react";

export default function HeroSection({
  name,
  tagline,
  address,
  mapUrl,
}: {
  name?: string;
  tagline?: string;
  address?: string;
  mapUrl?: string;
  phone?: string;
}) {
  return (
    <section className="relative w-full overflow-hidden pt-20 pb-12 sm:pt-28 sm:pb-16">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=85"
          alt={name || "سالن مو کات"}
          fill
          priority
          sizes="100vw"
          quality={75}
          className="object-cover object-center opacity-70 contrast-105 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070707]/80 via-black/45 to-[#070707]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
        {/* Brand Logo Emblem */}
        <div className="mx-auto mb-4 flex justify-center">
          <BrandLogo size="lg" priority />
        </div>

        {/* Brand Title */}
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-white leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
          {name || "مو کات"}
        </h1>

        {/* Short, crisp tagline */}
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300">
          {tagline || "پیرایش و استایل موی آقایان"}
        </p>

        {/* Clean Actions: Booking, Haircuts Gallery, Discounts, Products, My appointments */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <a
            href="#booking"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:bg-neutral-200 active:scale-[0.98] transition"
          >
            <Scissors className="h-4 w-4" />
            <span>رزرو وقت</span>
          </a>

          <Link
            href="/gallery"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-medium text-white hover:bg-white/20 hover:border-white/35 transition backdrop-blur-md active:scale-95 shadow-sm"
          >
            <Camera className="h-4 w-4 text-neutral-300" />
            <span>گالری مدل مو</span>
          </Link>

          <a
            href="#discounts"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-medium text-white hover:bg-white/15 transition backdrop-blur-md active:scale-95"
          >
            <Tag className="h-4 w-4" />
            <span>تخفیف‌ها</span>
          </a>

          <a
            href="#products"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-medium text-white hover:bg-white/15 transition backdrop-blur-md active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>محصولات</span>
          </a>

          <Link
            href="/my"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-medium text-white hover:bg-white/15 transition backdrop-blur-md active:scale-95"
          >
            <User className="h-4 w-4" />
            <span>نوبت‌های من</span>
          </Link>
        </div>

        {/* Location */}
        {address && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-400">
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 transition hover:text-white"
                title="مسیریابی روی نقشه گوگل"
              >
                <MapPin className="h-3.5 w-3.5 text-neutral-300 transition group-hover:text-amber-400" />
                <span className="underline decoration-white/30 underline-offset-4 group-hover:decoration-white">
                  {address}
                </span>
              </a>
            ) : (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-neutral-300" />
                <span>{address}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
