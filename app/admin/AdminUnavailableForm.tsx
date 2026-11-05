"use client";

import { useState, useTransition } from "react";
import { DayPicker, faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { WORK_HOURS } from "@/lib/booking";
import { addUnavailableTimes } from "@/app/actions";
import { Calendar, Clock, Ban, Check, Plus, AlertCircle } from "lucide-react";

interface AdminUnavailableFormProps {
  minDate: string; // YYYY-MM-DD
}

export default function AdminUnavailableForm({ minDate }: AdminUnavailableFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    // Default to today
    const [y, m, d] = minDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
  const [dateStr, setDateStr] = useState<string>(minDate);
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const formattedPersianDate = selectedDate
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selectedDate)
    : "";

  const toggleHour = (hour: string) => {
    const timeSlot = `${hour}:۰۰`;
    if (selectedHours.includes(timeSlot)) {
      setSelectedHours(selectedHours.filter((h) => h !== timeSlot));
    } else {
      setSelectedHours([...selectedHours, timeSlot]);
    }
  };

  const selectAllHours = () => {
    setSelectedHours(WORK_HOURS.map((h) => `${h}:۰۰`));
  };

  const clearHours = () => {
    setSelectedHours([]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!dateStr) {
      setErrorMsg("لطفاً یک تاریخ از تقویم انتخاب کنید.");
      return;
    }

    if (!isAllDay && selectedHours.length === 0) {
      setErrorMsg("لطفاً حداقل یک ساعت یا گزینه «کل روز» را انتخاب کنید.");
      return;
    }

    const formData = new FormData();
    formData.set("date", dateStr);
    formData.set("note", note.trim());

    if (isAllDay) {
      formData.set("allDay", "true");
    } else {
      for (const h of selectedHours) {
        formData.append("times", h);
      }
    }

    startTransition(async () => {
      await addUnavailableTimes(formData);
      // Reset form partially
      setSelectedHours([]);
      setIsAllDay(false);
      setNote("");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm space-y-6"
    >
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <Plus className="h-5 w-5 text-amber-400" />
        <h3 className="text-base font-bold text-white">ثبت زمان عدم حضور و مرخصی جدید</h3>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Date Selection */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <Calendar className="h-4 w-4 text-amber-400" />
            <span>۱. انتخاب تاریخ:</span>
          </label>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
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
                setDateStr(`${year}-${month}-${dayNumber}`);
              }}
              disabled={{
                before: new Date(`${minDate}T00:00:00`),
              }}
            />
          </div>

          {formattedPersianDate && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300 text-center font-bold">
              تاریخ انتخابی: {formattedPersianDate}
            </div>
          )}
        </div>

        {/* Time Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>۲. انتخاب ساعت‌های عدم حضور:</span>
            </label>

            {!isAllDay && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllHours}
                  className="text-amber-400 hover:text-amber-300 underline transition"
                >
                  انتخاب همه
                </button>
                <span className="text-neutral-600">|</span>
                <button
                  type="button"
                  onClick={clearHours}
                  className="text-neutral-400 hover:text-white underline transition"
                >
                  پاک کردن
                </button>
              </div>
            )}
          </div>

          {/* Option A: All Day Toggle */}
          <div
            onClick={() => setIsAllDay(!isAllDay)}
            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
              isAllDay
                ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-lg border transition ${
                  isAllDay
                    ? "border-amber-400 bg-amber-400 text-neutral-950"
                    : "border-neutral-700 bg-neutral-900"
                }`}
              >
                {isAllDay && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">کل روز (تعطیلی و عدم حضور تمام ساعات)</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  تمام ساعت‌های این روز برای رزرو مسدود خواهند شد.
                </p>
              </div>
            </div>
            <Ban className={`h-5 w-5 ${isAllDay ? "text-amber-400" : "text-neutral-600"}`} />
          </div>

          {/* Option B: Specific Work Hours */}
          {!isAllDay && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400">یا انتخاب ساعت‌های مشخص:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WORK_HOURS.map((hour) => {
                  const timeSlot = `${hour}:۰۰`;
                  const isChecked = selectedHours.includes(timeSlot);

                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => toggleHour(hour)}
                      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border p-2.5 font-mono text-xs transition-all ${
                        isChecked
                          ? "border-amber-400 bg-amber-400/20 font-bold text-amber-300 shadow-sm shadow-amber-500/20"
                          : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                      }`}
                    >
                      <span>{timeSlot}</span>
                      {isChecked && <Check className="h-3.5 w-3.5 text-amber-400 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Input for Customers */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-neutral-300">
              ۳. یادداشت برای مشتریان (اختیاری):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: مرخصی ساعتی، مسافرت، شرکت در کلاس تخصصی، تعمیرات سالن..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white placeholder-neutral-600 outline-none focus:border-amber-400 transition"
            />
            <p className="text-[11px] text-neutral-500">
              این متن در سایت و فرم رزرو به مشتریان هنگام مشاهده این ساعت‌ها نمایش داده می‌شود.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || (!isAllDay && selectedHours.length === 0)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3.5 text-xs font-bold text-neutral-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <Plus className="h-4 w-4" />
            <span>
              {isPending
                ? "در حال ثبت و اعمال در سایت..."
                : isAllDay
                ? "مسدودسازی کل روز"
                : `ثبت و مسدودسازی ${selectedHours.length > 0 ? selectedHours.length + " ساعت" : "ساعت‌ها"}`}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}
