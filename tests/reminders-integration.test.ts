import { describe, expect, it } from "bun:test";
import { getSql } from "../lib/db";
import { dispatchUpcomingReminders } from "../lib/reminders";
import { getIranDateTime } from "../lib/booking";

describe("Reminders Database Integration", () => {
  it("processes upcoming appointment, sets reminder_sent_at, and avoids double-dispatch", async () => {
    if (!process.env.DATABASE_URL) {
      console.log("Skipping DB integration test: DATABASE_URL not set");
      return;
    }
    const sql = getSql();
    const iranNow = getIranDateTime();
    const today = iranNow.date;

    // Calculate a slot 25 minutes from now in Iran time
    const futureDate = new Date(Date.now() + 25 * 60 * 1000);
    const futureIran = getIranDateTime(futureDate);
    const hourStr = String(futureIran.hour).padStart(2, "0");
    const minuteStr = String(futureIran.minute).padStart(2, "0");
    const apptTime = `${hourStr}:${minuteStr}`;

    const testPublicId = `test-reminder-${Date.now()}`;
    const testPhone = "09376802989";

    // Insert dummy appointment created 30 minutes ago (so not marked as recently_booked)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const inserted = await sql`
      INSERT INTO appointments (
        public_id,
        service,
        appointment_date,
        appointment_time,
        customer_name,
        phone,
        status,
        created_at
      )
      VALUES (
        ${testPublicId},
        'haircut',
        ${today},
        ${apptTime},
        'تست یادآوری',
        ${testPhone},
        'booked',
        ${thirtyMinAgo.toISOString()}
      )
      RETURNING id, reminder_sent_at
    `;

    const apptId = inserted[0].id;
    expect(inserted[0].reminder_sent_at).toBeNull();

    try {
      // 1. First run: should detect and dispatch reminder
      const result1 = await dispatchUpcomingReminders();
      const match = result1.details.find((d) => d.id === apptId);
      expect(match).toBeDefined();
      expect(match?.action).toBe("sent");

      // Verify DB now has reminder_sent_at
      const rows = await sql`SELECT reminder_sent_at FROM appointments WHERE id = ${apptId}`;
      expect(rows[0].reminder_sent_at).not.toBeNull();

      // 2. Second run: should NOT send again (idempotent)
      const result2 = await dispatchUpcomingReminders();
      const match2 = result2.details.find((d) => d.id === apptId);
      expect(match2).toBeUndefined();
    } finally {
      // Clean up test appointment
      await sql`DELETE FROM appointments WHERE id = ${apptId}`;
    }
  });
});
