import { sql } from "@/lib/db";
import { SERVICES, iranToday } from "@/lib/booking";
import { isAdmin } from "@/lib/admin";
import {
  cancelAppointment,
  loginAdmin,
  logoutAdmin,
} from "../actions";

export const dynamic = "force-dynamic";

type Appointment = {
  id: number;
  service: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  phone: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!(await isAdmin())) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-neutral-950 p-5 text-white"
      >
        <form
          action={loginAdmin}
          className="w-full max-w-sm space-y-4 rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <h1 className="text-2xl font-bold">ورود آرایشگر</h1>

          {error === "login" && (
            <p className="text-sm text-red-400">رمز اشتباه است.</p>
          )}

          <input
            required
            type="password"
            name="password"
            placeholder="رمز عبور"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-4"
          />

          <button className="w-full rounded-xl bg-white p-4 font-semibold text-black">
            ورود
          </button>
        </form>
      </main>
    );
  }

  const appointments = (await sql`
    SELECT
      id,
      service,
      appointment_date,
      appointment_time,
      customer_name,
      phone
    FROM appointments
    WHERE status = 'booked'
      AND appointment_date >= ${iranToday()}
    ORDER BY appointment_date, appointment_time
  `) as Appointment[];

  return (
    <main dir="rtl" className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">پنل مدیریت</p>
            <h1 className="text-3xl font-bold">نوبت‌ها</h1>
          </div>

          <form action={logoutAdmin}>
            <button className="text-sm text-neutral-400">خروج</button>
          </form>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 p-8 text-center text-neutral-500">
            نوبتی ثبت نشده.
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const service =
                SERVICES.find((item) => item.id === appointment.service)?.name ??
                appointment.service;

              return (
                <article
                  key={appointment.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <h2 className="font-semibold">
                        {appointment.customer_name}
                      </h2>

                      <p className="mt-1 text-sm text-neutral-400">
                        {service}
                      </p>

                      <p className="mt-3">
                        {appointment.appointment_date} —{" "}
                        {appointment.appointment_time}
                      </p>

                      <a
                        href={`tel:${appointment.phone}`}
                        dir="ltr"
                        className="mt-2 block text-sm text-neutral-400"
                      >
                        {appointment.phone}
                      </a>
                    </div>

                    <form action={cancelAppointment}>
                      <input
                        type="hidden"
                        name="id"
                        value={appointment.id}
                      />

                      <button className="text-sm text-red-400">
                        لغو
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
