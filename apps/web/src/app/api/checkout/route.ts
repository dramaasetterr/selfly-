import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, string> = {
  seller_pro: process.env.STRIPE_PRICE_SELLER_PRO!,
  full_service: process.env.STRIPE_PRICE_FULL_SERVICE!,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();

    if (!planId || !PRICE_MAP[planId]) {
      return NextResponse.json(
        { error: "Invalid plan. Must be seller_pro or full_service." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_MAP[planId],
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/upgrade?success=true`,
      cancel_url: `${appUrl}/upgrade?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
      },
      customer_email: user.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
