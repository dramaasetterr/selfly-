import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

// Reverse map: price ID -> plan name
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_SELLER_PRO!]: "seller_pro",
  [process.env.STRIPE_PRICE_FULL_SERVICE!]: "full_service",
};

// Admin Supabase client with service role (bypasses RLS)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const planId = session.metadata?.plan_id;

    if (!userId) {
      console.error("No supabase_user_id in session metadata");
      return NextResponse.json(
        { error: "Missing user ID in metadata" },
        { status: 400 }
      );
    }

    // Determine plan from metadata first, fall back to price ID lookup
    let plan = planId;
    if (!plan && session.line_items) {
      // If planId wasn't in metadata for some reason, look up by price
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id
      );
      const priceId = lineItems.data[0]?.price?.id;
      if (priceId) {
        plan = PRICE_TO_PLAN[priceId];
      }
    }

    if (!plan) {
      console.error("Could not determine plan from session:", session.id);
      return NextResponse.json(
        { error: "Could not determine plan" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update user plan:", error);
      return NextResponse.json(
        { error: "Failed to update user plan" },
        { status: 500 }
      );
    }

    console.log(`Updated user ${userId} to plan: ${plan}`);
  }

  return NextResponse.json({ received: true });
}
