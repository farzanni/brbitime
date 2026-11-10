"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { bookAppointment } from "./actions";
import {
  SERVICES,
  cleanIranPhone,
  normalizeDigits,
  isHaircutService,
  getSlotsForService,
  getIranDateTime,
  formatPersianDate,
  iranToday,
  getRollingDays,
  type RollingDayInfo,
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
  Clock,
  User,
  Gift,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  Ban,
  Info,
  Check,
  Edit2,
} from "lucide-react";
import { checkBirthdayStatus } from "@/lib/birthday";
import CustomerOnboardingModal from "./CustomerOnboardingModal";
import BirthdayPicker from "./BirthdayPicker";
import { trackClientEvent } from "@/lib/analytics-client";

type Step = 1 | 2 | 3 | 4;

export default function BookingForm({ minDate }: { minDate: string }) {
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
  const effectiveMinDate = minDate && minDate >= iranNow.date ? minDate : iranNow.date || iranToday();

  // Wizard Step: 1 = Date, 2 = Service, 3 = Time, 4 = Details
  const [step, setStep] = useState<Step>(1);

  // Step 1: Rolling 7-day selection
  const [weekOffset, setWeekOffset] = useState(0);
  const [date, setDate] = useState(() => effectiveMinDate);

  // Step 2: Service selection
  const [selectedService, setSelectedService] = useState("haircut");

  // Step 3: Time slot selection
  const [selectedTime, setSelectedTime] = useState("");

  // Customer state & Hydration guard
  const [isMounted, setIsMounted] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({
    name: "",
    phone: "",
    birthday: "",
    isSubscribed: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Guest inputs
  const [inputName, setInputName] = useState("");
  const [inputPhone, setInputPhone] = useState("");
  const [inputBirthday, setInputBirthday] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
    const saved = getSavedCustomerProfile();
    if (saved.phone || saved.name) {
      setProfile(saved);
    }
  }, []);

  const hasSavedProfile = isMounted && Boolean(profile.name && profile.phone);

  const handleProfileLoaded = (updated: CustomerProfile) => {
    setProfile(updated);
  };

  // Availability cache & fetching
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
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Fetch availability when date changes
  useEffect(() => {
    if (!date) return;

    if (availabilityCache.current[date]) {
      setAvailability(availabilityCache.current[date]);
      return;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      setLoadingAvailability(true);

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
          { signal: controller.signal }
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
        setLoadingAvailability(false);
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [date]);

  // Rolling days for current weekOffset
  const rollingDays: RollingDayInfo[] = useMemo(() => {
    return getRollingDays(weekOffset, effectiveMinDate);
  }, [weekOffset, effectiveMinDate]);

  // Selected day info
  const selectedDayInfo = useMemo(() => {
    return rollingDays.find((d) => d.isoDate === date) || null;
  }, [rollingDays, date]);

  // Selected service object
  const currentServiceObj = useMemo(() => {
    return SERVICES.find((s) => s.id === selectedService) || SERVICES[0];
  }, [selectedService]);

  // Available slots for selected service & date
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

  const activeSelectedTime = slots.some(
    (s) => s.time === selectedTime && !s.isBooked && !s.isPassed && !s.isUnavailable
  )
    ? selectedTime
    : "";

  // Group slots into Morning and Evening
  const morningSlots = useMemo(() => {
    return slots.filter((s) => {
      const h = Number(normalizeDigits(s.hour));
      return h >= 9 && h < 14;
    });
  }, [slots]);

  const eveningSlots = useMemo(() => {
    return slots.filter((s) => {
      const h = Number(normalizeDigits(s.hour));
      return h >= 14 && h <= 22;
    });
  }, [slots]);

  const activeBirthday = hasSavedProfile ? profile.birthday : inputBirthday;
  const birthdayStatus = activeBirthday ? checkBirthdayStatus(activeBirthday, date || undefined) : null;

  const handleSelectDate = (isoDate: string) => {
    setDate(isoDate);
    setSelectedTime("");
    setFormError("");
    trackClientEvent("date_select", { date: isoDate });
  };

  const handleSelectService = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedTime("");
    setFormError("");
    trackClientEvent("service_select", { serviceId });
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setFormError("");
    trackClientEvent("slot_select", {
      service: selectedService,
      date,
      time,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const nameToUse = hasSavedProfile ? profile.name : inputName.trim();
    const phoneToUse = cleanIranPhone(hasSavedProfile ? profile.phone : inputPhone.trim());
    const birthdayToUse = (hasSavedProfile ? profile.birthday : inputBirthday.trim()) || "";

    if (!date) {
      setFormError("لطفاً یک روز را انتخاب کنید.");
      setStep(1);
      return;
    }
    if (!selectedService) {
      setFormError("لطفاً یک خدمت را انتخاب کنید.");
      setStep(2);
      return;
    }
    if (!activeSelectedTime) {
      setFormError("لطفاً ساعت نوبت را انتخاب کنید.");
      setStep(3);
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

  const stepsMeta = [
    { num: 1, label: "انتخاب روز", icon: Calendar },
    { num: 2, label: "انتخاب خدمت", icon: Scissors },
    { num: 3, label: "انتخاب ساعت", icon: Clock },
    { num: 4, label: "مشخصات و ثبت", icon: User },
  ];

  return (
    <>
      <CustomerOnboardingModal
        onProfileLoaded={handleProfileLoaded}
        isOpenExternal={isModalOpen}
        onCloseExternal={() => setIsModalOpen(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-[#0c0c0c]/90 p-4 sm:p-7 shadow-2xl backdrop-blur-2xl"
      >
        {/* Wizard Header & Breadcrumbs */}
        <div className="mb-6 border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                رزرو وقت آنلاین
              </h2>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              مرحله {step} از ۴
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2">
            {stepsMeta.map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              const Icon = s.icon;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num as Step);
                  }}
                  disabled={s.num > step}
                  className={`group relative flex items-center justify-center sm:justify-start gap-2 rounded-xl px-2 sm:px-3 py-2 text-xs transition-all ${
                    isCurrent
                      ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                      : isCompleted
                      ? "bg-white/10 text-white hover:bg-white/15 cursor-pointer"
                      : "bg-white/[0.02] text-neutral-500 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-mono ${
                      isCurrent
                        ? "bg-black text-white font-bold"
                        : isCompleted
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-neutral-500"
                    }`}
                  >
                    {isCompleted ? <Check className="h-2.5 w-2.5" /> : s.num}
                  </div>
                  <span className="hidden sm:inline truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: Rolling 7-Day Calendar Strip */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white" />
                  <span>روز مورد نظر خود را انتخاب کنید</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">
                  نوبت‌دهی برای ۷ روز آینده (از شنبه تا جمعه)
                </p>
              </div>

              {/* Week switcher */}
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                  disabled={weekOffset === 0}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="هفته قبل"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>هفته قبل</span>
                </button>
                <div className="h-3 w-[1px] bg-white/10" />
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => Math.min(4, w + 1))}
                  disabled={weekOffset >= 4}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="هفته بعد"
                >
                  <span>هفته بعد</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 7-Day Rolling Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {rollingDays.map((d) => {
                const isSelected = date === d.isoDate;

                return (
                  <button
                    key={d.isoDate}
                    type="button"
                    onClick={() => handleSelectDate(d.isoDate)}
                    className={`relative flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all ${
                      isSelected
                        ? "border-white bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.25)] scale-[1.02]"
                        : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30 hover:bg-white/[0.06]"
                    }`}
                  >
                    {/* Badge for Today / Tomorrow */}
                    {d.isToday && (
                      <span
                        className={`mb-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? "bg-black text-white"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        امروز
                      </span>
                    )}
                    {d.isTomorrow && (
                      <span
                        className={`mb-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? "bg-black text-white"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        فردا
                      </span>
                    )}

                    <span
                      className={`text-xs ${
                        isSelected ? "font-bold text-black" : "text-neutral-400"
                      }`}
                    >
                      {d.weekday}
                    </span>

                    <span
                      className={`mt-1 font-mono text-sm ${
                        isSelected ? "font-extrabold text-black" : "font-bold text-white"
                      }`}
                    >
                      {d.dayMonth}
                    </span>

                    {isSelected && (
                      <div className="absolute top-2 left-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Summary & Next Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="text-xs text-neutral-300">
                روز انتخاب شده:{" "}
                <span className="font-bold text-white">
                  {selectedDayInfo?.fullPersian || formatPersianDate(date)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!date}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-bold text-black shadow-lg hover:bg-neutral-200 transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>مرحله بعد: انتخاب خدمت</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Service Selection */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-white" />
                  <span>انتخاب نوع خدمت</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">
                  نوبت برای:{" "}
                  <span className="text-white font-medium">
                    {selectedDayInfo?.fullPersian || formatPersianDate(date)}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>تغییر تاریخ</span>
              </button>
            </div>

            {/* Services List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVICES.map((service) => {
                const isSelected = selectedService === service.id;
                return (
                  <label
                    key={service.id}
                    onClick={() => handleSelectService(service.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-white bg-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
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

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-black shadow-lg hover:bg-neutral-200 transition active:scale-95"
              >
                <span>مرحله بعد: انتخاب ساعت</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Time Slot Selection */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white" />
                  <span>انتخاب ساعت نوبت</span>
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                  <span>{selectedDayInfo?.fullPersian || formatPersianDate(date)}</span>
                  <span>•</span>
                  <span>{currentServiceObj.name}</span>
                </div>
              </div>

              {loadingAvailability && (
                <span className="text-xs text-neutral-400 font-mono animate-pulse">
                  در حال بررسی نوبت‌ها...
                </span>
              )}
            </div>

            {/* Barber all-day unavailable */}
            {availability.isAllDayUnavailable ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                  <Ban className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-red-300">
                    آرایشگر در این تاریخ در سالن حضور ندارد
                  </h4>
                  <p className="mt-1 text-xs text-neutral-400">
                    امکان رزرو نوبت برای این تاریخ وجود ندارد. لطفاً روز دیگری را انتخاب نمایید.
                  </p>
                </div>
                {availability.allDayNote && (
                  <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-neutral-200">
                    <span className="font-bold text-amber-400 block mb-1">
                      پیام آرایشگر:
                    </span>
                    <span>{availability.allDayNote}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
                >
                  بازگشت به تقویم و انتخاب روز دیگر
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Notice if all today slots have passed */}
                {date === iranNow.date &&
                  slots.length > 0 &&
                  slots.every((s) => s.isBooked || s.isPassed || s.isUnavailable) && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-300">
                      تمامی نوبت‌های امروز به پایان رسیده یا رزرو شده‌اند. لطفاً روز دیگری را از تقویم انتخاب فرمایید.
                    </div>
                  )}

                {/* Morning Slots */}
                {morningSlots.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                      <span>نوبت‌های صبح (۰۹:۰۰ الی ۱۳:۰۰)</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {morningSlots.map((slot) => {
                        const isSelected = activeSelectedTime === slot.time;
                        const isSlotDisabled =
                          slot.isBooked || slot.isPassed || slot.isUnavailable || loadingAvailability;

                        return (
                          <button
                            key={slot.hour}
                            type="button"
                            disabled={isSlotDisabled}
                            onClick={() => handleSelectTime(slot.time)}
                            className={`flex min-h-[46px] flex-col items-center justify-center rounded-xl border p-2 font-mono text-xs transition-all ${
                              isSelected
                                ? "border-white bg-white font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105"
                                : slot.isUnavailable
                                ? "border-red-500/20 bg-red-500/5 text-neutral-500 line-through cursor-not-allowed opacity-40"
                                : slot.isBooked
                                ? "border-white/5 bg-transparent text-neutral-600 line-through cursor-not-allowed opacity-40"
                                : slot.isPassed
                                ? "border-white/5 bg-transparent text-neutral-600 line-through cursor-not-allowed opacity-40"
                                : "border-white/10 bg-white/[0.03] text-neutral-200 hover:border-white/30 hover:bg-white/[0.06] cursor-pointer"
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
                                گذشته
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {eveningSlots.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                      <span>نوبت‌های عصر و شب (۱۶:۰۰ الی ۲۱:۰۰)</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {eveningSlots.map((slot) => {
                        const isSelected = activeSelectedTime === slot.time;
                        const isSlotDisabled =
                          slot.isBooked || slot.isPassed || slot.isUnavailable || loadingAvailability;

                        return (
                          <button
                            key={slot.hour}
                            type="button"
                            disabled={isSlotDisabled}
                            onClick={() => handleSelectTime(slot.time)}
                            className={`flex min-h-[46px] flex-col items-center justify-center rounded-xl border p-2 font-mono text-xs transition-all ${
                              isSelected
                                ? "border-white bg-white font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105"
                                : slot.isUnavailable
                                ? "border-red-500/20 bg-red-500/5 text-neutral-500 line-through cursor-not-allowed opacity-40"
                                : slot.isBooked
                                ? "border-white/5 bg-transparent text-neutral-600 line-through cursor-not-allowed opacity-40"
                                : slot.isPassed
                                ? "border-white/5 bg-transparent text-neutral-600 line-through cursor-not-allowed opacity-40"
                                : "border-white/10 bg-white/[0.03] text-neutral-200 hover:border-white/30 hover:bg-white/[0.06] cursor-pointer"
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
                                گذشته
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!activeSelectedTime}
                className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-black shadow-lg hover:bg-neutral-200 transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>مرحله بعد: مشخصات و ثبت</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Customer Details & Final Confirmation */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-white" />
                <span>مشخصات و ثبت نهایی نوبت</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1">
                اطلاعات نوبت خود را بررسی و مشخصات تماس را جهت دریافت پیامک تایید وارد نمایید.
              </p>
            </div>

            {/* Order Summary Slab */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold text-white">خلاصه رزرو نوبت</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {currentServiceObj.price}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Service */}
                <div className="flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-neutral-400 text-[11px]">خدمت انتخابی:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-white">{currentServiceObj.name}</span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-neutral-400 hover:text-white"
                      title="ویرایش خدمت"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-neutral-400 text-[11px]">تاریخ نوبت:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-white">
                      {selectedDayInfo?.fullPersian || formatPersianDate(date)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-neutral-400 hover:text-white"
                      title="ویرایش تاریخ"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-neutral-400 text-[11px]">ساعت نوبت:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-white">
                      ساعت {activeSelectedTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-neutral-400 hover:text-white"
                      title="ویرایش ساعت"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Contact Section */}
            {hasSavedProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
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
                    <label
                      htmlFor="customer-name"
                      className="block text-xs font-medium text-neutral-300 mb-1"
                    >
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
                    <label
                      htmlFor="customer-phone"
                      className="block text-xs font-medium text-neutral-300 mb-1"
                    >
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

                {/* Optional Birthday */}
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

            {/* Error Message */}
            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {formError}
              </div>
            )}

            {/* Navigation & Submit CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="submit"
                disabled={isPending || !activeSelectedTime || !date}
                className="flex w-full sm:flex-1 items-center justify-center rounded-2xl bg-white py-3.5 text-sm font-bold text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <span>
                  {isPending ? "در حال ثبت نوبت..." : "تایید و ثبت نهایی نوبت"}
                </span>
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  );
}
