import { describe, expect, it } from "bun:test";
import {
  getAppointmentTimestampMs,
  evaluateAppointmentReminder,
} from "../lib/reminders";

describe("Appointment Reminder Logic", () => {
  it("correctly parses appointment dates and Persian times into Iran timestamp", () => {
    // 2026-11-06 16:00 in Asia/Tehran (UTC+03:30) is 12:30:00 UTC
    const tsPersian = getAppointmentTimestampMs("2026-11-06", "۱۶:۰۰");
    const tsAscii = getAppointmentTimestampMs("2026-11-06", "16:00");

    expect(tsPersian).toBe(tsAscii);
    expect(new Date(tsPersian).toISOString()).toBe("2026-11-06T12:30:00.000Z");

    // 09:40 in Asia/Tehran is 06:10:00 UTC
    const tsMorning = getAppointmentTimestampMs("2026-11-06", "۰۹:۴۰");
    expect(new Date(tsMorning).toISOString()).toBe("2026-11-06T06:10:00.000Z");
  });

  it("marks appointment as due when exactly 30 minutes before", () => {
    // Appointment at 16:00
    const appt = {
      appointment_date: "2026-11-06",
      appointment_time: "۱۶:۰۰",
      created_at: new Date("2026-11-05T12:00:00Z"), // Booked yesterday
    };

    // Current time: 15:30 (30 min before appointment)
    const now = new Date("2026-11-06T15:30:00+03:30");

    const result = evaluateAppointmentReminder(appt, now);
    expect(result.eligible).toBe(true);
    expect(result.status).toBe("due");
    expect(result.minutesUntil).toBe(30);
  });

  it("marks appointment as due when 25 minutes before (e.g. within 35 min window)", () => {
    const appt = {
      appointment_date: "2026-11-06",
      appointment_time: "۱۶:۰۰",
      created_at: new Date("2026-11-05T12:00:00Z"),
    };

    // Current time: 15:35 (25 min before appointment)
    const now = new Date("2026-11-06T15:35:00+03:30");

    const result = evaluateAppointmentReminder(appt, now);
    expect(result.eligible).toBe(true);
    expect(result.status).toBe("due");
    expect(result.minutesUntil).toBe(25);
  });

  it("marks appointment as due when 35 minutes before", () => {
    const appt = {
      appointment_date: "2026-11-06",
      appointment_time: "۱۶:۰۰",
      created_at: new Date("2026-11-05T12:00:00Z"),
    };

    // Current time: 15:25 (35 min before appointment)
    const now = new Date("2026-11-06T15:25:00+03:30");

    const result = evaluateAppointmentReminder(appt, now);
    expect(result.eligible).toBe(true);
    expect(result.status).toBe("due");
    expect(result.minutesUntil).toBe(35);
  });

  it("marks appointment as too_early when more than 35 minutes before", () => {
    const appt = {
      appointment_date: "2026-11-06",
      appointment_time: "۱۶:۰۰",
      created_at: new Date("2026-11-05T12:00:00Z"),
    };

    // Current time: 15:15 (45 min before appointment)
    const now = new Date("2026-11-06T15:15:00+03:30");

    const result = evaluateAppointmentReminder(appt, now);
    expect(result.eligible).toBe(false);
    expect(result.status).toBe("too_early");
    expect(result.minutesUntil).toBe(45);
  });

  it("marks appointment as past when appointment time has already passed", () => {
    const appt = {
      appointment_date: "2026-11-06",
      appointment_time: "۱۶:۰۰",
      created_at: new Date("2026-11-05T12:00:00Z"),
    };

    // Current time: 16:05 (5 minutes after appointment start)
    const now = new Date("2026-11-06T16:05:00+03:30");

    const result = evaluateAppointmentReminder(appt, now);
    expect(result.eligible).toBe(false);
    expect(result.status).toBe("past");
    expect(result.minutesUntil).toBe(-5);
  });

  it("skips duplicate SMS if appointment was booked recently (less than 15 min ago)", () => {
    // Customer booked at 15:35 for 16:00 (they just got confirmation SMS)
    const now = new Date("2026-11-06T15:40:00+03:30");
    const appt = {
      appointment_date: "2026-11-06",
      appointment_time: "۱۶:۰۰",
      created_at: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago
    };

    const result = evaluateAppointmentReminder(appt, now);
    expect(result.eligible).toBe(false);
    expect(result.status).toBe("recently_booked");
    expect(result.minutesUntil).toBe(20);
  });
});
