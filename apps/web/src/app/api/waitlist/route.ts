import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan, source } = body;

    if (!email || !plan) {
      return NextResponse.json(
        { success: false, error: "Email and plan are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("waitlist").insert({
      email: email.trim().toLowerCase(),
      plan,
      source: source || "web",
    });

    if (error) {
      console.error("[Waitlist] insert error:", error.message);
      return NextResponse.json(
        { success: false, error: "Could not save your email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
