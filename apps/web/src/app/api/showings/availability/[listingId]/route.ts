import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json, OPTIONS } from "../../../_cors";

export { OPTIONS };

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing Supabase env (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

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

    const { data, error } = await getSupabase()
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
  } catch {
    return json({ error: "Failed to fetch availability" }, 500);
  }
}
