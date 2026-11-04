"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import BrandLogo from "../BrandLogo";
import {
  Calendar,
  Clock,
  Scissors,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  Gift,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  getCustomerPortalData,
  cancelCustomerAppointment,
  type CustomerPortalData,
  type CustomerPortalAppointment,
} from "../actions";
import {
  getSavedCustomerProfile,
  saveCustomerProfile,
} from "@/lib/customerCache";
import { SERVICES } from "@/lib/booking";

function formatPersianDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getServiceName(serviceId: string): string {
  return SERVICES.find((s) => s.id === serviceId)?.name ?? serviceId;
}

export default function CustomerPortalClient({
  shopName,
  shopPhone,
  shopAddress,
}: {
  shopName: string;
  shopPhone: string;
  shopAddress?: string;
}) {
  const [phone, setPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    return getSavedCustomerProfile().phone || "";
  });
  const [inputPhone, setInputPhone] = useState("");
  const [data, setData] = useState<CustomerPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getSavedCustomerProfile().phone);
  });
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [cancellingAppt, setCancellingAppt] = useState<CustomerPortalAppointment | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load appointments when phone is present
  useEffect(() => {
    if (!phone) return;

    let isCurrent = true;
    getCustomerPortalData(phone)
      .then((res) => {
        if (!isCurrent) return;
        setData(res);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isCurrent) return;
        setActionMessage({ type: "error", text: "خطا در دریافت اطلاعات نوبت‌ها." });
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [phone]);

  // Keyboard accessibility: Close cancel dialog on Escape
  useEffect(() => {
    if (!cancellingAppt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCancellingAppt(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancellingAppt]);

  async function loadData(targetPhone: string) {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await getCustomerPortalData(targetPhone);
      setData(res);
      if (res.customer?.name) {
        saveCustomerProfile({ name: res.customer.name, phone: targetPhone });
      }
    } catch {
      setActionMessage({ type: "error", text: "خطا در دریافت اطلاعات نوبت‌ها." });
    } finally {
      setIsLoading(false);
    }
  }

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = inputPhone.trim();
    if (!/^0?9\d{9}$/.test(cleaned)) {
      setActionMessage({ type: "error", text: "لطفاً یک شماره موبایل معتبر ۱۱ رقمی (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید." });
      return;
    }
    const normalized = cleaned.startsWith("0") ? cleaned : "0" + cleaned;
    setPhone(normalized);
    saveCustomerProfile({ phone: normalized });
    loadData(normalized);
  }

  function handleCancelConfirm() {
    if (!cancellingAppt || !phone) return;

    startTransition(async () => {
      const res = await cancelCustomerAppointment(cancellingAppt.public_id, phone);
      if (res.success) {
        setActionMessage({
          type: "success",
          text: `نوبت شما برای ${formatPersianDate(cancellingAppt.appointment_date)} با موفقیت لغو شد.`,
        });
        setCancellingAppt(null);
        // Refresh local appointment state
        loadData(phone);
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "خطا در لغو نوبت.",
        });
      }
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const upcomingAppointments = (data?.appointments || []).filter(
    (a) => a.status === "booked" && a.appointment_date >= todayStr
  );

  const pastAppointments = (data?.appointments || []).filter(
    (a) => a.status === "cancelled" || a.appointment_date < todayStr
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black text-neutral-100 flex flex-col selection:bg-white/20 selection:text-white">
      {/* Top Glass Navbar */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandLogo size="sm" />
            <span className="font-extrabold text-sm tracking-wide text-white group-hover:text-neutral-200 transition">
              {shopName}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/#booking"
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/15 transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>رزرو جدید</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition"
              title="بازگشت به سایت"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">صفحه اصلی</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Banner Alert Toast */}
        {actionMessage && (
          <div
            className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-medium backdrop-blur-xl ${
              actionMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border-rose-500/30 bg-rose-950/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 transition"
            >
              بستن
            </button>
          </div>
        )}

        {/* View 1: If Phone is NOT provided yet */}
        {!phone ? (
          <div className="mx-auto max-w-md mt-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] mb-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <User className="h-8 w-8 text-neutral-300" />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white mb-2">
              مشاهده و مدیریت نوبت‌ها
            </h1>
            <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
              شماره موبایلی را که با آن رزرو کرده‌اید وارد کنید تا لیست نوبت‌های فعال و تاریخچه شما نمایش داده شود.
            </p>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="relative">
                <label htmlFor="customer-phone-input" className="sr-only">
                  شماره موبایل
                </label>
                <input
                  id="customer-phone-input"
                  type="tel"
                  dir="ltr"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-center font-mono text-base tracking-wider text-white placeholder-neutral-500 shadow-inner focus:border-white/40 focus:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-white focus:outline-none transition"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl border border-white/20 bg-white py-3.5 font-bold text-sm text-black shadow-[0_10px_25px_rgba(255,255,255,0.15)] hover:bg-neutral-200 transition active:scale-[0.98]"
              >
                مشاهده نوبت‌های من
              </button>
            </form>
          </div>
        ) : (
          /* View 2: Customer Loaded with Appointments */
          <div className="space-y-6">
            {/* Customer Profile Header Slab */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white shadow-inner">
                    <Scissors className="h-7 w-7 text-neutral-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {data?.customer?.name ? `${data.customer.name} عزیز` : "خوش آمدید"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400 font-mono">
                      <span>{phone}</span>
                      <span>•</span>
                      <button
                        onClick={() => {
                          setPhone("");
                          setData(null);
                        }}
                        className="text-neutral-400 hover:text-white underline transition"
                      >
                        تغییر شماره
                      </button>
                    </div>
                  </div>
                </div>

                {/* Loyalty & Visits Badge */}
                <div className="flex items-center gap-3">
                  {data?.customer?.total_visits ? (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-right">
                      <span className="block text-[10px] text-emerald-400 font-semibold">مشتری وفادار</span>
                      <span className="text-xs font-bold text-emerald-200">
                        {data.customer.total_visits} نوبت ثبت شده
                      </span>
                    </div>
                  ) : null}

                  {data?.customer?.birthday && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-xs text-purple-200 font-medium">
                      <Gift className="h-3.5 w-3.5 text-purple-400" />
                      <span>تخفیف تولد فعال</span>
                    </div>
                  )}

                  <button
                    onClick={() => loadData(phone)}
                    disabled={isLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:border-white/20 transition active:scale-95 disabled:opacity-50"
                    title="به‌روزرسانی"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div role="tablist" aria-label="مدیریت نوبت‌ها" className="flex gap-2 border-b border-white/[0.08] pb-1">
              <button
                role="tab"
                aria-selected={activeTab === "upcoming"}
                onClick={() => setActiveTab("upcoming")}
                className={`relative px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl ${
                  activeTab === "upcoming"
                    ? "text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <span>نوبت‌های پیش‌رو</span>
                <span className="mr-2 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-mono">
                  {upcomingAppointments.length}
                </span>
                {activeTab === "upcoming" && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                )}
              </button>

              <button
                role="tab"
                aria-selected={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                className={`relative px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl ${
                  activeTab === "history"
                    ? "text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <span>تاریخچه و لغو شده‌ها</span>
                <span className="mr-2 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-mono">
                  {pastAppointments.length}
                </span>
                {activeTab === "history" && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                )}
              </button>
            </div>

            {/* Tab 1: Upcoming Appointments */}
            {activeTab === "upcoming" && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="py-16 text-center text-sm text-neutral-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-400" />
                    <span>در حال بارگذاری نوبت‌های شما...</span>
                  </div>
                ) : upcomingAppointments.length === 0 ? (
                  <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
                    <Calendar className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">
                      نوبت فعالی ندارید
                    </h3>
                    <p className="text-xs text-neutral-400 mb-6 max-w-sm mx-auto">
                      در حال حاضر نوبت رزرو شده‌ای برای این شماره ثبت نشده است. می‌توانید به سادگی نوبت جدید رزرو کنید.
                    </p>
                    <Link
                      href="/#booking"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-2.5 text-xs font-bold text-black shadow-lg hover:bg-neutral-200 transition active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>رزرو آنلاین نوبت</span>
                    </Link>
                  </div>
                ) : (
                  upcomingAppointments.map((appt) => (
                    <div
                      key={appt.public_id}
                      className="group relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-6 backdrop-blur-xl transition hover:border-white/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="space-y-3">
                          {/* Service and Status Badge */}
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              رزرو شده و معتبر
                            </span>
                            <span className="text-xs text-neutral-400">
                              ثبت شده برای {appt.customer_name}
                            </span>
                          </div>

                          {/* Service Title */}
                          <h4 className="text-lg font-black text-white">
                            {getServiceName(appt.service)}
                          </h4>

                          {/* Date and Time Details */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-neutral-400" />
                              <span className="font-medium">
                                {formatPersianDate(appt.appointment_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-neutral-400" />
                              <span className="font-bold font-mono tracking-wider text-white">
                                ساعت {appt.appointment_time}
                              </span>
                            </div>
                          </div>

                          {shopAddress && (
                            <p className="text-[11px] text-neutral-500">
                              📍 آدرس: {shopAddress}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons: Cancel and Call */}
                        <div className="flex sm:flex-col items-center sm:items-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                          <button
                            type="button"
                            onClick={() => setCancellingAppt(appt)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>لغو این نوبت</span>
                          </button>

                          <a
                            href={`tel:${shopPhone}`}
                            className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition py-1"
                          >
                            <Phone className="h-3 w-3" />
                            <span>تماس با سالن</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Past Appointments & History */}
            {activeTab === "history" && (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="py-16 text-center text-sm text-neutral-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-400" />
                    <span>در حال بارگذاری...</span>
                  </div>
                ) : pastAppointments.length === 0 ? (
                  <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-xs text-neutral-500">
                    هیچ سابقه قبلی یا نوبت لغو شده‌ای یافت نشد.
                  </div>
                ) : (
                  pastAppointments.map((appt) => {
                    const isCancelled = appt.status === "cancelled";
                    return (
                      <div
                        key={appt.public_id}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-neutral-300 backdrop-blur-md flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {getServiceName(appt.service)}
                            </span>
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400 font-semibold">
                                <XCircle className="h-3 w-3" />
                                لغو شده
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-[10px] text-neutral-400">
                                انجام شده
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-neutral-400">
                            <span>{formatPersianDate(appt.appointment_date)}</span>
                            <span>•</span>
                            <span className="font-mono">ساعت {appt.appointment_time}</span>
                          </div>
                        </div>

                        <Link
                          href="/#booking"
                          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition"
                        >
                          رزرو مجدد
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Zero-Friction Cancellation */}
      {cancellingAppt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-neutral-950 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h3 className="text-lg font-black text-white">
              آیا از لغو نوبت اطمینان دارید؟
            </h3>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-300 space-y-1.5 text-right font-medium">
              <div className="flex justify-between">
                <span className="text-neutral-500">سرویس:</span>
                <span className="font-bold text-white">{getServiceName(cancellingAppt.service)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">تاریخ:</span>
                <span>{formatPersianDate(cancellingAppt.appointment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">ساعت:</span>
                <span className="font-mono">{cancellingAppt.appointment_time}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              با لغو نوبت، این ساعت برای سایر مشتریان آزاد خواهد شد و پیامک اطلاع‌رسانی لغو برای سالن ارسال می‌شود.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={isPending}
                className="flex-1 rounded-xl border border-rose-500/40 bg-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950 hover:bg-rose-500 transition active:scale-95 disabled:opacity-50"
              >
                {isPending ? "در حال لغو..." : "بله، لغو شود"}
              </button>

              <button
                type="button"
                onClick={() => setCancellingAppt(null)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
