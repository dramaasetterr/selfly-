import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json, OPTIONS } from "../_cors";

export { OPTIONS };

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan, source } = body;

    if (!email || !plan) {
      return json({ success: false, error: "Email and plan are required" }, 400);
    }

    const { error } = await supabase.from("waitlist").insert({
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
