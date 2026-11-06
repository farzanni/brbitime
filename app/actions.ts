"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSql } from "@/lib/db";
import {
  SERVICES,
  TIME_SLOTS,
  iranToday,
  normalizeDigits,
  isHaircutService,
  OTHER_SLOT_MINUTES,
  getSlotsForService,
  isSlotPast,
} from "@/lib/booking";
import {
  adminPasswordMatches,
  clearAdminSession,
  createAdminSession,
  isAdmin,
} from "@/lib/admin";
import { notifyBooking, notifyCancellation } from "@/lib/notify";
import { getShopConfig, saveShopConfig, type ProductItem, type EventItem } from "@/lib/shop";
import { parseBirthday } from "@/lib/birthday";
import { recordAnalyticsEvent } from "@/lib/analytics";
import { addUnavailableRecords, deleteUnavailableRecord } from "@/lib/unavailable";
import { dispatchUpcomingReminders, checkRemindersOpportunistically } from "@/lib/reminders";


export async function bookAppointment(formData: FormData) {
  const service = String(formData.get("service") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeDigits(String(formData.get("phone") ?? ""));
  const rawBirthday = String(formData.get("birthday") ?? "").trim();
  const birthday = parseBirthday(rawBirthday)?.normalized ?? null;

  const isHaircut = isHaircutService(service);

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

  if (isHaircut && !time.endsWith(":۰۰")) {
    redirect("/?error=invalid");
  }
  if (!isHaircut && !OTHER_SLOT_MINUTES.some((m) => time.endsWith(m))) {
    redirect("/?error=invalid");
  }

  // Reject slots that have already passed
  if (isSlotPast(date, time, isHaircut)) {
    redirect("/?error=slot-passed");
  }

  const sql = getSql();

  // Validate that the requested slot is currently available
  const [existingAppts, unavailableRows] = await Promise.all([
    sql`
      SELECT appointment_time, service
      FROM appointments
      WHERE appointment_date = ${date}
        AND status = 'booked'
    `,
    sql`
      SELECT time, note
      FROM unavailable_times
      WHERE date = ${date}
    `.catch(() => []),
  ]);

  const availableSlots = getSlotsForService(
    service,
    existingAppts.map((r) => ({
      time: String(r.appointment_time),
      service: String(r.service),
    })),
    unavailableRows.map((r) => ({
      time: String(r.time),
      note: r.note ? String(r.note) : null,
    })),
    date
  );

  const slotStatus = availableSlots.find((s) => s.time === time);
  if (!slotStatus || slotStatus.isBooked || slotStatus.isPassed) {
    if (slotStatus?.isPassed) {
      redirect("/?error=slot-passed");
    }
    redirect("/?error=slot-taken");
  }

  const publicId = randomUUID();

  try {
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

  after(async () => {
    await Promise.allSettled([
      // Upsert customer CRM record
      sql`
        INSERT INTO customers (
          phone,
          name,
          birthday,
          total_visits,
          last_visit_at,
          updated_at
        )
        VALUES (
          ${phone},
          ${name},
          ${birthday || null},
          1,
          NOW(),
          NOW()
        )
        ON CONFLICT (phone) DO UPDATE
        SET
          name = EXCLUDED.name,
          birthday = COALESCE(customers.birthday, EXCLUDED.birthday),
          total_visits = customers.total_visits + 1,
          last_visit_at = NOW(),
          updated_at = NOW()
      `,
      recordAnalyticsEvent({
        eventName: "booking_success",
        eventData: {
          publicId,
          service,
          date,
          time,
          name,
        },
      }),
      notifyBooking({
        publicId,
        service,
        date,
        time,
        name,
        phone,
      }),
      checkRemindersOpportunistically(),
    ]);
  });

  revalidatePath("/admin");
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

  after(async () => {
    await recordAnalyticsEvent({
      eventName: "booking_cancelled",
      eventData: { id, cancelledBy: "admin" },
    });
  });

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

  const sql = getSql();
  const rows = await sql`
    UPDATE appointments
    SET status = 'cancelled'
    WHERE public_id = ${publicId}
      AND status = 'booked'
    RETURNING service, appointment_date::text AS appointment_date, appointment_time, customer_name, phone
  `;

  if (rows && rows.length > 0) {
    const appt = rows[0];
    after(async () => {
      await Promise.allSettled([
        recordAnalyticsEvent({
          eventName: "booking_cancelled",
          eventData: { publicId, cancelledBy: "customer" },
        }),
        notifyCancellation({
          service: String(appt.service),
          date: String(appt.appointment_date),
          time: String(appt.appointment_time),
          name: String(appt.customer_name),
          phone: String(appt.phone),
        }),
      ]);
    });
  }

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
  const mapUrl = String(formData.get("mapUrl") ?? "").trim();
  const birthdayPromoText = String(formData.get("birthdayPromoText") ?? "").trim();

  await saveShopConfig({
    ...(name && { name }),
    ...(phone && { phone }),
    instagram,
    address,
    mapUrl,
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

  const newProducts = [...current.products];
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

  const newEvents = [...current.events];
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

/** Register or update customer from onboarding modal */
export async function registerCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeDigits(String(formData.get("phone") ?? ""));
  const rawBirthday = String(formData.get("birthday") ?? "").trim();
  const birthday = parseBirthday(rawBirthday)?.normalized ?? null;

  if (!/^09\d{9}$/.test(phone) || name.length < 2) {
    return { success: false, error: "شماره موبایل یا نام معتبر نیست." };
  }

  const sql = getSql();
  await sql`
    INSERT INTO customers (
      phone,
      name,
      birthday,
      total_visits,
      last_visit_at,
      updated_at
    )
    VALUES (
      ${phone},
      ${name},
      ${birthday || null},
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (phone) DO UPDATE
    SET
      name = EXCLUDED.name,
      birthday = COALESCE(customers.birthday, EXCLUDED.birthday),
      updated_at = NOW()
  `;

  revalidatePath("/admin");
  return { success: true };
}

/** Admin: Update notes for a customer */
export async function updateCustomerNote(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!phone) {
    redirect("/admin?tab=customers");
  }

  const sql = getSql();
  await sql`
    UPDATE customers
    SET notes = ${notes}, updated_at = NOW()
    WHERE phone = ${phone}
  `;

  revalidatePath("/admin");
  redirect("/admin?tab=customers&saved=1");
}

/** Admin: Add unavailable times (blocked hours or all-day) with optional customer note */
export async function addUnavailableTimes(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const date = String(formData.get("date") ?? "").trim();
  const allDay = formData.get("allDay") === "true" || formData.get("allDay") === "1" || formData.get("allDay") === "on";
  const rawTimes = formData.getAll("times").map(String);
  const singleTime = String(formData.get("time") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect("/admin?tab=schedule&error=invalid-date");
  }

  const timesToBlock: string[] = [];
  if (allDay) {
    timesToBlock.push("all-day");
  } else {
    for (const t of rawTimes) {
      if (t.trim()) timesToBlock.push(t.trim());
    }
    if (singleTime && !timesToBlock.includes(singleTime)) {
      timesToBlock.push(singleTime);
    }
  }

  if (timesToBlock.length === 0) {
    redirect("/admin?tab=schedule&error=no-time");
  }

  await addUnavailableRecords(date, timesToBlock, note);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?tab=schedule&saved=1");
}

/** Admin: Delete an unavailable time record */
export async function deleteUnavailableTime(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await deleteUnavailableRecord(id);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?tab=schedule&saved=1");
}

function cleanIranPhone(raw: string): string {
  const digits = normalizeDigits(raw).replace(/\D/g, "");
  if (digits.startsWith("0098")) return "0" + digits.slice(4);
  if (digits.startsWith("98")) return "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("9")) return "0" + digits;
  return digits;
}

export interface CustomerPortalAppointment {
  id: number;
  public_id: string;
  service: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  phone: string;
  status: "booked" | "cancelled";
  customer_birthday: string | null;
  created_at: string;
}

export interface CustomerPortalData {
  customer: {
    name: string;
    phone: string;
    birthday: string | null;
    total_visits: number;
  } | null;
  appointments: CustomerPortalAppointment[];
}

/** Get customer appointments and profile details for the portal */
export async function getCustomerPortalData(rawPhone: string): Promise<CustomerPortalData> {
  const phone = cleanIranPhone(rawPhone);
  if (!/^09\d{9}$/.test(phone)) {
    return { customer: null, appointments: [] };
  }

  const sql = getSql();
  const [customerRows, appointmentRows] = await Promise.all([
    sql`
      SELECT name, phone, birthday, total_visits
      FROM customers
      WHERE phone = ${phone}
      LIMIT 1
    `,
    sql`
      SELECT
        id,
        public_id,
        service,
        appointment_date::text,
        appointment_time,
        customer_name,
        phone,
        status,
        customer_birthday,
        created_at::text
      FROM appointments
      WHERE phone = ${phone}
      ORDER BY appointment_date DESC, appointment_time DESC
    `,
  ]);

  const customer = customerRows[0]
    ? {
        name: String(customerRows[0].name || ""),
        phone: String(customerRows[0].phone || phone),
        birthday: customerRows[0].birthday ? String(customerRows[0].birthday) : null,
        total_visits: Number(customerRows[0].total_visits || 0),
      }
    : null;

  const appointments: CustomerPortalAppointment[] = (appointmentRows || []).map((row) => ({
    id: Number(row.id),
    public_id: String(row.public_id),
    service: String(row.service),
    appointment_date: String(row.appointment_date),
    appointment_time: String(row.appointment_time),
    customer_name: String(row.customer_name),
    phone: String(row.phone),
    status: row.status === "cancelled" ? "cancelled" : "booked",
    customer_birthday: row.customer_birthday ? String(row.customer_birthday) : null,
    created_at: String(row.created_at),
  }));

  return { customer, appointments };
}

/** Zero-friction appointment cancellation by customer */
export async function cancelCustomerAppointment(publicId: string, rawPhone: string) {
  const phone = cleanIranPhone(rawPhone);
  if (!PUBLIC_ID_PATTERN.test(publicId) || !/^09\d{9}$/.test(phone)) {
    return { success: false, error: "شناسه نوبت یا شماره تماس نامعتبر است." };
  }

  const sql = getSql();

  // Find the appointment first to verify phone match and gather details for alert
  const rows = await sql`
    SELECT id, service, appointment_date::text, appointment_time, customer_name, phone
    FROM appointments
    WHERE public_id = ${publicId}
      AND phone = ${phone}
      AND status = 'booked'
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    return {
      success: false,
      error: "نوبت یافت نشد یا قبلاً لغو شده است.",
    };
  }

  const appt = rows[0];

  // Cancel in Neon DB
  await sql`
    UPDATE appointments
    SET status = 'cancelled'
    WHERE id = ${appt.id}
  `;

  revalidatePath("/admin");
  revalidatePath("/my");

  // Alert the barber via SMS in background
  after(async () => {
    await notifyCancellation({
      service: String(appt.service),
      date: String(appt.appointment_date),
      time: String(appt.appointment_time),
      name: String(appt.customer_name),
      phone: String(appt.phone),
    });
  });

  return { success: true };
}

/** Update customer name (birthday remains immutable) */
export async function updateCustomerName(rawPhone: string, newName: string) {
  const phone = cleanIranPhone(rawPhone);
  const name = newName.trim();
  if (!/^09\d{9}$/.test(phone) || name.length < 2 || name.length > 80) {
    return { success: false, error: "نام وارد شده باید بین ۲ تا ۸۰ حرف باشد." };
  }

  const sql = getSql();
  await sql`
    UPDATE customers
    SET name = ${name}, updated_at = NOW()
    WHERE phone = ${phone}
  `;

  await sql`
    UPDATE appointments
    SET customer_name = ${name}
    WHERE phone = ${phone}
  `;

  revalidatePath("/admin");
  revalidatePath("/my");
  return { success: true };
}

/** Admin: Trigger appointment reminders check immediately */
export async function triggerManualReminders() {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const result = await dispatchUpcomingReminders();
  revalidatePath("/admin");
  redirect(`/admin?tab=appointments&reminded=${result.sentCount}`);
}


