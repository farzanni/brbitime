"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Phone,
  User,
  Gift,
  CheckCircle2,
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Scissors,
} from "lucide-react";
import {
  getSavedCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/customerCache";
import { normalizeDigits } from "@/lib/booking";
import { registerCustomer } from "./actions";

interface Props {
  onProfileLoaded?: (profile: CustomerProfile) => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export default function CustomerOnboardingModal({
  onProfileLoaded,
  isOpenExternal,
  onCloseExternal,
}: Props) {
  const [profile, setProfile] = useState<CustomerProfile>(() => getSavedCustomerProfile());
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isInternalOpen, setIsInternalOpen] = useState(false);
  const [showGreetingToast, setShowGreetingToast] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [birthdayInput, setBirthdayInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const isModalOpen = isOpenExternal !== undefined ? isOpenExternal : isInternalOpen;


  // On client mount: check if subscribed or needs onboarding
  useEffect(() => {
    const current = getSavedCustomerProfile();
    if (current.isSubscribed && current.name && current.phone) {
      const showTimer = setTimeout(() => setShowGreetingToast(true), 0);
      const hideTimer = setTimeout(() => setShowGreetingToast(false), 7000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      const openTimer = setTimeout(() => setIsInternalOpen(true), 0);
      return () => clearTimeout(openTimer);
    }
  }, []);

  // Update inputs whenever modal opens
  const openModalForEditing = () => {
    setPhoneInput(profile.phone || "");
    setNameInput(profile.name || "");
    setBirthdayInput(profile.birthday || "");
    setStep(1);
    setIsInternalOpen(true);
  };

  const handleClose = () => {
    setIsInternalOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  // Keyboard accessibility: Close on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsInternalOpen(false);
        if (onCloseExternal) onCloseExternal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, onCloseExternal]);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeDigits(phoneInput);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setErrorMsg("لطفاً شماره موبایل معتبر ۱۱ رقمی (مثل ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }
    setErrorMsg("");
    setPhoneInput(cleanPhone);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim().length < 2) {
      setErrorMsg("لطفاً نام و نام خانوادگی خود را کامل وارد کنید.");
      return;
    }
    setErrorMsg("");
    setStep(3);
  };

  const handleCompleteSubscription = () => {
    const cleanPhone = normalizeDigits(phoneInput);
    const cleanName = nameInput.trim();
    const cleanBirthday = normalizeDigits(birthdayInput.trim());

    startTransition(async () => {
      const formData = new FormData();
      formData.set("phone", cleanPhone);
      formData.set("name", cleanName);
      formData.set("birthday", cleanBirthday);

      await registerCustomer(formData);

      const updated: CustomerProfile = {
        phone: cleanPhone,
        name: cleanName,
        birthday: cleanBirthday,
        isSubscribed: true,
      };

      saveCustomerProfile(updated);
      setProfile(updated);
      if (onProfileLoaded) onProfileLoaded(updated);

      handleClose();

      setShowGreetingToast(true);
      setTimeout(() => setShowGreetingToast(false), 6000);
    });
  };

  return (
    <>
      {/* 1. Small Greeting Popup (Only if subscribed) */}
      {showGreetingToast && profile.name && (
        <aside
          aria-live="polite"
          className="fixed top-5 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-white/20 bg-[#0a0a0a]/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white font-bold">
              👋
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">خوش آمدید</p>
              <h2 className="text-xs font-bold text-white">
                سلام {profile.name} عزیز
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowGreetingToast(false);
                openModalForEditing();
              }}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:border-white/40 hover:bg-white/10 transition"
            >
              ویرایش
            </button>
            <button
              onClick={() => setShowGreetingToast(false)}
              className="rounded-lg p-1 text-neutral-500 hover:text-white transition"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. Onboarding Modal (Phone -> Name -> Birthday Discount) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            dir="rtl"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.12] bg-[#090909] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] sm:p-7"
          >
            {/* Top progress indicator */}
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white">
                  <Scissors className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-mono tracking-wider text-neutral-300 uppercase">
                  MUU CUT • CLUB
                </span>
              </div>

              {/* Steps: 1, 2, 3 */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    step >= 1 ? "bg-white text-black" : "bg-white/10 text-neutral-500"
                  }`}
                >
                  ۱
                </span>
                <span className="text-neutral-700">──</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    step >= 2 ? "bg-white text-black" : "bg-white/10 text-neutral-500"
                  }`}
                >
                  ۲
                </span>
                <span className="text-neutral-700">──</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    step === 3 ? "bg-white text-black" : "bg-white/10 text-neutral-500"
                  }`}
                >
                  ۳
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            {/* STEP 1: Phone Number */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="space-y-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-bold text-white">
                      شماره موبایل
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-5">
                    جهت شناسایی در مراجعات بعدی و دریافت پیامک یادآوری زمان نوبت
                  </p>
                </div>

                <div>
                  <input
                    required
                    autoFocus
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="09123456789"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-[#0c0c0c] p-3.5 text-left font-mono text-sm text-white placeholder-neutral-600 outline-none transition focus:border-white focus:ring-1 focus:ring-white"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white p-3.5 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition hover:bg-neutral-200 active:scale-[0.99]"
                >
                  <span className="text-xs">مرحله بعد</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </form>
            )}

            {/* STEP 2: Name */}
            {step === 2 && (
              <form onSubmit={handleNextStep2} className="space-y-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-bold text-white">
                      نام و نام خانوادگی
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-5">
                    جهت ثبت در دفتر رزرو سالن و نوبت‌دهی اختصاصی
                  </p>
                </div>

                <div>
                  <input
                    required
                    autoFocus
                    type="text"
                    placeholder="مثال: علی رضایی"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-[#0c0c0c] p-3.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-white focus:ring-1 focus:ring-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-xs text-neutral-400 hover:text-white transition"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white p-3.5 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition hover:bg-neutral-200 active:scale-[0.99]"
                  >
                    <span className="text-xs">مرحله بعد</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Birthday + Discount Announcement */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-bold text-white">
                      تاریخ تولد
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-5">
                    ثبت تاریخ تولد اختیاری است اما هدیه سالن را به همراه دارد.
                  </p>
                </div>

                {/* Birthday Promotion Highlight Card */}
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-xs leading-6 text-neutral-300">
                  <Sparkles className="h-4 w-4 shrink-0 text-white mt-0.5" />
                  <div>
                    <strong className="block text-white font-bold">
                      🎁 هدیه سالگرد تولد:
                    </strong>
                    با ثبت تاریخ تولد، در هفته تولدتان از ۵۰٪ تخفیف خدمات سالن و سرویس VIP هدیه بهره‌مند می‌شوید.
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="مثال: ۱۳۷۴/۰۶/۱۵ یا روز و ماه"
                    value={birthdayInput}
                    onChange={(e) => setBirthdayInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-[#0c0c0c] p-3.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-white focus:ring-1 focus:ring-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-xs text-neutral-400 hover:text-white transition"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCompleteSubscription}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white p-3.5 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition hover:bg-neutral-200 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">{isPending ? "در حال ثبت..." : "تأیید و ورود"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
