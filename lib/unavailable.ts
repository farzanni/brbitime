import { getSql } from "@/lib/db";
import { toPersianDigits } from "@/lib/booking";

export interface UnavailableTime {
  id: number;
  date: string;
  time: string;
  note: string | null;
  created_at: string;
}

let tableEnsured = false;

/**
 * Ensures the unavailable_times table exists with appropriate indexes.
 */
export async function ensureUnavailableTimesTable(): Promise<void> {
  if (tableEnsured) return;
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS unavailable_times (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS unavailable_times_date_time_unique
      ON unavailable_times (date, time)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS unavailable_times_date_idx
      ON unavailable_times (date)
    `;
    tableEnsured = true;
  } catch (err) {
    console.error("Error creating unavailable_times table:", err);
  }
}

/**
 * Fetches unavailable times, optionally filtering by minimum date (YYYY-MM-DD).
 */
export async function getUnavailableTimes(minDate?: string): Promise<UnavailableTime[]> {
  const sql = getSql();
  try {
    if (minDate) {
      const rows = await sql`
        SELECT id, date, time, note, created_at::text
        FROM unavailable_times
        WHERE date >= ${minDate}
        ORDER BY date ASC, time ASC
      `;
      return rows.map((r) => ({
        id: Number(r.id),
        date: String(r.date),
        time: String(r.time),
        note: r.note ? String(r.note) : null,
        created_at: String(r.created_at),
      }));
    }

    const rows = await sql`
      SELECT id, date, time, note, created_at::text
      FROM unavailable_times
      ORDER BY date ASC, time ASC
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      date: String(r.date),
      time: String(r.time),
      note: r.note ? String(r.note) : null,
      created_at: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches unavailable times for a specific date (YYYY-MM-DD).
 */
export async function getUnavailableForDate(date: string): Promise<UnavailableTime[]> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT id, date, time, note, created_at::text
      FROM unavailable_times
      WHERE date = ${date}
      ORDER BY time ASC
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      date: String(r.date),
      time: String(r.time),
      note: r.note ? String(r.note) : null,
      created_at: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * Adds unavailable times for a date. Supports multiple times or 'all-day'.
 */
export async function addUnavailableRecords(
  date: string,
  times: string[],
  note?: string
): Promise<void> {
  const sql = getSql();
  if (!tableEnsured) {
    await ensureUnavailableTimesTable();
  }

  const cleanNote = note?.trim() || null;

  await Promise.all(
    times.map((t) => {
      const cleanTime = t === "all-day" ? "all-day" : toPersianDigits(t.trim());
      return sql`
        INSERT INTO unavailable_times (date, time, note, created_at)
        VALUES (${date}, ${cleanTime}, ${cleanNote}, NOW())
        ON CONFLICT (date, time) DO UPDATE
        SET note = EXCLUDED.note
      `;
    })
  );
}

/**
 * Deletes an unavailable time record by ID.
 */
export async function deleteUnavailableRecord(id: number): Promise<void> {
  const sql = getSql();
  await sql`
    DELETE FROM unavailable_times
    WHERE id = ${id}
  `;
}
