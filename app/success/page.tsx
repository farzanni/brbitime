import Link from "next/link";
import { getSql } from "@/lib/db";
import { SERVICES } from "@/lib/booking";
import { cancelMyBooking } from "../actions";

export const dynamic = "force-dynamic";

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

  let appointment: Appointment | null = null;

  if (id && UUID_PATTERN.test(id)) {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        service,
        appointment_date,
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
      appointment.service
    : null;

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-white"
    >
      <div className="w-full max-w-md text-center">
        <div className="mb-5 text-5xl">{cancelled ? "✕" : "✓"}</div>

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
                📅 {appointment.appointment_date} — ⏰{" "}
                {appointment.appointment_time}
              </p>
            </div>

            <p className="mt-5 leading-7 text-neutral-400">
              این صفحه را اسکرین‌شات بگیر. اگر تغییرش می‌خواهی می‌توانی همین‌جا
              لغو کنی یا با آرایشگاه تماس بگیری.
            </p>

            <form action={cancelMyBooking} className="mt-6">
              <input type="hidden" name="publicId" value={id} />
              <button
                type="submit"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-4 font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
              >
                لغو این نوبت
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">نوبت شما ثبت شد</h1>

            <p className="mt-3 leading-7 text-neutral-400">
              در صورت نیاز آرایشگاه با شما تماس می‌گیرد.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-8 block rounded-2xl bg-white p-4 font-semibold text-black"
        >
          بازگشت
        </Link>
      </div>
    </main>
  );
}
