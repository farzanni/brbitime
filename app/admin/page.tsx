import { getSql } from "@/lib/db";
import { SERVICES, iranToday } from "@/lib/booking";
import { isAdmin } from "@/lib/admin";
import { getShopConfig } from "@/lib/shop";
import {
  cancelAppointment,
  loginAdmin,
  logoutAdmin,
  updateShopSettings,
  saveProduct,
  deleteProduct,
  saveEvent,
  deleteEvent,
} from "../actions";
import {
  Calendar,
  Clock,
  User,
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
} from "lucide-react";

export const dynamic = "force-dynamic";

type Appointment = {
  id: number;
  service: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  phone: string;
  customer_birthday?: string | null;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const { error, tab = "appointments", saved } = params;

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
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Scissors className="h-6 w-6" />
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
  const appointments = (await sql`
    SELECT
      id,
      service,
      appointment_date,
      appointment_time,
      customer_name,
      phone,
      customer_birthday
    FROM appointments
    WHERE status = 'booked'
      AND appointment_date >= ${iranToday()}
    ORDER BY appointment_date, appointment_time
  `) as Appointment[];

  const shop = await getShopConfig();

  return (
    <main dir="rtl" className="min-h-screen bg-neutral-950 text-white selection:bg-amber-400 selection:text-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-amber-400" />
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
        <div className="mb-8 flex gap-2 border-b border-neutral-800 pb-3">
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
        </div>

        {saved === "1" && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4" />
            تغییرات با موفقیت ذخیره و در سایت اعمال شد.
          </div>
        )}

        {/* TAB 1: Appointments */}
        {tab === "appointments" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold">لیست نوبت‌های پیش‌رو</h2>

            {appointments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center text-sm text-neutral-500">
                در حال حاضر نوبت فعالی ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {appointments.map((appointment) => {
                  const service =
                    SERVICES.find((item) => item.id === appointment.service)?.name ??
                    appointment.service;

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
                            <span>{appointment.appointment_date}</span>
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

                          {appointment.customer_birthday && (
                            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                              <Gift className="h-3.5 w-3.5 text-amber-400" />
                              <span>تولد مشتری: {appointment.customer_birthday}</span>
                            </div>
                          )}
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

        {/* TAB 2: Content & Shop Management */}
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
      </div>
    </main>
  );
}
