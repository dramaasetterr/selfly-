import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json, OPTIONS } from "../../../_cors";

export { OPTIONS };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    if (!listingId) {
      return json({ error: "Listing ID is required" }, 400);
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("showing_availability")
      .select("*")
      .eq("listing_id", listingId)
      .eq("is_booked", false)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return json({ error: "Failed to fetch availability" }, 500);
    }

    return json({ slots: data });
  } catch (error) {
    console.error("Availability API error:", error);
    return json({ error: "Failed to fetch availability" }, 500);
  }
}
