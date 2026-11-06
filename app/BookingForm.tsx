"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DayPicker, faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { bookAppointment } from "./actions";
import {
  SERVICES,
  cleanIranPhone,
  isHaircutService,
  getSlotsForService,
  getIranDateTime,
  formatPersianDate,
  type BookedAppointmentInfo,
  type UnavailableSlotInfo,
  type SlotOption,
} from "@/lib/booking";
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
  ChevronRight,
  ChevronLeft,
  Ban,
  Info,
} from "lucide-react";
import { checkBirthdayStatus } from "@/lib/birthday";
import CustomerOnboardingModal from "./CustomerOnboardingModal";
import BirthdayPicker from "./BirthdayPicker";
import { trackClientEvent } from "@/lib/analytics-client";

function DayPickerChevron({
  orientation,
  className,
}: {
  orientation?: "left" | "right" | "up" | "down";
  className?: string;
}) {
  if (orientation === "right") {
    return <ChevronRight className={`h-4 w-4 shrink-0 ${className ?? ""}`} />;
  }
  return <ChevronLeft className={`h-4 w-4 shrink-0 ${className ?? ""}`} />;
}

export default function BookingForm({ minDate }: { minDate: string }) {
  const [selectedService, setSelectedService] = useState("haircut");
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availability, setAvailability] = useState<{
    date: string;
    times: string[];
    appointments: BookedAppointmentInfo[];
    unavailable: UnavailableSlotInfo[];
    isAllDayUnavailable: boolean;
    allDayNote: string | null;
  }>({
    date: "",
    times: [],
    appointments: [],
    unavailable: [],
    isAllDayUnavailable: false,
    allDayNote: null,
  });
  const availabilityCache = useRef<
    Record<
      string,
      {
        date: string;
        times: string[];
        appointments: BookedAppointmentInfo[];
        unavailable: UnavailableSlotInfo[];
        isAllDayUnavailable: boolean;
        allDayNote: string | null;
      }
    >
  >({});
  const inFlightPrefetch = useRef<Record<string, Promise<unknown> | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Customer state
  const [profile, setProfile] = useState<CustomerProfile>({
    name: "",
    phone: "",
    birthday: "",
    isSubscribed: false,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = getSavedCustomerProfile();
    if (saved.phone || saved.name) {
      setProfile(saved);
    }
  }, []);

  // Unregistered inline customer inputs
  const [inputName, setInputName] = useState("");
  const [inputPhone, setInputPhone] = useState("");
  const [inputBirthday, setInputBirthday] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [formError, setFormError] = useState("");

  const hasSavedProfile = isMounted && Boolean(profile.name && profile.phone);

  const handleProfileLoaded = (updated: CustomerProfile) => {
    setProfile(updated);
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedTime("");
    trackClientEvent("service_select", { serviceId });
  };

  // Live clock for recognizing past times in Iran timezone
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow((prev) => {
        const next = new Date();
        return next.getMinutes() !== prev.getMinutes() ? next : prev;
      });
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  const iranNowRaw = getIranDateTime(now);
  const iranMinuteKey = `${iranNowRaw.date}_${iranNowRaw.hour}_${iranNowRaw.minute}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const iranNow = useMemo(() => iranNowRaw, [iranMinuteKey]);
  const effectiveMinDate = minDate && minDate >= iranNow.date ? minDate : iranNow.date;

  const slots: SlotOption[] = useMemo(() => {
    const currentAppointments =
      availability.date === date ? availability.appointments : [];
    const currentUnavailable =
      availability.date === date ? availability.unavailable : [];
    return getSlotsForService(
      selectedService,
      currentAppointments,
      currentUnavailable,
      date,
      iranNow
    );
  }, [selectedService, availability, date, iranNow]);

  const isHaircut = isHaircutService(selectedService);
  const activeSelectedTime = slots.some(
    (s) => s.time === selectedTime && !s.isBooked && !s.isPassed && !s.isUnavailable
  )
    ? selectedTime
    : "";

  useEffect(() => {
    if (!date) return;

    if (availabilityCache.current[date]) {
      setAvailability(availabilityCache.current[date]);
      return;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      setLoading(true);

      try {
        const pendingPrefetch = inFlightPrefetch.current[date];
        if (pendingPrefetch) {
          await pendingPrefetch;
          if (availabilityCache.current[date]) {
            setAvailability(availabilityCache.current[date]);
            return;
          }
        }

        const response = await fetch(
          `/api/availability?date=${encodeURIComponent(date)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) return;

        const data = await response.json();
        const nextData = {
          date,
          times: data.bookedTimes || [],
          appointments: data.appointments || [],
          unavailable: data.unavailable || [],
          isAllDayUnavailable: Boolean(data.isAllDayUnavailable),
          allDayNote: data.allDayNote || null,
        };
        availabilityCache.current[date] = nextData;
        setAvailability(nextData);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [date]);

  useEffect(() => {
    if (
      !effectiveMinDate ||
      availabilityCache.current[effectiveMinDate] ||
      Boolean(inFlightPrefetch.current[effectiveMinDate])
    )
      return;

    const fetchPromise = fetch(
      `/api/availability?date=${encodeURIComponent(effectiveMinDate)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        availabilityCache.current[effectiveMinDate] = {
          date: effectiveMinDate,
          times: data.bookedTimes || [],
          appointments: data.appointments || [],
          unavailable: data.unavailable || [],
          isAllDayUnavailable: Boolean(data.isAllDayUnavailable),
          allDayNote: data.allDayNote || null,
        };
      })
      .catch(() => {})
      .finally(() => {
        delete inFlightPrefetch.current[effectiveMinDate];
      });

    inFlightPrefetch.current[effectiveMinDate] = fetchPromise;
  }, [effectiveMinDate]);

  const activeBirthday = hasSavedProfile ? profile.birthday : inputBirthday;
  const birthdayStatus = activeBirthday ? checkBirthdayStatus(activeBirthday, date || undefined) : null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const nameToUse = hasSavedProfile ? profile.name : inputName.trim();
    const phoneToUse = cleanIranPhone(hasSavedProfile ? profile.phone : inputPhone.trim());
    const birthdayToUse = (hasSavedProfile ? profile.birthday : inputBirthday.trim()) || "";

    if (!selectedService) {
      setFormError("لطفاً یک خدمت را انتخاب کنید.");
      return;
    }
    if (!date) {
      setFormError("لطفاً یک روز را انتخاب کنید.");
      return;
    }
    if (!activeSelectedTime) {
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
    formData.set("time", activeSelectedTime);
    formData.set("name", nameToUse);
    formData.set("phone", phoneToUse);
    formData.set("birthday", birthdayToUse);

    trackClientEvent("booking_attempt", {
      service: selectedService,
      date,
      time: activeSelectedTime,
    });

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
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="service"
                      value={service.id}
                      checked={isSelected}
                      onChange={() => handleServiceChange(service.id)}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                        isSelected ? "border-white" : "border-neutral-600"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{service.name}</p>
                      {service.duration ? (
                        <p className="mt-0.5 text-[11px] text-neutral-400">
                          {service.duration}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-white shrink-0 text-left mr-2">
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
            <div className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    تقویم نوبت‌دهی
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    روز مورد نظر خود را انتخاب کنید
                  </span>
                </div>
                {selectedDate ? (
                  <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white font-mono">
                    {formatPersianDate(selectedDate)}
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-500 font-mono">
                    انتخاب نشده
                  </span>
                )}
              </div>

              <div className="flex flex-1 items-center justify-center py-1">
                <DayPicker
                  mode="single"
                  locale={faIR}
                  dir="rtl"
                  navLayout="around"
                  startMonth={new Date(`${effectiveMinDate}T00:00:00`)}
                  selected={selectedDate}
                  onSelect={(day) => {
                    if (!day) return;
                    setSelectedDate(day);
                    const year = day.getFullYear();
                    const month = String(day.getMonth() + 1).padStart(2, "0");
                    const dayNumber = String(day.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${dayNumber}`;
                    setDate(dateStr);
                    setSelectedTime("");
                    trackClientEvent("date_select", { date: dateStr });
                  }}
                  disabled={{
                    before: new Date(`${effectiveMinDate}T00:00:00`),
                  }}
                  components={{
                    Chevron: DayPickerChevron,
                  }}
                />
              </div>

              {/* Legend Footer */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-center gap-4 text-[10px] text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white ring-2 ring-white/40" />
                  </span>
                  <span>امروز</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                  <span className="text-neutral-200 font-medium">انتخاب شده</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <span className="h-2 w-2 rounded-sm bg-neutral-800" />
                  <span>غیرقابل رزرو</span>
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    {selectedDate
                      ? formatPersianDate(selectedDate)
                      : "انتخاب ساعت"}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    {isHaircut
                      ? "نوبت‌های سر ساعت (اصلاح مو)"
                      : "نوبت‌های بعد از اصلاح (خدمات جانبی)"}
                  </span>
                </div>
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
              ) : availability.isAllDayUnavailable ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                    <Ban className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-red-300">
                      آرایشگر در این تاریخ در سالن حضور ندارد
                    </h3>
                    <p className="mt-1 text-xs text-neutral-400">
                      امکان رزرو نوبت برای این تاریخ وجود ندارد.
                    </p>
                  </div>
                  {availability.allDayNote && (
                    <div className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-neutral-200">
                      <span className="font-bold text-amber-400 block mb-1">
                        پیام آرایشگر:
                      </span>
                      <span>{availability.allDayNote}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {date === iranNow.date &&
                    slots.length > 0 &&
                    slots.every((s) => s.isBooked || s.isPassed || s.isUnavailable) && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-300">
                        تمامی نوبت‌های امروز به پایان رسیده یا رزرو شده‌اند. لطفاً روز دیگری را انتخاب کنید.
                      </div>
                    )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isSelected = activeSelectedTime === slot.time;
                      const isSlotDisabled =
                        slot.isBooked || slot.isPassed || slot.isUnavailable || loading;

                      return (
                        <label
                          key={slot.hour}
                          className={
                            isSlotDisabled
                              ? "cursor-not-allowed opacity-40"
                              : "cursor-pointer"
                          }
                        >
                          <input
                            disabled={isSlotDisabled}
                            type="radio"
                            name="time"
                            value={slot.time}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedTime(slot.time);
                              trackClientEvent("slot_select", {
                                service: selectedService,
                                date,
                                time: slot.time,
                              });
                            }}
                            className="sr-only"
                          />
                          <div
                            className={`flex min-h-[46px] flex-col items-center justify-center rounded-xl border p-2 font-mono text-xs transition-all ${
                              isSelected
                                ? "border-white bg-white font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                : slot.isUnavailable
                                ? "border-red-500/20 bg-red-500/5 text-neutral-500 line-through"
                                : slot.isBooked
                                ? "border-white/5 bg-transparent text-neutral-600 line-through"
                                : slot.isPassed
                                ? "border-white/5 bg-transparent text-neutral-600 line-through"
                                : "border-white/10 bg-white/[0.03] text-neutral-200 hover:border-white/30 hover:bg-white/[0.06]"
                            }`}
                          >
                            <span>{slot.time}</span>
                            {slot.isUnavailable ? (
                              <span className="no-underline text-[9px] text-red-400/90 font-sans mt-0.5">
                                عدم حضور
                              </span>
                            ) : slot.isBooked ? (
                              <span className="no-underline text-[9px] text-neutral-500 font-sans mt-0.5">
                                رزرو شده
                              </span>
                            ) : slot.isPassed ? (
                              <span className="no-underline text-[9px] text-neutral-500 font-sans mt-0.5">
                                زمان گذشته
                              </span>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Notes for specific blocked hours */}
                  {slots.some((s) => s.isUnavailable && s.unavailableNote) && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Info className="h-3.5 w-3.5" />
                        <span>یادداشت آرایشگر برای ساعات این روز:</span>
                      </div>
                      <div className="space-y-1">
                        {slots
                          .filter((s) => s.isUnavailable && s.unavailableNote)
                          .map((s) => (
                            <div key={s.hour} className="text-neutral-300 text-[11px] flex items-start gap-1">
                              <span className="font-mono text-amber-300 shrink-0">• ساعت {s.time}:</span>
                              <span>{s.unavailableNote}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
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
                    maxLength={80}
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
          disabled={!selectedDate || !activeSelectedTime || isPending}
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
