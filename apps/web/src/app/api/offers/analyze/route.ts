import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { OfferInput, OfferAnalysis } from "@selfly/shared";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body: OfferInput & { listing_price: number; property_address?: string } =
      await request.json();

    const {
      offered_price,
      financing_type,
      down_payment_pct,
      inspection_contingency,
      appraisal_contingency,
      closing_date,
      seller_concessions,
      listing_price,
      property_address,
    } = body;

    if (!offered_price || !financing_type || listing_price === undefined) {
      return NextResponse.json(
        { error: "Offered price, financing type, and listing price are required" },
        { status: 400 }
      );
    }

    const priceDiff = ((offered_price - listing_price) / listing_price) * 100;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a real estate offer analyst helping a FSBO (For Sale By Owner) seller evaluate a buyer's offer. Analyze the following offer and return your response as JSON only, with no other text.

Listing Details:
- Listing Price: $${listing_price.toLocaleString()}
${property_address ? `- Property Address: ${property_address}` : ""}

Offer Details:
- Offered Price: $${offered_price.toLocaleString()} (${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(1)}% vs listing price)
- Financing Type: ${financing_type.toUpperCase()}
- Down Payment: ${down_payment_pct ?? "Not specified"}%
- Inspection Contingency: ${inspection_contingency ? "Yes" : "No"}
- Appraisal Contingency: ${appraisal_contingency ? "Yes" : "No"}
- Proposed Closing Date: ${closing_date || "Not specified"}
- Seller Concessions Requested: ${seller_concessions || "None"}

Evaluation Criteria (consider all of these):
1. Price vs listing price — how close is the offer? Lowball offers are a red flag.
2. Financing strength — Cash is strongest (no appraisal/financing risk), then Conventional, then FHA/VA (more requirements, potential delays).
3. Down payment — higher is better, shows buyer commitment and reduces lender risk.
4. Contingencies — fewer contingencies = less risk of deal falling through. Inspection and appraisal contingencies give buyer exit options.
5. Closing timeline — 30-45 days is typical. Very fast or very slow closings can be problematic.
6. Concessions — seller concessions reduce net proceeds.

Return a JSON object with exactly this structure:
{
  "score": <number 1-10, where 10 is a perfect offer>,
  "score_label": <"Strong Offer" if 8-10, "Moderate Offer" if 5-7, "Weak Offer" if 1-4>,
  "summary": <string - 2-3 sentence plain English summary of the offer's overall strength and key considerations>,
  "red_flags": [<array of strings - each string is a specific concern explained in one sentence. Empty array if no flags>],
  "counter_offer": {
    "suggested_price": <number - a reasonable counter-offer price as a whole number, or the offered price if acceptable>,
    "suggested_changes": [<array of strings - specific changes to suggest to the buyer>],
    "reasoning": <string - 2-3 sentence explanation of why these counter-terms are recommended>
  }
}

Be practical and specific. Real estate sellers need actionable advice, not generic statements. Return ONLY valid JSON, no markdown or other text.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const result: OfferAnalysis = JSON.parse(textBlock.text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Offer analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze offer" },
      { status: 500 }
    );
  }
}
