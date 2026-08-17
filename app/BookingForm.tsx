"use client";

import { useEffect, useState } from "react";
import { DayPicker, faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { bookAppointment } from "./actions";
import { SERVICES, TIME_SLOTS } from "@/lib/booking";

export default function BookingForm({
  error,
  minDate,
}: {
  error?: string;
  minDate: string;
}) {
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setBookedTimes([]);
      return;
    }

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
        setBookedTimes(data.bookedTimes);
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [date]);

  return (
    <>
      {error === "slot-taken" && (
        <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm">
          این ساعت همین الان توسط شخص دیگری رزرو شد. ساعت دیگری انتخاب کن.
        </div>
      )}

      {error === "invalid" && (
        <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm">
          اطلاعات واردشده معتبر نیست.
        </div>
      )}

      <form action={bookAppointment} className="space-y-10">
        <section>
          <h2 className="mb-4 text-lg font-semibold">۱. انتخاب خدمت</h2>

          <div className="space-y-3">
            {SERVICES.map((service) => (
              <label
                key={service.id}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    required
                    type="radio"
                    name="service"
                    value={service.id}
                  />

                  <div>
                    <p>{service.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {service.duration}
                    </p>
                  </div>
                </div>

                <span className="text-sm text-neutral-300">
                  {service.price}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">۲. انتخاب روز</h2>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
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

            <input
              type="hidden"
              name="date"
              value={date}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">۳. انتخاب ساعت</h2>

          {!date ? (
            <p className="text-sm text-neutral-500">
              اول روز را انتخاب کن.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {TIME_SLOTS.map((time) => {
                const booked = bookedTimes.includes(time);

                return (
                  <label
                    key={time}
                    className={booked ? "cursor-not-allowed" : "cursor-pointer"}
                  >
                    <input
                      required
                      disabled={booked || loading}
                      type="radio"
                      name="time"
                      value={time}
                      className="peer sr-only"
                    />

                    <div
                      className={`
                        rounded-xl border p-3 text-center transition
                        ${
                          booked
                            ? "border-neutral-900 bg-neutral-900/40 text-neutral-700"
                            : "border-neutral-800 bg-neutral-900 peer-checked:border-white peer-checked:bg-white peer-checked:text-black"
                        }
                      `}
                    >
                      {time}
                      {booked && (
                        <div className="mt-1 text-[10px]">رزرو شده</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">۴. اطلاعات شما</h2>

          <div className="space-y-3">
            <input
              required
              name="name"
              placeholder="نام"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-4 outline-none"
            />

            <input
              required
              type="tel"
              name="phone"
              dir="ltr"
              inputMode="numeric"
              placeholder="09123456789"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-right outline-none"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={!selectedDate}
          className="w-full rounded-2xl bg-white p-4 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          رزرو وقت
        </button>
      </form>
    </>
  );
}
