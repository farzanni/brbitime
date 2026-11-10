"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";
import { Phone, CalendarCheck, User, Camera } from "lucide-react";
import { trackClientEvent } from "@/lib/analytics-client";

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
      if (window.scrollY > 120) {
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
          ? "opacity-100 translate-y-0 backdrop-blur-xl bg-black/85 border-b border-white/10"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Right side: Logo & Brand Name */}
        <a href="#" className="flex items-center gap-2 group">
          <BrandLogo size="sm" />
          <span className="font-bold text-sm text-white group-hover:text-neutral-200 transition">
            {shopName}
          </span>
        </a>

        {/* Left side: Quick actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/gallery"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-neutral-300 hover:border-white/30 hover:text-white transition"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">گالری مدل مو</span>
          </Link>

          <Link
            href="/my"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-neutral-300 hover:border-white/30 hover:text-white transition"
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">نوبت‌های من</span>
          </Link>

          <a
            href={`tel:${phone}`}
            onClick={() => trackClientEvent("contact_click", { channel: "phone", location: "header" })}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-neutral-300 hover:border-white/30 hover:text-white transition"
            title="تماس مستقیم"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>

          <a
            href="#booking"
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-black hover:bg-neutral-200 active:scale-[0.98] transition"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>رزرو نوبت</span>
          </a>
        </div>
      </div>
    </header>
  );
}
