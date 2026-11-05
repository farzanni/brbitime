"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Phone,
  User,
  Gift,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Scissors,
  Lock,
} from "lucide-react";
import {
  getSavedCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/customerCache";
import { normalizeDigits } from "@/lib/booking";
import { registerCustomer } from "./actions";
import { parseBirthday } from "@/lib/birthday";
import BirthdayPicker from "./BirthdayPicker";

interface Props {
  onProfileLoaded?: (profile: CustomerProfile) => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

function ModalContent({
  profile,
  onClose,
  onProfileLoaded,
}: {
  profile: CustomerProfile;
  onClose: () => void;
  onProfileLoaded?: (profile: CustomerProfile) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phoneInput, setPhoneInput] = useState(profile.phone || "");
  const [nameInput, setNameInput] = useState(profile.name || "");
  const [birthdayInput, setBirthdayInput] = useState(profile.birthday || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeDigits(phoneInput);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setErrorMsg("لطفاً شماره موبایل ۱۱ رقمی معتبر (مثل ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }
    setErrorMsg("");
    setPhoneInput(cleanPhone);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim().length < 2) {
      setErrorMsg("لطفاً نام و نام خانوادگی را وارد کنید.");
      return;
    }
    setErrorMsg("");
    setStep(3);
  };

  const handleCompleteSubscription = () => {
    const cleanPhone = normalizeDigits(phoneInput);
    const cleanName = nameInput.trim();
    const cleanBirthday = profile.birthday || normalizeDigits(birthdayInput.trim());

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
      if (onProfileLoaded) onProfileLoaded(updated);

      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        dir="rtl"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 shadow-2xl"
      >
        {/* Header & Steps */}
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-white" />
            <span className="text-xs font-bold text-white">
              مشخصات نوبت
            </span>
          </div>

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
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Phone */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-4">
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-neutral-300" />
                <label htmlFor="modal-phone" className="text-xs font-bold text-white">
                  شماره موبایل
                </label>
              </div>
              <input
                id="modal-phone"
                required
                autoFocus
                type="tel"
                dir="ltr"
                inputMode="numeric"
                placeholder="09123456789"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-left font-mono text-sm text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white p-3 font-bold text-xs text-black hover:bg-neutral-200 active:scale-[0.99] transition"
            >
              <span>مرحله بعد</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </form>
        )}

        {/* STEP 2: Name */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="space-y-4">
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-neutral-300" />
                <label htmlFor="modal-name" className="text-xs font-bold text-white">
                  نام و نام خانوادگی
                </label>
              </div>
              <input
                id="modal-name"
                required
                autoFocus
                type="text"
                placeholder="مثال: علی رضایی"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-neutral-400 hover:text-white transition"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white p-3 font-bold text-xs text-black hover:bg-neutral-200 active:scale-[0.99] transition"
              >
                <span>مرحله بعد</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Birthday */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-neutral-300" />
                <span className="text-xs font-bold text-white">
                  تاریخ تولد (اختیاری)
                </span>
              </div>
              <span className="text-[10px] text-purple-300 font-semibold">
                ۵۰٪ تخفیف هفته تولد
              </span>
            </div>

            {profile.birthday ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-right space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">ثبت‌شده:</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                    <Lock className="h-3 w-3" />
                    قفل شده
                  </span>
                </div>
                <p className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-purple-400" />
                  {parseBirthday(profile.birthday)?.formatted || profile.birthday}
                </p>
              </div>
            ) : (
              <BirthdayPicker
                value={birthdayInput}
                onChange={(val) => setBirthdayInput(val)}
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-neutral-400 hover:text-white transition"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCompleteSubscription}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white p-3 font-bold text-xs text-black hover:bg-neutral-200 transition disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isPending ? "در حال ثبت..." : "تأیید و ذخیره"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerOnboardingModal({
  onProfileLoaded,
  isOpenExternal,
  onCloseExternal,
}: Props) {
  const profile = getSavedCustomerProfile();

  if (!isOpenExternal) return null;

  return (
    <ModalContent
      key={profile.phone || "new"}
      profile={profile}
      onClose={() => {
        if (onCloseExternal) onCloseExternal();
      }}
      onProfileLoaded={onProfileLoaded}
    />
  );
}
