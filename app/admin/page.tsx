import type { Metadata } from "next";
import { getSql } from "@/lib/db";
import { SERVICES, iranToday, formatPersianDate } from "@/lib/booking";
import { isAdmin } from "@/lib/admin";
import { getShopConfig } from "@/lib/shop";
import { checkBirthdayStatus } from "@/lib/birthday";
import { getBarberPhones } from "@/lib/sms";
import { getCustomersForSms, getSmsBroadcasts } from "@/lib/sms-broadcast";
import BrandLogo from "../BrandLogo";
import {
  cancelAppointment,
  loginAdmin,
  logoutAdmin,
  updateShopSettings,
  saveProduct,
  deleteProduct,
  saveEvent,
  deleteEvent,
  updateCustomerNote,
  deleteUnavailableTime,
  triggerManualReminders,
} from "../actions";
import {
  Calendar,
  Clock,
  User,
  Users,
  Phone,
  Gift,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  Plus,
  LogOut,
  Scissors,
  CheckCircle,
  FileText,
  BarChart3,
  CalendarOff,
  Ban,
  AlertCircle,
  Bell,
  MessageSquare,
} from "lucide-react";
import AnalyticsView from "./AnalyticsView";
import AdminUnavailableForm from "./AdminUnavailableForm";
import AdminSmsSection from "./AdminSmsSection";
import { getBusinessAnalytics, type TimeRange } from "@/lib/analytics";
import { getUnavailableTimes } from "@/lib/unavailable";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type Appointment = {
  id: number;
  service: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  phone: string;
  customer_birthday?: string | null;
  reminder_sent_at?: string | null;
};

