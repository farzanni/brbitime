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
  const rows = await sql`
    SELECT appointment_time
    FROM appointments
    WHERE appointment_date = ${date}
      AND status = 'booked'
  `;

  return Response.json(
    {
      bookedTimes: rows.map(
        (row) => row.appointment_time as string
      ),
    },
    {
      headers: {
        "Cache-Control": AVAILABILITY_CACHE,
      },
    },
  );
}
