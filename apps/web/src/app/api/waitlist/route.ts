import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json, OPTIONS } from "../_cors";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan, source } = body;

    if (!email || !plan) {
      return json({ success: false, error: "Email and plan are required" }, 400);
    }

    const { error } = await getSupabase().from("waitlist").insert({
      email: email.trim().toLowerCase(),
      plan,
      source: source || "web",
    });

    if (error) {
      return json(
        { success: false, error: "Could not save your email. Please try again." },
        500
      );
    }

    return json({ success: true });
  } catch {
    return json({ success: false, error: "Invalid request" }, 400);
  }
}
