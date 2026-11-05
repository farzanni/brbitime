import React from "react";
import type { BusinessAnalyticsData, TimeRange } from "@/lib/analytics";
import { toPersianDigits } from "@/lib/booking";
import {
  TrendingUp,
  Calendar,
  CheckCircle,
  Users,
  Eye,
  Scissors,
  Clock,
  Smartphone,
  Monitor,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "امروز",
  "7d": "۷ روز اخیر",
  "30d": "۳۰ روز اخیر",
  all: "کل دوره",
};

export default function AnalyticsView({
  data,
  currentRange,
}: {
  data: BusinessAnalyticsData;
  currentRange: TimeRange;
}) {
  const { kpi, funnel, services, peakHours, daysOfWeek, trafficSources, customerRetention, recentActivity } = data;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Time Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-white">بازه زمانی گزارش:</span>
          <span className="text-xs text-neutral-400">
            ({RANGE_LABELS[currentRange]})
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["today", "7d", "30d", "all"] as TimeRange[]).map((r) => {
            const isActive = currentRange === r;
            return (
              <a
                key={r}
                href={`/admin?tab=analytics&range=${r}`}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20"
                    : "border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white"
                }`}
              >
                {RANGE_LABELS[r]}
              </a>
            );
          })}
        </div>
      </div>

      {/* 1. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md transition hover:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">فروش کل تخمینی</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">{kpi.formattedRevenue}</div>
            <p className="mt-1 text-[11px] text-neutral-500">
              بر اساس {toPersianDigits(String(kpi.bookedAppointments))} نوبت رزرو شده موفق
            </p>
          </div>
        </div>

        {/* Bookings */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md transition hover:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">تعداد کل نوبت‌ها</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">
              {toPersianDigits(String(kpi.totalAppointments))}{" "}
              <span className="text-sm font-normal text-neutral-400">نوبت</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="text-emerald-400">
                {toPersianDigits(String(kpi.bookedAppointments))} موفق
              </span>
              <span>·</span>
              <span className="text-red-400">
                {toPersianDigits(String(kpi.cancelledAppointments))} لغو شده ({toPersianDigits(String(kpi.cancellationRate))}٪)
              </span>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md transition hover:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">نرخ تبدیل رزرو آنلاین</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">
              {toPersianDigits(String(kpi.overallConversionRate))}٪
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              از {toPersianDigits(String(kpi.pageViews))} بازدید منحصر‌به‌فرد
            </p>
          </div>
        </div>

        {/* Customer Retention */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md transition hover:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">نرخ بازگشت مشتریان</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">
              {toPersianDigits(String(customerRetention.repeatRate))}٪
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {toPersianDigits(String(customerRetention.repeatCustomers))} مشتری با بیش از ۱ بار مراجعه
            </p>
          </div>
        </div>
      </div>

      {/* 2. Conversion Funnel */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              قیف تبدیل رزرو آنلاین (Booking Conversion Funnel)
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              مسیر حرکت کاربران از لحظه ورود به سایت تا ثبت قطعی نوبت
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnel.map((step, idx) => {
            const isLast = idx === funnel.length - 1;
            return (
              <div
                key={step.id}
                className="relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 transition hover:border-neutral-700"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span className="font-mono text-[11px] text-amber-400 font-bold">
                      مرحله {toPersianDigits(String(idx + 1))}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {toPersianDigits(String(step.conversionPercent))}٪
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white">{step.title}</h4>
                  <div className="mt-3 text-xl font-mono font-black text-white">
                    {toPersianDigits(String(step.count))}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLast ? "bg-emerald-400" : "bg-gradient-to-r from-amber-500 to-amber-300"
                      }`}
                      style={{ width: `${Math.max(step.conversionPercent, 5)}%` }}
                    />
                  </div>
                </div>

                {idx > 0 && step.dropoffPercent > 0 && (
                  <div className="mt-4 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-red-400">
                    <span>افت در این مرحله:</span>
                    <span className="font-mono font-bold">
                      -{toPersianDigits(String(step.dropoffPercent))}٪
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Services Popularity & Revenue Contribution */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scissors className="h-4 w-4 text-amber-400" />
              محبوب‌ترین خدمات و سهم درآمد
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              تعداد رزروها و میزان درآمدزایی هر خدمت
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            هنوز نوبتی برای این بازه ثبت نشده است.
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4 transition hover:border-neutral-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-900 text-xs font-mono font-bold text-amber-400 border border-neutral-800">
                      {toPersianDigits(String(index + 1))}
                    </span>
                    <span className="text-sm font-bold text-white">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-neutral-400">
                      {toPersianDigits(String(item.count))} رزرو ({toPersianDigits(String(item.percentage))}٪)
                    </span>
                    <span className="text-amber-400 font-bold">{item.formattedRevenue}</span>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${Math.max(item.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Peak Scheduling Insights (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Days of Week */}
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
          <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                شلوغ‌ترین روزهای هفته
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                توزیع نوبت‌های رزرو شده در روزهای شنبه تا جمعه
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day) => {
              const heightPercent = Math.max(day.percentage, 8);
              return (
                <div key={day.dayName} className="flex flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-mono font-bold text-white">
                    {toPersianDigits(String(day.count))}
                  </span>

                  <div className="h-28 w-full rounded-xl bg-neutral-950 p-1 flex items-end justify-center border border-neutral-800">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <span className="text-[11px] font-medium text-neutral-400 text-center">
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Peak Hours */}
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
          <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                ساعات پرتقاضای سالن
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                تقاضای رزرو در شیفت‌های صبح و عصر
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {peakHours.map((slot) => (
              <div key={slot.hour} className="flex items-center gap-3 text-xs">
                <span className="w-24 text-neutral-400 font-mono text-left" dir="ltr">
                  {slot.label}
                </span>

                <div className="flex-1 h-3 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.max(slot.percentage, 3)}%` }}
                  />
                </div>

                <span className="w-10 text-right font-mono font-bold text-white">
                  {toPersianDigits(String(slot.count))}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 5. Marketing Channels & Acquisition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
          <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-emerald-400" />
                کانال‌های جذب مشتری (Traffic Sources)
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                مشتریان از چه طریقی با سایت شما آشنا شده و رزرو کرده‌اند
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {trafficSources.map((source) => (
              <div
                key={source.source}
                className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3.5 text-xs transition hover:border-neutral-700"
              >
                <div>
                  <div className="font-bold text-white">{source.label}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {toPersianDigits(String(source.visits))} بازدید ورودی
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="text-emerald-400 font-bold">
                    {toPersianDigits(String(source.bookings))} رزرو قطعی
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    تبدیل: {toPersianDigits(String(source.conversionRate))}٪
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Customer Loyalty & Retention */}
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
          <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                مشتریان وفادار برتر (Top VIPs)
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                مشتریانی که بیشترین تعداد مراجعه به سالن را داشته‌اند
              </p>
            </div>
          </div>

          {customerRetention.topVipClients.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              هنوز اطلاعات مشتری ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {customerRetention.topVipClients.map((client, idx) => (
                <div
                  key={client.phone}
                  className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3.5 text-xs transition hover:border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold">
                      {toPersianDigits(String(idx + 1))}
                    </span>
                    <div>
                      <div className="font-bold text-white">{client.name}</div>
                      <div className="font-mono text-[11px] text-neutral-400" dir="ltr">
                        {client.phone}
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="inline-flex items-center rounded-lg bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/20">
                      {toPersianDigits(String(client.totalVisits))} نوبت
                    </span>
                    {client.lastVisitAt && (
                      <p className="text-[10px] text-neutral-500 mt-1">
                        آخرین حضور: {client.lastVisitAt}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 6. Real-Time Activity Feed */}
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-400" />
              رویدادهای زنده و اخیر سایت (Live Activity Stream)
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              آخرین تعاملات ثبت شده در وبسایت به تفکیک زمان و دستگاه
            </p>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            در حال حاضر رویداد جدیدی ثبت نشده است. به محض مراجعه کاربران، فعالیت‌ها در اینجا نمایش داده می‌شوند.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentActivity.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-3.5 text-xs transition hover:border-neutral-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
                    {ev.deviceType === "mobile" ? (
                      <Smartphone className="h-4 w-4 text-neutral-300" />
                    ) : (
                      <Monitor className="h-4 w-4 text-neutral-300" />
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-white">{ev.title}</div>
                    <div className="text-[11px] text-neutral-400">{ev.detail}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-neutral-400">
                  {ev.source && (
                    <span className="rounded-md bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                      {ev.source}
                    </span>
                  )}
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {ev.relativeTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
