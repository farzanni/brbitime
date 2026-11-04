import BrandLogo from "./BrandLogo";
import { MapPin, Clock, ShieldCheck, ArrowDown, Scissors, Sparkles } from "lucide-react";

export default function HeroSection({
  name,
  tagline,
  address,
}: {
  name: string;
  tagline: string;
  address: string;
  phone?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-[#070707] shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
      {/* Background Photography with Luxury Obsidian Marble Filter */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80"
          alt="Muu Cut Salon Interior"
          className="h-full w-full object-cover object-center opacity-30 filter grayscale contrast-125 scale-105"
          loading="eager"
        />
        {/* Deep dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-[#070707]/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#070707]/60 to-[#070707]" />
      </div>

      <div className="relative z-10 px-6 py-14 text-center sm:py-20 lg:px-12">
        {/* Brand Logo Emblem */}
        <div className="mx-auto mb-6 flex justify-center">
          <div className="rounded-2xl border border-white/20 bg-black/60 p-3.5 shadow-[0_0_40px_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <BrandLogo size="lg" />
          </div>
        </div>

        {/* Brand Tagline Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-mono tracking-widest text-neutral-300 backdrop-blur-md">
          <Sparkles className="h-3 w-3 text-white" />
          <span>HAUTE COIFFURE & BARBER ATELIER</span>
        </div>

        {/* Big Brand Title */}
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl text-white">
          {name}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm leading-6 text-neutral-300">
          {tagline} — تجربه‌ای متمایز از پیرایش حرفه‌ای، آنالیز ساختار صورت و استایل اختصاصی در محیطی آرام و مدرن.
        </p>

        {/* Hero Actions (Fast Reservation CTA as requested) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#booking"
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs sm:text-sm font-extrabold text-black shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-neutral-200 active:scale-[0.98] transition"
          >
            <Scissors className="h-4 w-4" />
            <span>رزرو سریع وقت آنلاین</span>
          </a>

          <a
            href="#timeline"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-xs sm:text-sm font-semibold text-neutral-300 hover:border-white/30 hover:text-white transition backdrop-blur-md"
          >
            <span>مشاهده رویدادها و تخفیف‌ها</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Feature Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[11px] text-neutral-400">
          {address && (
            <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/50 px-3 py-1.5 backdrop-blur-md">
              <MapPin className="h-3 w-3 text-neutral-300" />
              <span>{address}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/50 px-3 py-1.5 backdrop-blur-md font-mono">
            <Clock className="h-3 w-3 text-neutral-300" />
            <span>۱۵:۰۰ الی ۲۱:۰۰</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/50 px-3 py-1.5 backdrop-blur-md">
            <ShieldCheck className="h-3 w-3 text-white" />
            <span>استریل اختصاصی و VIP</span>
          </span>
        </div>
      </div>
    </section>
  );
}
