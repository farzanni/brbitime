import { getSql } from "@/lib/db";
import { iranToday } from "@/lib/booking";

export const dynamic = "force-dynamic";

/**
 * Staleness budget: 10s fresh, then served stale for up to 60s while the edge
 * revalidates in the background. A slot booked inside that window still fails
 * loudly — the `appointments_slot_unique` index rejects the duplicate and the
 * server action redirects to /?error=slot-taken — so the trade-off is a rare
 * retry instead of a cross-continent round trip on every date tap.
 */
const AVAILABILITY_CACHE = "public, s-maxage=10, stale-while-revalidate=60";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < iranToday()) {
    return Response.json(
      { bookedTimes: [] },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }



  const sql = getSql();
  const [appointmentRows, unavailableRows] = await Promise.all([
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

  const unavailable = unavailableRows.map((row) => ({
    time: String(row.time),
    note: row.note ? String(row.note) : null,
  }));

  const isAllDayUnavailable = unavailable.some(
    (u) => u.time === "all-day" || u.time === "all" || u.time === "کل روز"
  );
  const allDayNote =
    unavailable.find(
      (u) => u.time === "all-day" || u.time === "all" || u.time === "کل روز"
    )?.note ?? null;

  return Response.json(
    {
      bookedTimes: appointmentRows.map(
        (row) => row.appointment_time as string
      ),
      appointments: appointmentRows.map((row) => ({
        time: row.appointment_time as string,
        service: row.service as string,
      })),
      unavailable,
      isAllDayUnavailable,
      allDayNote,
    },
    {
      headers: {
        "Cache-Control": AVAILABILITY_CACHE,
      },
    },
  );
}
