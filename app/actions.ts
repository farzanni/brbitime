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
import { getShopConfig, saveShopConfig, type ProductItem, type EventItem } from "@/lib/shop";

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
  const birthday = normalizeDigits(String(formData.get("birthday") ?? "").trim());

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
        phone,
        customer_birthday
      )
      VALUES (
        ${publicId},
        ${service},
        ${date},
        ${time},
        ${name},
        ${phone},
        ${birthday || null}
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

/** Admin: Update General Shop & Content settings */
export async function updateShopSettings(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const birthdayPromoText = String(formData.get("birthdayPromoText") ?? "").trim();

  await saveShopConfig({
    ...(name && { name }),
    ...(phone && { phone }),
    instagram,
    address,
    ...(birthdayPromoText && { birthdayPromoText }),
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=content&saved=1");
}

/** Admin: Add or edit a product */
export async function saveProduct(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const id = String(formData.get("id") ?? randomUUID().slice(0, 8));
  const title = String(formData.get("title") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();

  if (!title || !price) {
    redirect("/admin?tab=content&error=missing-fields");
  }

  const current = await getShopConfig();
  const existingIdx = current.products.findIndex((p) => p.id === id);
  const updatedItem: ProductItem = { id, title, price, description, tag };

  let newProducts = [...current.products];
  if (existingIdx >= 0) {
    newProducts[existingIdx] = updatedItem;
  } else {
    newProducts.push(updatedItem);
  }

  await saveShopConfig({ products: newProducts });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=content&saved=1");
}

/** Admin: Delete product */
export async function deleteProduct(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const id = String(formData.get("id") ?? "");
  const current = await getShopConfig();
  const filtered = current.products.filter((p) => p.id !== id);

  await saveShopConfig({ products: filtered });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=content&saved=1");
}

/** Admin: Add or edit an event */
export async function saveEvent(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const id = String(formData.get("id") ?? randomUUID().slice(0, 8));
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();

  if (!title || !date) {
    redirect("/admin?tab=content&error=missing-fields");
  }

  const current = await getShopConfig();
  const existingIdx = current.events.findIndex((e) => e.id === id);
  const updatedItem: EventItem = { id, title, date, description, tag };

  let newEvents = [...current.events];
  if (existingIdx >= 0) {
    newEvents[existingIdx] = updatedItem;
  } else {
    newEvents.push(updatedItem);
  }

  await saveShopConfig({ events: newEvents });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=content&saved=1");
}

/** Admin: Delete event */
export async function deleteEvent(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const id = String(formData.get("id") ?? "");
  const current = await getShopConfig();
  const filtered = current.events.filter((e) => e.id !== id);

  await saveShopConfig({ events: filtered });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=content&saved=1");
}
