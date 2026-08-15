import { sql } from "@/lib/db";
import { iranToday } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < iranToday()) {
    return Response.json({ bookedTimes: [] }, { status: 400 });
  }



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
        "Cache-Control": "no-store",
      },
    },
  );
}
