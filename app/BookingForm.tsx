"use client";

import { useEffect, useState, useTransition } from "react";
import { DayPicker, faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { bookAppointment } from "./actions";
import { SERVICES, TIME_SLOTS } from "@/lib/booking";
import {
  getSavedCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/customerCache";
import {
  Calendar,
  Clock,
  Scissors,
  User,
  Gift,
  CheckCircle2,
  Edit3,
  UserPlus,
} from "lucide-react";
import CustomerOnboardingModal from "./CustomerOnboardingModal";

export default function BookingForm({ minDate }: { minDate: string }) {
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availability, setAvailability] = useState<{
    date: string;
    times: string[];
  }>({ date: "", times: [] });
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Customer state initialized from client cache
  const [profile, setProfile] = useState<CustomerProfile>(() => getSavedCustomerProfile());
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const hasSubscribed = Boolean(profile.name && profile.phone);

  return (
    <>
      {/* Onboarding Pop-up & Greeting Toast */}
      <CustomerOnboardingModal
        onProfileLoaded={handleProfileLoaded}
        isOpenExternal={isModalOpen}
        onCloseExternal={() => setIsModalOpen(false)}
      />

      <form
        action={(formData) => {
          if (!hasSubscribed) {
            setIsModalOpen(true);
            return;
          }
          formData.set("name", profile.name);
          formData.set("phone", profile.phone);
          formData.set("birthday", profile.birthday || "");

          saveCustomerProfile(profile);
          startTransition(async () => {
            await bookAppointment(formData);
          });
        }}
        className="space-y-6"
      >
        {/* Hidden inputs populated from customer profile */}
        <input type="hidden" name="name" value={profile.name} />
        <input type="hidden" name="phone" value={profile.phone} />
        <input type="hidden" name="birthday" value={profile.birthday || ""} />

        {/* 1. Customer Profile Card */}
        <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-black/80 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="mb-3.5 flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white">
                <User className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                ۱. مشخصات مشتری
              </h2>
            </div>
            {hasSubscribed && (
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] text-neutral-300">
                <CheckCircle2 className="h-3 w-3 text-white" />
                عضو باشگاه
              </span>
            )}
          </div>

          {hasSubscribed ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0c0c0c] p-4 transition hover:border-white/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{profile.name}</span>
                  <span className="font-mono text-xs text-neutral-400" dir="ltr">
                    ({profile.phone})
                  </span>
                </div>
                {profile.birthday ? (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                    <Gift className="h-3.5 w-3.5 text-white" />
                    <span>تاریخ تولد: {profile.birthday} (شامل ۵۰٪ تخفیف هفته تولد)</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500">
                    تاریخ تولد ثبت نشده است.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:border-white/40 hover:bg-white/10 transition"
              >
                <Edit3 className="h-3 w-3" />
                ویرایش
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  هنوز مشخصاتت ثبت نشده!
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  شماره موبایل و اسمت رو ثبت کن تا در قرعه‌کشی و تخفیف روز تولدت شرکت داده بشی.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                ثبت مشخصات و ورود
              </button>
            </div>
          )}
        </section>

        {/* 2. Service Selection */}
        <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-black/80 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="mb-3.5 flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white">
              <Scissors className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              ۲. انتخاب خدمت
            </h2>
          </div>

          <div className="space-y-2.5">
            {SERVICES.map((service) => (
              <label
                key={service.id}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-[#0c0c0c] p-4 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.03] has-[:checked]:border-white has-[:checked]:bg-white/[0.06] has-[:checked]:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <input
                    required
                    type="radio"
                    name="service"
                    value={service.id}
                    className="h-4 w-4 accent-white cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-white transition group-hover:text-white">
                      {service.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {service.duration}
                    </p>
                  </div>
                </div>

                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                  {service.price}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* 3. Day Selection */}
        <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-black/80 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="mb-3.5 flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              ۳. انتخاب روز
            </h2>
          </div>

          <div className="flex justify-center rounded-xl border border-white/[0.08] bg-[#0c0c0c] p-3">
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
        <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-black/80 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="mb-3.5 flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                ۴. انتخاب ساعت
              </h2>
            </div>
            {loading && <span className="text-[10px] text-neutral-400">در حال بررسی...</span>}
          </div>

          {!date ? (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-neutral-500">
              ابتدا از بخش بالا یک روز را انتخاب کنید.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {TIME_SLOTS.map((time) => {
                const booked = bookedTimes.includes(time);

                return (
                  <label
                    key={time}
                    className={booked ? "cursor-not-allowed opacity-30" : "cursor-pointer"}
                  >
                    <input
                      required
                      disabled={booked || loading}
                      type="radio"
                      name="time"
                      value={time}
                      className="peer sr-only"
                    />

                    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#0c0c0c] p-3 text-center transition-all duration-200 hover:border-white/30 peer-checked:border-white peer-checked:bg-white peer-checked:text-black peer-checked:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                      <span className="font-mono text-xs font-bold">{time}</span>
                      {booked ? (
                        <span className="mt-1 text-[9px] text-neutral-500">رزرو شده</span>
                      ) : (
                        <span className="mt-1 text-[9px] text-neutral-400 peer-checked:text-neutral-900">
                          آزاد
                        </span>
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
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white p-4 text-center font-extrabold text-black shadow-[0_0_30px_rgba(255,255,255,0.18)] transition-all duration-300 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
        >
          <span className="text-sm tracking-wide">
            {isPending
              ? "در حال ثبت رزرو..."
              : !hasSubscribed
              ? "ورود مشخصات و رزرو وقت"
              : "رزرو وقت و دریافت نوبت"}
          </span>
        </button>
      </form>
    </>
  );
}
