"use client";

import { useEffect, useState, useTransition } from "react";
import { DayPicker, faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { bookAppointment } from "./actions";
import { SERVICES, TIME_SLOTS } from "@/lib/booking";
import { getSavedCustomerProfile, saveCustomerProfile } from "@/lib/customerCache";
import { Calendar, Clock, Scissors, User, Phone, Gift, CheckCircle2 } from "lucide-react";

export default function BookingForm({ minDate }: { minDate: string }) {
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availability, setAvailability] = useState<{
    date: string;
    times: string[];
  }>({ date: "", times: [] });
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Customer cache state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [isRecognized, setIsRecognized] = useState(false);

  // Load profile from phone's local cache on mount
  useEffect(() => {
    const profile = getSavedCustomerProfile();
    if (profile.phone || profile.name) {
      if (profile.name) setName(profile.name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.birthday) setBirthday(profile.birthday);
      setIsRecognized(true);
    }
  }, []);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    saveCustomerProfile({ phone: val });
  };

  const handleNameChange = (val: string) => {
    setName(val);
    saveCustomerProfile({ name: val });
  };

  const handleBirthdayChange = (val: string) => {
    setBirthday(val);
    saveCustomerProfile({ birthday: val });
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

  return (
    <form
      action={(formData) => {
        // Save profile before submitting
        saveCustomerProfile({ name, phone, birthday });
        startTransition(async () => {
          await bookAppointment(formData);
        });
      }}
      className="space-y-8"
    >
      {/* 1. Customer Identification & Auto-Recognition Banner */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">۱. اطلاعات شما</h2>
          </div>
          {isRecognized && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              شناسایی شده
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">شماره موبایل (جهت شناسایی و پیامک یادآوری)</label>
            <div className="relative">
              <input
                required
                type="tel"
                name="phone"
                dir="ltr"
                inputMode="numeric"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="09123456789"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5 pr-10 text-left font-mono text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-neutral-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">نام و نام خانوادگی</label>
            <input
              required
              name="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="مثال: رضا محمدی"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">تاریخ تولد (اختیاری)</label>
            <div className="relative">
              <input
                name="birthday"
                value={birthday}
                onChange={(e) => handleBirthdayChange(e.target.value)}
                placeholder="مثال: ۱۳۷۴/۰۶/۱۵"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5 pr-10 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <Gift className="absolute right-3.5 top-3.5 h-4 w-4 text-amber-400" />
            </div>

            {/* Birthday promo callout */}
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
              <span className="text-base">🎉</span>
              <p>
                <strong>هدیه سالگرد تولد:</strong> با وارد کردن تاریخ تولد، در هفته تولدتان از تخفیف ویژه و خدمات اختصاصی برخوردار می‌شوید.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Service Selection */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Scissors className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">۲. انتخاب خدمت</h2>
        </div>

        <div className="space-y-2.5">
          {SERVICES.map((service) => (
            <label
              key={service.id}
              className="group flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-700 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-400/5"
            >
              <div className="flex items-center gap-3">
                <input
                  required
                  type="radio"
                  name="service"
                  value={service.id}
                  className="h-4 w-4 accent-amber-400"
                />
                <div>
                  <p className="font-medium text-white group-hover:text-amber-300 transition">{service.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{service.duration}</p>
                </div>
              </div>

              <span className="rounded-lg bg-neutral-900 px-3 py-1 font-mono text-sm text-amber-300">
                {service.price}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* 3. Day Selection */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">۳. انتخاب روز</h2>
        </div>

        <div className="flex justify-center rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
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
            }}
            disabled={{
              before: new Date(`${minDate}T00:00:00`),
            }}
          />

          <input type="hidden" name="date" value={date} />
        </div>
      </section>

      {/* 4. Time Slot Selection */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">۴. انتخاب ساعت</h2>
          </div>
          {loading && <span className="text-xs text-neutral-400">در حال بررسی...</span>}
        </div>

        {!date ? (
          <p className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">
            ابتدا از بخش بالا یک روز را انتخاب کنید.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {TIME_SLOTS.map((time) => {
              const booked = bookedTimes.includes(time);

              return (
                <label
                  key={time}
                  className={booked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
                >
                  <input
                    required
                    disabled={booked || loading}
                    type="radio"
                    name="time"
                    value={time}
                    className="peer sr-only"
                  />

                  <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center transition hover:border-neutral-700 peer-checked:border-amber-400 peer-checked:bg-amber-400 peer-checked:text-black">
                    <span className="font-mono text-sm font-semibold">{time}</span>
                    {booked ? (
                      <span className="mt-1 text-[10px] text-red-400">رزرو شده</span>
                    ) : (
                      <span className="mt-1 text-[10px] text-neutral-400 peer-checked:text-neutral-900">آزاد</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!selectedDate || isPending}
        className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 p-4 text-center font-bold text-neutral-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "در حال ثبت رزرو..." : "تأیید و دریافت نوبت"}
      </button>
    </form>
  );
}
