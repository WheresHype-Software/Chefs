import { NextResponse, type NextRequest } from "next/server";
import { getMonthCalendar } from "@/lib/data";

// Chef ids are UUIDs (demo chefs use short slugs such as "c-marta").
const CHEF_ID = /^[a-z0-9-]{1,64}$/i;

/**
 * GET /api/calendar?chef=<id>&year=2026&month=9 (0-based month) → { available, booked }.
 * A plain GET rather than a server action: reads should not depend on build-specific action ids,
 * which change on every deploy and break pages that were open during it.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const chef = params.get("chef") ?? "";
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  if (!CHEF_ID.test(chef) || !Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const calendar = await getMonthCalendar(chef, year, month);
    // Availability changes as chefs edit their agenda and bookings land: never cache.
    return NextResponse.json(calendar, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/calendar]", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
