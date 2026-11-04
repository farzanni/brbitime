"use client";

import { useState } from "react";
import {
  PERSIAN_MONTHS,
  parseBirthday,
  formatNormalizedBirthday,
  checkBirthdayStatus,
} from "@/lib/birthday";
import { Sparkles, Gift } from "lucide-react";

interface BirthdayPickerProps {
  value?: string;
  onChange: (normalizedValue: string) => void;
  className?: string;
}

export default function BirthdayPicker({
  value,
  onChange,
  className = "",
}: BirthdayPickerProps) {
  const initial = parseBirthday(value);

  const [month, setMonth] = useState<number | "">(initial?.month ?? "");
  const [day, setDay] = useState<number | "">(initial?.day ?? "");
  const [year, setYear] = useState<number | "">(initial?.year ?? "");
  const [prevValue, setPrevValue] = useState(value);

  // Sync state if external value prop changes
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = parseBirthday(value);
    if (parsed) {
      setMonth(parsed.month);
      setDay(parsed.day);
      setYear(parsed.year ?? "");
    }
  }

  const selectedMonthObj = typeof month === "number" ? PERSIAN_MONTHS[month - 1] : null;
  const maxDays = selectedMonthObj ? selectedMonthObj.days : 31;

  // Generate day options 1..maxDays
  const daysList = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Generate common years: 1345 to 1390
  const yearsList = Array.from({ length: 46 }, (_, i) => 1345 + i).reverse();

  function handleMonthChange(newMonth: number | "") {
    setMonth(newMonth);
    if (typeof newMonth === "number" && typeof day === "number") {
      const mObj = PERSIAN_MONTHS[newMonth - 1];
      const validDay = day > mObj.days ? mObj.days : day;
      if (validDay !== day) {
        setDay(validDay);
      }
      const normalized = formatNormalizedBirthday(newMonth, validDay, typeof year === "number" ? year : null);
      onChange(normalized);
    } else if (newMonth === "") {
      onChange("");
    }
  }

  function handleDayChange(newDay: number | "") {
    setDay(newDay);
    if (typeof month === "number" && typeof newDay === "number") {
      const normalized = formatNormalizedBirthday(month, newDay, typeof year === "number" ? year : null);
      onChange(normalized);
    } else if (newDay === "") {
      onChange("");
    }
  }

  function handleYearChange(newYear: number | "") {
    setYear(newYear);
    if (typeof month === "number" && typeof day === "number") {
      const normalized = formatNormalizedBirthday(month, day, typeof newYear === "number" ? newYear : null);
      onChange(normalized);
    }
  }

  const normalizedCurrent =
    typeof month === "number" && typeof day === "number"
      ? formatNormalizedBirthday(month, day, typeof year === "number" ? year : null)
      : "";

  const birthdayStatus = normalizedCurrent ? checkBirthdayStatus(normalizedCurrent) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 3 Dropdown Columns */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. Day Selector */}
        <div>
          <label htmlFor="birthday-day-select" className="block text-[10px] text-neutral-400 mb-1 font-medium">
            روز تولد
          </label>
          <select
            id="birthday-day-select"
            value={day}
            onChange={(e) => handleDayChange(e.target.value ? Number(e.target.value) : "")}
            className="w-full appearance-none rounded-xl border border-white/15 bg-[#0c0c0c] px-3 py-2.5 text-center text-xs font-bold text-white shadow-inner focus:border-white/40 focus:bg-white/[0.08] focus:outline-none transition cursor-pointer"
          >
            <option value="" className="bg-neutral-900 text-neutral-400">
              روز
            </option>
            {daysList.map((d) => (
              <option key={d} value={d} className="bg-neutral-900 text-white">
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Month Selector */}
        <div>
          <label htmlFor="birthday-month-select" className="block text-[10px] text-neutral-400 mb-1 font-medium">
            ماه تولد
          </label>
          <select
            id="birthday-month-select"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value ? Number(e.target.value) : "")}
            className="w-full appearance-none rounded-xl border border-white/15 bg-[#0c0c0c] px-3 py-2.5 text-center text-xs font-bold text-white shadow-inner focus:border-white/40 focus:bg-white/[0.08] focus:outline-none transition cursor-pointer"
          >
            <option value="" className="bg-neutral-900 text-neutral-400">
              ماه
            </option>
            {PERSIAN_MONTHS.map((m) => (
              <option key={m.id} value={m.id} className="bg-neutral-900 text-white">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Year Selector (Optional) */}
        <div>
          <label htmlFor="birthday-year-select" className="block text-[10px] text-neutral-400 mb-1 font-medium">
            سال <span className="text-[9px] text-neutral-500">(اختیاری)</span>
          </label>
          <select
            id="birthday-year-select"
            value={year}
            onChange={(e) => handleYearChange(e.target.value ? Number(e.target.value) : "")}
            className="w-full appearance-none rounded-xl border border-white/15 bg-[#0c0c0c] px-3 py-2.5 text-center text-xs font-bold text-white shadow-inner focus:border-white/40 focus:bg-white/[0.08] focus:outline-none transition cursor-pointer"
          >
            <option value="" className="bg-neutral-900 text-neutral-400">
              —
            </option>
            {yearsList.map((y) => (
              <option key={y} value={y} className="bg-neutral-900 text-white">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Preview & Eligibility Status */}
      {birthdayStatus && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">ثبت استاندارد:</span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-purple-400" />
              {birthdayStatus.formattedDate}
            </span>
          </div>

          {birthdayStatus.isBirthdayWeek ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-bold text-purple-300">
              <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              <span>هفته تولد شماست! ۵۰٪ تخفیف ویژه برای شما فعال شد.</span>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-neutral-500">
              در هفته مصادف با {birthdayStatus.formattedDate}، ۵۰٪ تخفیف روی خدمات سالن به شما تعلق می‌گیرد.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
