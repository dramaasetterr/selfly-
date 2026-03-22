import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan } = body;

    if (!email || !plan) {
      return NextResponse.json(
        { success: false, error: "Email and plan are required" },
        { status: 400 }
      );
    }

    // Log the waitlist entry for now
    console.log(`[Waitlist] email=${email} plan=${plan} at=${new Date().toISOString()}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
