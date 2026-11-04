import Link from "next/link";
import Image from "next/image";
import BrandLogo from "./BrandLogo";
import { MapPin, Clock, ShieldCheck, ArrowDown, Scissors, Sparkles, User } from "lucide-react";

export default function HeroSection({
  address,
}: {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
}) {
  return (
    <section className="relative w-full overflow-hidden pt-24 pb-14 sm:pt-32 sm:pb-20">
      {/* Full-width Faded Background Image — seamless, no box boundary */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=85"
          alt="سالن تخصصی مو کات"
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover object-center opacity-40 filter grayscale contrast-125 scale-105 pointer-events-none select-none"
        />
        {/* Gradients to fade out seamlessly into the deep black page background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/70 via-[#050505]/50 to-[#050505]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#050505_85%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Brand Logo Emblem — Pure floating chrome, no box */}
        <div className="mx-auto mb-4 flex justify-center">
          <BrandLogo size="lg" />
        </div>

        {/* Brand Tagline */}
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-neutral-400">
          <Sparkles className="h-3 w-3 text-neutral-300" />
          <span>MOO CUT BARBER ATELIER</span>
        </div>

        {/* Big Brand Title */}
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight">
          مجموعه سالن تخصصی مو کات
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm leading-6 text-neutral-300">
          تجربه‌ای متمایز از پیرایش حرفه‌ای، استایل اختصاصی، آنالیز فرم چهره و مراقبت تخصصی مو و ریش در محیطی مدرن و لوکس.
        </p>

        {/* Hero Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#booking"
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs sm:text-sm font-extrabold text-black shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-neutral-200 active:scale-[0.98] transition"
          >
            <Scissors className="h-4 w-4" />
            <span>رزرو سریع وقت آنلاین</span>
          </a>

          <Link
            href="/my"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/15 transition backdrop-blur-md active:scale-95"
          >
            <User className="h-4 w-4" />
            <span>پیگیری و نوبت‌های من</span>
          </Link>

          <a
            href="#timeline"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-xs sm:text-sm font-semibold text-neutral-300 hover:border-white/30 hover:text-white transition backdrop-blur-md"
          >
            <span>مشاهده رویدادها و تخفیف‌ها</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Feature Highlights — clean inline text with dots, NO boxes */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-400">
          {address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-neutral-300" />
              <span>{address}</span>
            </span>
          )}
          <span className="hidden sm:inline text-white/20">•</span>
          <span className="flex items-center gap-1.5 font-mono">
            <Clock className="h-3.5 w-3.5 text-neutral-300" />
            <span>۱۵:۰۰ الی ۲۱:۰۰</span>
          </span>
          <span className="hidden sm:inline text-white/20">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-white" />
            <span>استریل اختصاصی و VIP</span>
          </span>
        </div>
      </div>
    </section>
  );
}
