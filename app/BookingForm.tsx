"use client";

import { useEffect, useState, useTransition } from "react";
import { DayPicker, faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { bookAppointment } from "./actions";
import { SERVICES, TIME_SLOTS, normalizeDigits } from "@/lib/booking";
import {
  getSavedCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/customerCache";
import {
  Calendar,
  Scissors,
  User,
  Gift,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { checkBirthdayStatus } from "@/lib/birthday";
import CustomerOnboardingModal from "./CustomerOnboardingModal";
import BirthdayPicker from "./BirthdayPicker";

export default function BookingForm({ minDate }: { minDate: string }) {
  const [selectedService, setSelectedService] = useState("haircut");
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availability, setAvailability] = useState<{
    date: string;
    times: string[];
  }>({ date: "", times: [] });
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Customer state
  const [profile, setProfile] = useState<CustomerProfile>(() => getSavedCustomerProfile());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Unregistered inline customer inputs
  const [inputName, setInputName] = useState("");
  const [inputPhone, setInputPhone] = useState("");
  const [inputBirthday, setInputBirthday] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [formError, setFormError] = useState("");

  const hasSavedProfile = Boolean(profile.name && profile.phone);

  const handleProfileLoaded = (updated: CustomerProfile) => {
    setProfile(updated);
  };

  const bookedTimes = availability.date === date ? availability.times : [];

  useEffect(() => {
    if (!date) return;

    const controller = new AbortController();

    async function loadAvailability() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/availability?date=${encodeURIComponent(date)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) return;

        const data = await response.json();
        setAvailability({ date, times: data.bookedTimes });
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [date]);

  const activeBirthday = hasSavedProfile ? profile.birthday : inputBirthday;
  const birthdayStatus = activeBirthday ? checkBirthdayStatus(activeBirthday, date || undefined) : null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const nameToUse = hasSavedProfile ? profile.name : inputName.trim();
    const phoneToUse = normalizeDigits(hasSavedProfile ? profile.phone : inputPhone.trim());
    const birthdayToUse = (hasSavedProfile ? profile.birthday : inputBirthday.trim()) || "";

    if (!selectedService) {
      setFormError("لطفاً یک خدمت را انتخاب کنید.");
      return;
    }
    if (!date) {
      setFormError("لطفاً یک روز را انتخاب کنید.");
      return;
    }
    if (!selectedTime) {
      setFormError("لطفاً ساعت نوبت را انتخاب کنید.");
      return;
    }
    if (nameToUse.length < 2) {
      setFormError("لطفاً نام و نام خانوادگی را وارد کنید.");
      return;
    }
    if (!/^09\d{9}$/.test(phoneToUse)) {
      setFormError("لطفاً شماره موبایل ۱۱ رقمی معتبر (مثل ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    // Save profile locally for future visits
    const updatedProfile: CustomerProfile = {
      name: nameToUse,
      phone: phoneToUse,
      birthday: birthdayToUse,
      isSubscribed: true,
    };
    saveCustomerProfile(updatedProfile);
    setProfile(updatedProfile);

    const formData = new FormData();
    formData.set("service", selectedService);
    formData.set("date", date);
    formData.set("time", selectedTime);
    formData.set("name", nameToUse);
    formData.set("phone", phoneToUse);
    formData.set("birthday", birthdayToUse);

    startTransition(async () => {
      await bookAppointment(formData);
    });
  };

  return (
    <>
      <CustomerOnboardingModal
        onProfileLoaded={handleProfileLoaded}
        isOpenExternal={isModalOpen}
        onCloseExternal={() => setIsModalOpen(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-[#0c0c0c]/90 p-5 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-8"
      >
        {/* 1. Service Selection */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            <Scissors className="h-4 w-4 text-white" />
            <h2 className="text-sm font-bold text-white">۱. انتخاب خدمت</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <label
                  key={service.id}
                  className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-white bg-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="service"
                      value={service.id}
                      checked={isSelected}
                      onChange={() => setSelectedService(service.id)}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                        isSelected ? "border-white" : "border-neutral-600"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{service.name}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {service.duration}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-white">
                    {service.price}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 2. Date & Time Selection (Side by Side on Desktop) */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            <Calendar className="h-4 w-4 text-white" />
            <h2 className="text-sm font-bold text-white">۲. روز و ساعت نوبت</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Calendar */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <DayPicker
                mode="single"
                locale={faIR}
                dir="rtl"
                selected={selectedDate}
                onSelect={(day) => {
                  if (!day) return;
                  setSelectedDate(day);
                  const year = day.getFullYear();
                  const month = String(day.getMonth() + 1).padStart(2, "0");
                  const dayNumber = String(day.getDate()).padStart(2, "0");
                  setDate(`${year}-${month}-${dayNumber}`);
                  setSelectedTime("");
                }}
                disabled={{
                  before: new Date(`${minDate}T00:00:00`),
                }}
              />
            </div>

            {/* Time Slots */}
            <div className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white">
                  {selectedDate
                    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }).format(selectedDate)
                    : "انتخاب ساعت"}
                </span>
                {loading && (
                  <span className="text-[11px] text-neutral-400 font-mono">
                    در حال بررسی...
                  </span>
                )}
              </div>

              {!date ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-neutral-500">
                  ابتدا از تقویم روز مورد نظر را انتخاب کنید.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIME_SLOTS.map((time) => {
                    const booked = bookedTimes.includes(time);
                    const isSelected = selectedTime === time;

                    return (
                      <label
                        key={time}
                        className={booked ? "cursor-not-allowed opacity-30" : "cursor-pointer"}
                      >
                        <input
                          disabled={booked || loading}
                          type="radio"
                          name="time"
                          value={time}
                          checked={isSelected}
                          onChange={() => setSelectedTime(time)}
                          className="sr-only"
                        />
                        <div
                          className={`flex min-h-[44px] items-center justify-center rounded-xl border p-2.5 font-mono text-xs transition-all ${
                            isSelected
                              ? "border-white bg-white font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                              : booked
                              ? "border-white/5 bg-transparent text-neutral-600 line-through"
                              : "border-white/10 bg-white/[0.03] text-neutral-200 hover:border-white/30 hover:bg-white/[0.06]"
                          }`}
                        >
                          {time}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Customer Info */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            <User className="h-4 w-4 text-white" />
            <h2 className="text-sm font-bold text-white">۳. مشخصات شما</h2>
          </div>

          {hasSavedProfile ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span className="text-sm font-bold text-white">{profile.name}</span>
                  <span className="font-mono text-xs text-neutral-400" dir="ltr">
                    ({profile.phone})
                  </span>
                </div>

                {birthdayStatus?.discountEligible && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-purple-300">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                    <span>۵۰٪ تخفیف هفته تولد برای این نوبت فعال است!</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-neutral-300 hover:text-white underline transition"
              >
                تغییر مشخصات
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-name" className="block text-xs font-medium text-neutral-300 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    id="customer-name"
                    required
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="مثال: علی رضایی"
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                </div>

                <div>
                  <label htmlFor="customer-phone" className="block text-xs font-medium text-neutral-300 mb-1">
                    شماره موبایل
                  </label>
                  <input
                    id="customer-phone"
                    required
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-left font-mono text-sm text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                </div>
              </div>

              {/* Optional Birthday for 50% discount */}
              <div className="pt-1">
                {!showBirthdayPicker ? (
                  <button
                    type="button"
                    onClick={() => setShowBirthdayPicker(true)}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
                  >
                    <Gift className="h-3.5 w-3.5 text-purple-400" />
                    <span>افزودن تاریخ تولد (۵۰٪ تخفیف هفته تولد)</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-purple-400" />
                        تاریخ تولد (اختیاری)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBirthdayPicker(false)}
                        className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                      >
                        <span>بستن</span>
                        <ChevronUp className="h-3 w-3" />
                      </button>
                    </div>
                    <BirthdayPicker
                      value={inputBirthday}
                      onChange={(val) => setInputBirthday(val)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Error Toast */}
        {formError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {formError}
          </div>
        )}

        {/* 4. Submit Button */}
        <button
          type="submit"
          disabled={!selectedDate || !selectedTime || isPending}
          className="flex w-full items-center justify-center rounded-2xl bg-white py-4 text-sm font-bold text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <span>
            {isPending
              ? "در حال ثبت رزرو..."
              : "رزرو وقت و دریافت نوبت"}
          </span>
        </button>
      </form>
    </>
  );
}
