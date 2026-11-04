"use client";

import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";
import { Phone, CalendarCheck } from "lucide-react";

export default function GlassyHeader({
  phone,
  shopName,
}: {
  phone: string;
  shopName: string;
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger when user scrolls past 140px
      if (window.scrollY > 140) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      dir="rtl"
      aria-hidden={!isScrolled}
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "opacity-100 translate-y-0 backdrop-blur-2xl bg-black/85 border-b border-white/[0.12] shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Right side: Morphing logo & Brand Name */}
        <a href="#" className="flex items-center gap-2.5 group">
          <BrandLogo size="sm" />
          <span className="font-extrabold text-sm tracking-wide text-white group-hover:text-neutral-200 transition">
            {shopName}
          </span>
        </a>

        {/* Left side: Fast Action CTAs */}
        <div className="flex items-center gap-2.5">
          <a
            href={`tel:${phone}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-neutral-300 hover:border-white/30 hover:text-white transition"
            title="تماس مستقیم"
          >
            <Phone className="h-4 w-4" />
          </a>

          <a
            href="#booking"
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 font-mono text-xs font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.25)] hover:bg-neutral-200 active:scale-[0.98] transition"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>رزرو نوبت</span>
          </a>
        </div>
      </div>
    </header>
  );
}