type Customer = {
  id: number;
  phone: string;
  name: string;
  birthday: string | null;
  notes: string | null;
  total_visits: number;
  last_visit_at: string | null;
  created_at: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    tab?: string;
    saved?: string;
    range?: string;
    reminded?: string;
    phone?: string;
    sent?: string;
    failed?: string;
    test_sent?: string;
    test_target?: string;
    test_error?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    error,
    tab = "appointments",
    saved,
    range = "30d",
    reminded,
    phone,
    sent,
    failed,
    test_sent,
    test_target,
    test_error,
  } = params;

  if (!(await isAdmin())) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-neutral-950 p-5 text-white selection:bg-amber-400 selection:text-neutral-950"
      >
        <form
          action={loginAdmin}
          className="w-full max-w-sm space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-md"
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex justify-center">
              <BrandLogo size="md" />
            </div>
            <h1 className="text-xl font-bold">ورود آرایشگر</h1>
            <p className="mt-1 text-xs text-neutral-400">برای مدیریت نوبت‌ها و وبسایت وارد شوید</p>
          </div>

          {error === "login" && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-400">
              رمز عبور اشتباه است.
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-neutral-400">رمز عبور مدیریت</label>
            <input
              required
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center font-mono text-sm tracking-widest outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <button className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 p-4 font-bold text-neutral-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.99]">
            ورود به پنل
          </button>
        </form>
      </main>
    );
  }

  const sql = getSql();
  const [appointments, customers, shop, unavailableTimes, smsCustomers, smsBroadcasts] = await Promise.all([
    (sql`SELECT id, service, appointment_date::text AS appointment_date, appointment_time, customer_name, phone, customer_birthday, reminder_sent_at FROM appointments WHERE status = 'booked' AND appointment_date >= ${iranToday()} ORDER BY appointment_date, appointment_time` as unknown as Promise<Appointment[]>),
    (sql`SELECT id, phone, name, birthday, notes, total_visits, last_visit_at, created_at FROM customers ORDER BY last_visit_at DESC NULLS LAST, id DESC` as unknown as Promise<Customer[]>),
    getShopConfig(),
    getUnavailableTimes(iranToday()),
    tab === "sms" ? getCustomersForSms() : Promise.resolve([]),
    tab === "sms" ? getSmsBroadcasts() : Promise.resolve([]),
  ]);

  const validRange = (["today", "7d", "30d", "all"].includes(range) ? range : "30d") as TimeRange;
  const analyticsData = tab === "analytics" ? await getBusinessAnalytics(validRange) : null;

  return (
    <main dir="rtl" className="min-h-screen bg-neutral-950 text-white selection:bg-amber-400 selection:text-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandLogo size="sm" />
              <h1 className="text-2xl font-black">{shop.name}</h1>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                پنل آرایشگر
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              مدیریت نوبت‌ها، ساعت‌ها، محصولات و محتوای سایت
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs text-neutral-300 hover:border-neutral-700 transition"
            >
              مشاهده سایت
            </a>
            <form action={logoutAdmin}>
              <button className="flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/20 transition">
                <LogOut className="h-3.5 w-3.5" />
                خروج
              </button>
            </form>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
          <a
            href="/admin?tab=appointments"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "appointments"
                ? "bg-amber-400 text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" />
            نوبت‌ها و رزروها ({appointments.length})
          </a>

          <a
            href="/admin?tab=customers"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "customers"
                ? "bg-amber-400 text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            بانک مشتریان ({customers.length})
          </a>

          <a
            href="/admin?tab=sms"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "sms"
                ? "bg-amber-400 text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            ارسال پیامک ({customers.length})
          </a>

          <a
            href="/admin?tab=content"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "content"
                ? "bg-amber-400 text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            مدیریت محتوا و محصولات
          </a>

          <a
            href="/admin?tab=schedule"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "schedule"
                ? "bg-amber-400 text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <CalendarOff className="h-4 w-4" />
            ساعت‌های عدم حضور ({unavailableTimes.length})
          </a>

          <a
            href={`/admin?tab=analytics&range=${validRange}`}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "analytics"
                ? "bg-amber-400 text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            تحلیل و آمار کسب‌وکار
          </a>
        </div>

        {saved === "1" && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4" />
            تغییرات با موفقیت ذخیره و در سایت اعمال شد.
          </div>
        )}

        {error === "invalid-date" && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            <AlertCircle className="h-4 w-4" />
            تاریخ انتخابی نامعتبر است.
          </div>
        )}

        {error === "no-time" && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            <AlertCircle className="h-4 w-4" />
            لطفاً حداقل یک ساعت یا گزینه کل روز را انتخاب کنید.
          </div>
        )}

        {reminded !== undefined && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4" />
            {Number(reminded) > 0
              ? `بررسی انجام شد: پیامک یادآوری ۳۰ دقیقه قبل برای ${reminded} مشتری ارسال گردید.`
              : "بررسی انجام شد: نوبتی در بازه ۳۰ دقیقه قبل از شروع که نیاز به پیامک داشته باشد، یافت نشد."}
          </div>
        )}

        {/* TAB 1: Appointments */}
        {tab === "appointments" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">لیست نوبت‌های پیش‌رو</h2>
                <p className="text-xs text-neutral-400">
                  سیستم به‌طور خودکار ۳۰ دقیقه قبل از هر نوبت، پیامک یادآوری به مشتری ارسال می‌کند.
                </p>
              </div>
              <form action={triggerManualReminders}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 active:scale-95 transition"
                >
                  <Bell className="h-3.5 w-3.5" />
                  بررسی و ارسال فوری یادآوری‌ها
                </button>
              </form>
            </div>

            {appointments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center text-sm text-neutral-500">
                در حال حاضر نوبت فعالی ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {appointments.map((appointment) => {
                  const service =
                    SERVICES.find((item) => item.id === appointment.service)?.name ??
                    (appointment.service === "combo" ? "پکیج کامل (مو + ریش)" : appointment.service);

                  return (
                    <article
                      key={appointment.id}
                      className="rounded-3xl border border-neutral-800/80 bg-neutral-900/70 p-5 backdrop-blur-sm transition hover:border-neutral-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-amber-400" />
                            <h3 className="font-bold text-white text-base">
                              {appointment.customer_name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <Scissors className="h-3.5 w-3.5 text-neutral-500" />
                            <span>{service}</span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs text-amber-300">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            <span>{formatPersianDate(appointment.appointment_date)}</span>
                            <span>•</span>
                            <span>ساعت {appointment.appointment_time}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <Phone className="h-3.5 w-3.5 text-neutral-500" />
                            <a
                              href={`tel:${appointment.phone}`}
                              dir="ltr"
                              className="font-mono hover:text-white transition"
                            >
                              {appointment.phone}
                            </a>
                          </div>

                          {(() => {
                            const bStatus = appointment.customer_birthday
                              ? checkBirthdayStatus(appointment.customer_birthday, appointment.appointment_date)
                              : null;
                            if (!bStatus) return null;

                            if (bStatus.isBirthdayWeek) {
                              return (
                                <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs text-purple-200 font-bold animate-pulse">
                                  <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                                  <span>🎂 هفته تولد مشتری ({bStatus.formattedDate}) — شامل ۵۰٪ تخفیف</span>
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center gap-2 rounded-xl bg-neutral-850 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                                <Gift className="h-3.5 w-3.5 text-purple-400" />
                                <span>تولد مشتری: {bStatus.formattedDate}</span>
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-2 pt-0.5">
                            {appointment.reminder_sent_at ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                                <CheckCircle className="h-3 w-3 text-emerald-400" />
                                پیامک یادآوری ارسال شد
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-850 px-2.5 py-1 text-[11px] text-neutral-400">
                                <Bell className="h-3 w-3 text-amber-400/80" />
                                ارسال پیامک ۳۰ دقیقه قبل
                              </span>
                            )}
                          </div>
                        </div>

                        <form action={cancelAppointment}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <button
                            type="submit"
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition"
                          >
                            لغو نوبت
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Customers Database */}
        {tab === "customers" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">بانک اطلاعات مشتریان</h2>
                <p className="text-xs text-neutral-400">
                  اطلاعات، تعداد دفعات مراجعه، تاریخ تولد و یادداشت‌های اختصاصی هر مشتری
                </p>
              </div>
              <span className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-amber-400">
                مجموع: {customers.length} مشتری
              </span>
            </div>

            {customers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center text-sm text-neutral-500">
                هنوز مشتری در دیتابیس ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {customers.map((c) => (
                  <article
                    key={c.id}
                    className="rounded-3xl border border-neutral-800/80 bg-neutral-900/70 p-5 backdrop-blur-sm transition hover:border-neutral-700 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-amber-400" />
                          <h3 className="font-bold text-white text-base">{c.name}</h3>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                          <Phone className="h-3.5 w-3.5 text-neutral-500" />
                          <a
                            href={`tel:${c.phone}`}
                            dir="ltr"
                            className="font-mono hover:text-white transition"
                          >
                            {c.phone}
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-300">
                          {c.total_visits} مراجعه
                        </span>
                        {c.last_visit_at && (
                          <span className="text-[10px] text-neutral-500">
                            آخرین: {new Date(c.last_visit_at).toLocaleDateString("fa-IR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const bStatus = c.birthday ? checkBirthdayStatus(c.birthday) : null;
                      if (!bStatus) return null;

                      if (bStatus.isBirthdayWeek) {
                        return (
                          <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs text-purple-200 font-bold animate-pulse">
                            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                            <span>🎂 هفته تولد مشتری ({bStatus.formattedDate}) — ۵۰٪ تخفیف</span>
                          </div>
                        );
                      }

                      if (bStatus.isBirthdayMonth) {
                        return (
                          <div className="flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/25 px-3 py-1.5 text-xs text-purple-300">
                            <Gift className="h-3.5 w-3.5 text-purple-400" />
                            <span>متولد این ماه: {bStatus.formattedDate}</span>
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2 rounded-xl bg-neutral-850 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
                          <Gift className="h-3.5 w-3.5 text-neutral-400" />
                          <span>تاریخ تولد: {bStatus.formattedDate}</span>
                        </div>
                      );
                    })()}

                    {/* Barber Notes Form */}
                    <form action={updateCustomerNote} className="space-y-2 border-t border-neutral-800/80 pt-3">
                      <input type="hidden" name="phone" value={c.phone} />
                      <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <FileText className="h-3.5 w-3.5 text-neutral-500" />
                        یادداشت آرایشگر (مدل موی دلخواه، حساسیت و...):
                      </label>
                      <div className="flex gap-2">
                        <input
                          name="notes"
                          defaultValue={c.notes ?? ""}
                          placeholder="مثلاً: فید متوسط شماره ۱، ریش خط‌ریش تیز..."
                          className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:border-amber-400"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition"
                        >
                          ثبت
                        </button>
                      </div>
                    </form>

                    {/* Quick SMS action */}
                    <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2.5">
                      <span className="text-[10px] text-neutral-500 font-mono">
                        عضویت: {new Date(c.created_at).toLocaleDateString("fa-IR")}
                      </span>
                      <a
                        href={`/admin?tab=sms&phone=${c.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>ارسال پیامک اختصاصی</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: Content & Shop Management */}
        {tab === "content" && (
          <div className="space-y-10">
            {/* 1. General Shop Information */}
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
              <h2 className="mb-4 text-base font-bold text-white">تنظیمات اصلی سالن</h2>
              <form action={updateShopSettings} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-400">نام سالن / آرایشگاه</label>
                    <input
                      name="name"
                      defaultValue={shop.name}
                      required
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-400">شماره تماس سالن</label>
                    <input
                      name="phone"
                      defaultValue={shop.phone}
                      required
                      dir="ltr"
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-right font-mono text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-400">آیدی اینستاگرام (بدون @)</label>
                    <input
                      name="instagram"
                      defaultValue={shop.instagram}
                      dir="ltr"
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-left font-mono text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-400">آدرس سالن</label>
                    <input
                      name="address"
                      defaultValue={shop.address}
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-400">لینک گوگل مپس / نقشه سالن</label>
                    <input
                      name="mapUrl"
                      defaultValue={shop.mapUrl}
                      dir="ltr"
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-left font-mono text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-neutral-400">متن پیام تبلیغاتی هدیه تولد</label>
                  <input
                    name="birthdayPromoText"
                    defaultValue={shop.birthdayPromoText}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-neutral-950 hover:bg-amber-300 transition"
                >
                  ذخیره اطلاعات سالن
                </button>
              </form>
            </section>

            {/* 2. Products Management */}
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
              <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">مدیریت محصولات سالن (نمایش در سمت راست)</h2>
                </div>
              </div>

              {/* Existing products */}
              <div className="mb-6 space-y-3">
                {shop.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{product.title}</span>
                        {product.tag && (
                          <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[11px] text-amber-300">
                            {product.tag}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">{product.description}</p>
                      <p className="mt-1 font-mono text-xs font-bold text-amber-400">{product.price}</p>
                    </div>

                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <button
                        type="submit"
                        className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition"
                        title="حذف محصول"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              {/* Add Product Form */}
              <form action={saveProduct} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-400">افزودن محصول جدید:</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    name="title"
                    placeholder="عنوان محصول (مثال: واکس مو مات)"
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <input
                    required
                    name="price"
                    placeholder="قیمت (مثال: ۳۰۰٬۰۰۰ تومان)"
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <input
                    name="tag"
                    placeholder="برچسب (مثال: پرفروش / ارگانیک)"
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
                <input
                  name="description"
                  placeholder="توضیحات کوتاه محصول..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  افزودن به لیست محصولات
                </button>
              </form>
            </section>

            {/* 3. Events & Discounts Management */}
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
              <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">مدیریت رویدادها و تخفیف‌ها (نمایش در سمت چپ)</h2>
                </div>
              </div>

              {/* Existing Events */}
              <div className="mb-6 space-y-3">
                {shop.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{event.title}</span>
                        {event.tag && (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                            {event.tag}
                          </span>
                        )}
                        <span className="font-mono text-xs text-neutral-500">• {event.date}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">{event.description}</p>
                    </div>

                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition"
                        title="حذف رویداد"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              {/* Add Event Form */}
              <form action={saveEvent} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-400">افزودن رویداد یا تخفیف جدید:</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    name="title"
                    placeholder="عنوان (مثال: جمعه‌های طلایی)"
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <input
                    required
                    name="date"
                    placeholder="زمان (مثال: جمعه این هفته ساعت ۱۶)"
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <input
                    name="tag"
                    placeholder="برچسب (مثال: تخفیف ۲۰٪ / رویداد)"
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
                <input
                  name="description"
                  placeholder="توضیحات رویداد..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  افزودن به لیست رویدادها
                </button>
              </form>
            </section>
          </div>
        )}

        {/* TAB 4: Unavailable Times & Schedule */}
        {tab === "schedule" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold">تنظیم زمان‌های عدم حضور و مرخصی آرایشگر</h2>
              <p className="text-xs text-neutral-400 mt-1">
                در این بخش می‌توانید روزها و ساعت‌هایی را که در سالن حضور ندارید مشخص کنید تا مشتریان در سایت نتوانند آن ساعت‌ها را رزرو کنند، و در صورت تمایل پیامی برای نمایش به آنها درج فرمایید.
              </p>
            </div>

            {/* Add Unavailable Time Form */}
            <AdminUnavailableForm minDate={iranToday()} />

            {/* List of active unavailable times */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarOff className="h-4 w-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    لیست ساعت‌ها و روزهای مسدودشده ({unavailableTimes.length})
                  </h3>
                </div>
                <span className="font-mono text-xs text-neutral-500">
                  از تاریخ {formatPersianDate(iranToday())} به بعد
                </span>
              </div>

              {unavailableTimes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center text-sm text-neutral-500">
                  در حال حاضر هیچ زمان عدم حضوری ثبت نشده است و تمام ساعات کاری سالن فعال هستند.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {unavailableTimes.map((item) => {
                    const isAllDay = item.time === "all-day" || item.time === "all" || item.time === "کل روز";
                    const persianDateDisplay = formatPersianDate(item.date);

                    return (
                      <article
                        key={item.id}
                        className="rounded-3xl border border-neutral-800/80 bg-neutral-900/70 p-5 backdrop-blur-sm transition hover:border-neutral-700 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-white">
                              {persianDateDisplay}
                            </span>
                            <span className="font-mono text-[11px] text-neutral-500">
                              {item.date}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isAllDay ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                                <Ban className="h-3.5 w-3.5" />
                                کل روز (عدم حضور کامل)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs font-bold text-amber-300">
                                <Clock className="h-3.5 w-3.5 text-amber-400" />
                                ساعت {item.time}
                              </span>
                            )}
                          </div>

                          {item.note ? (
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                              <span className="font-bold text-amber-400 block mb-1">
                                یادداشت برای مشتریان:
                              </span>
                              <p className="leading-relaxed">{item.note}</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-neutral-500 italic">
                              بدون یادداشت اختصاصی برای مشتریان
                            </p>
                          )}
                        </div>

                        <div className="border-t border-neutral-800/80 pt-3 flex items-center justify-between">
                          <span className="text-[10px] text-neutral-500">
                            مسدود در رزرو آنلاین
                          </span>
                          <form action={deleteUnavailableTime}>
                            <input type="hidden" name="id" value={item.id} />
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>حذف و فعال‌سازی مجدد</span>
                            </button>
                          </form>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 5: SMS Marketing & Broadcast */}
        {tab === "sms" && (
          <AdminSmsSection
            customers={smsCustomers}
            broadcasts={smsBroadcasts}
            defaultBarberPhone={getBarberPhones()[0] || "09376802989"}
            shopName={shop.name}
            initialPreselectedPhone={phone}
            error={error}
            sentCount={sent}
            failedCount={failed}
            testSent={test_sent}
            testTarget={test_target}
            testError={test_error}
          />
        )}

        {/* TAB 6: Analytics */}
        {tab === "analytics" && analyticsData && (
          <AnalyticsView data={analyticsData} currentRange={validRange} />
        )}
      </div>
    </main>
  );
}
