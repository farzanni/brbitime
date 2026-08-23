"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import { SERVICES, TIME_SLOTS, iranToday } from "@/lib/booking";
import {
  adminPasswordMatches,
  clearAdminSession,
  createAdminSession,
  isAdmin,
} from "@/lib/admin";
import { notifyBooking } from "@/lib/notify";

function normalizeDigits(value: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .replace(/[\s-]/g, "");
}

export async function bookAppointment(formData: FormData) {
  const service = String(formData.get("service") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeDigits(String(formData.get("phone") ?? ""));

  const valid =
    SERVICES.some((item) => item.id === service) &&
    TIME_SLOTS.some((slot) => slot === time) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= iranToday() &&
    name.length >= 2 &&
    name.length <= 80 &&
    /^09\d{9}$/.test(phone);

  if (!valid) {
    redirect("/?error=invalid");
  }

  const publicId = randomUUID();

  try {
    const sql = getSql();
    await sql`
      INSERT INTO appointments (
        public_id,
        service,
        appointment_date,
        appointment_time,
        customer_name,
        phone
      )
      VALUES (
        ${publicId},
        ${service},
        ${date},
        ${time},
        ${name},
        ${phone}
      )
    `;
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      redirect("/?error=slot-taken");
    }

    throw error;
  }

  revalidatePath("/admin");

  await notifyBooking({
    publicId,
    service,
    date,
    time,
    name,
    phone,
  });

  redirect(`/success?id=${publicId}`);
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!adminPasswordMatches(password)) {
    redirect("/admin?error=login");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin");
}

export async function cancelAppointment(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    return;
  }

  await getSql()`
    UPDATE appointments
    SET status = 'cancelled'
    WHERE id = ${id}
      AND status = 'booked'
  `;

  revalidatePath("/admin");
}

const PUBLIC_ID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/** Customer cancels their own booking via their private success-page link. */
export async function cancelMyBooking(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");

  if (!PUBLIC_ID_PATTERN.test(publicId)) {
    redirect("/");
  }

  await getSql()`
    UPDATE appointments
    SET status = 'cancelled'
    WHERE public_id = ${publicId}
      AND status = 'booked'
  `;

  revalidatePath("/admin");
  redirect(`/success?id=${publicId}&cancelled=1`);
}
