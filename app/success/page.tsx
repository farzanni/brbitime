import type { Metadata } from "next";
import Link from "next/link";
import { getSql } from "@/lib/db";
import { SERVICES, formatPersianDate } from "@/lib/booking";
import { getShopConfig } from "@/lib/shop";
import BrandLogo from "../BrandLogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نتیجه رزرو نوبت",
  robots: {
    index: false,
    follow: false,
  },
};

type Appointment = {
  service: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
};

const UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; cancelled?: string }>;
}) {
  const { id, cancelled } = await searchParams;
  const shop = await getShopConfig();

  let appointment: Appointment | null = null;

  if (id && UUID_PATTERN.test(id)) {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        service,
        appointment_date::text AS appointment_date,
        appointment_time,
        customer_name,
        status
      FROM appointments
      WHERE public_id = ${id}
      LIMIT 1
    `) as (Appointment & { status: string })[];

    if (rows[0]?.status === "booked") {
      appointment = rows[0];
    }
  }

  const serviceName = appointment
    ? SERVICES.find((item) => item.id === appointment.service)?.name ??
      (appointment.service === "combo" ? "پکیج کامل (مو + ریش)" : appointment.service)
    : null;

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-white"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex justify-center">
          <BrandLogo size="md" />
        </div>
        <div className="mb-5 text-4xl">{cancelled ? "✕" : "✓"}</div>

        {cancelled ? (
          <>
            <h1 className="text-2xl font-bold">نوبتت لغو شد</h1>
            <p className="mt-3 leading-7 text-neutral-400">
              هر وقت خواستی دوباره رزرو کن.
            </p>
          </>
        ) : appointment ? (
          <>
            <h1 className="text-2xl font-bold">
              {appointment.customer_name}، نوبتت ثبت شد!
            </h1>

            <div className="mt-6 space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-sm">
              <p>💈 {serviceName}</p>
              <p>
                📅 {formatPersianDate(appointment.appointment_date)} — ⏰{" "}
                {appointment.appointment_time}
              </p>
              {shop.address && (
                <div className="mt-3 pt-3 border-t border-neutral-800 text-xs text-neutral-400 space-y-1 text-center">
                  <p>📍 {shop.address}</p>
                  {shop.mapUrl && (
                    <a
                      href={shop.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-white/80 hover:text-white underline underline-offset-4"
                    >
                      مسیریابی روی نقشه گوگل ←
                    </a>
                  )}
                </div>
              )}
            </div>

            <p className="mt-5 leading-7 text-neutral-400">
              می‌توانی نوبت‌هایت را در پنل خودت مشاهده و در صورت نیاز لغو کنی.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">نوبت شما ثبت شد</h1>

            <p className="mt-3 leading-7 text-neutral-400">
              می‌توانید نوبت‌های خود را در پنل کاربری مشاهده کرده و در صورت نیاز لغو کنید.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/my"
            className="flex-1 rounded-2xl border border-white/20 bg-white/10 p-4 font-semibold text-white backdrop-blur-md hover:bg-white/15 transition text-center"
          >
            مشاهده نوبت‌ها در پنل
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-2xl bg-white p-4 font-semibold text-black hover:bg-neutral-200 transition text-center"
          >
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </main>
  );
}
