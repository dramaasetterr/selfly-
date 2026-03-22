import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { OfferInput, OfferAnalysis } from "@selfly/shared";
import { json, OPTIONS } from "../../_cors";

export { OPTIONS };

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing required environment variable: ANTHROPIC_API_KEY");
}

const anthropic = new Anthropic();

function generateFallbackAnalysis(body: OfferInput & { listing_price: number; property_address?: string }): OfferAnalysis & { source: "fallback" } {
  const {
    offered_price,
    financing_type,
    down_payment_pct,
    inspection_contingency,
    appraisal_contingency,
    closing_date,
    seller_concessions,
    listing_price,
  } = body;

  // Score components (each out of a subtotal, totaling max 10)
  let score = 0;

  // 1. Price vs listing (0-4 points)
  const pricePct = (offered_price / listing_price) * 100;
  if (pricePct >= 100) {
    score += 4;
  } else if (pricePct >= 97) {
    score += 3;
  } else if (pricePct >= 93) {
    score += 2;
  } else if (pricePct >= 88) {
    score += 1;
  }
  // below 88% = 0 points

  // 2. Financing type (0-2.5 points)
  const financingScores: Record<string, number> = {
    cash: 2.5,
    conventional: 2,
    fha: 1,
    va: 1,
  };
  score += financingScores[financing_type.toLowerCase()] ?? 1;

  // 3. Contingencies (0-1.5 points)
  if (!inspection_contingency && !appraisal_contingency) {
    score += 1.5;
  } else if (!inspection_contingency || !appraisal_contingency) {
    score += 0.75;
  }
  // both contingencies = 0

  // 4. Down payment (0-1 point)
  const dp = down_payment_pct ?? 0;
  if (dp >= 20) {
    score += 1;
  } else if (dp >= 10) {
    score += 0.5;
  }

  // 5. Closing timeline (0-1 point)
  if (closing_date) {
    const daysToClose = Math.round((new Date(closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToClose >= 30 && daysToClose <= 45) {
      score += 1;
    } else if (daysToClose >= 20 && daysToClose <= 60) {
      score += 0.5;
    }
  } else {
    score += 0.5; // neutral if not specified
  }

  // Round score to nearest 0.5 and clamp
  score = Math.round(score * 2) / 2;
  score = Math.max(1, Math.min(10, score));
  const roundedScore = Math.round(score);

  // Score label
  let score_label: string;
  if (roundedScore >= 8) {
    score_label = "Strong Offer";
  } else if (roundedScore >= 5) {
    score_label = "Moderate Offer";
  } else {
    score_label = "Weak Offer";
  }

  // Generate red flags
  const red_flags: string[] = [];
  const priceDiff = ((offered_price - listing_price) / listing_price) * 100;

  if (priceDiff < -10) {
    red_flags.push(`The offer is ${Math.abs(priceDiff).toFixed(1)}% below your listing price, which is a significant lowball offer.`);
  } else if (priceDiff < -5) {
    red_flags.push(`The offer is ${Math.abs(priceDiff).toFixed(1)}% below your listing price, which is below typical negotiation range.`);
  }

  if (financing_type.toLowerCase() === "fha") {
    red_flags.push("FHA loans require the property to pass an FHA appraisal with stricter standards, which could delay or complicate closing.");
  }
  if (financing_type.toLowerCase() === "va") {
    red_flags.push("VA loans have specific property requirements and may limit seller concession amounts, which could affect negotiations.");
  }

  if (dp < 10 && financing_type.toLowerCase() !== "cash") {
    red_flags.push(`A ${dp}% down payment is relatively low, increasing the risk of financing falling through.`);
  }

  if (inspection_contingency && appraisal_contingency) {
    red_flags.push("Both inspection and appraisal contingencies are included, giving the buyer multiple exit opportunities.");
  }

  if (seller_concessions) {
    const concessionsLower = seller_concessions.toLowerCase();
    if (concessionsLower.includes("%") || concessionsLower.includes("closing cost") || concessionsLower.includes("$")) {
      red_flags.push(`Seller concessions requested (${seller_concessions}) will reduce your net proceeds from the sale.`);
    }
  }

  if (closing_date) {
    const today = new Date();
    const closeDate = new Date(closing_date + "T00:00:00");
    const daysToClose = Math.round((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToClose < 21) {
      red_flags.push(`The proposed closing date is only ${daysToClose} days out, which is a very aggressive timeline that may be difficult to achieve.`);
    } else if (daysToClose > 75) {
      red_flags.push(`The proposed closing date is ${daysToClose} days out, which is an extended timeline. Consider whether you're comfortable waiting that long.`);
    }
  }

  // Summary
  const summaryParts: string[] = [];
  if (roundedScore >= 8) {
    summaryParts.push(`This is a strong offer at ${pricePct.toFixed(1)}% of your listing price.`);
  } else if (roundedScore >= 5) {
    summaryParts.push(`This is a moderate offer at ${pricePct.toFixed(1)}% of your listing price.`);
  } else {
    summaryParts.push(`This is a weak offer at only ${pricePct.toFixed(1)}% of your listing price.`);
  }
  summaryParts.push(`The buyer proposes ${financing_type.toUpperCase()} financing${dp ? ` with ${dp}% down` : ""}.`);
  if (red_flags.length > 0) {
    summaryParts.push(`There ${red_flags.length === 1 ? "is 1 concern" : `are ${red_flags.length} concerns`} to consider before responding.`);
  } else {
    summaryParts.push("No major concerns were identified.");
  }

  // Counter-offer
  let suggested_price: number;
  if (priceDiff >= 0) {
    suggested_price = offered_price; // Accept if at or above listing
  } else if (priceDiff >= -3) {
    suggested_price = listing_price; // Counter at listing if close
  } else {
    // Split the difference, leaning toward listing
    suggested_price = Math.round((offered_price + listing_price * 2) / 3);
  }

  const suggested_changes: string[] = [];
  if (priceDiff < -3) {
    suggested_changes.push(`Counter at $${suggested_price.toLocaleString()} to close the gap between the offer and your listing price.`);
  }
  if (dp < 15 && financing_type.toLowerCase() !== "cash") {
    suggested_changes.push("Request a higher earnest money deposit to demonstrate buyer commitment.");
  }
  if (inspection_contingency && appraisal_contingency) {
    suggested_changes.push("Consider requesting the buyer waive or shorten the inspection contingency period.");
  }
  if (seller_concessions) {
    suggested_changes.push("Counter with reduced or eliminated seller concessions to protect your net proceeds.");
  }
  if (suggested_changes.length === 0) {
    suggested_changes.push("The offer terms are reasonable. You may accept or counter at your listing price if you'd like to maximize proceeds.");
  }

  const reasoning = priceDiff >= 0
    ? `The offer meets or exceeds your listing price, putting you in a strong position. ${suggested_changes.length > 1 ? "However, you may still want to address non-price terms to strengthen the deal." : "The terms are generally favorable."}`
    : `Countering at $${suggested_price.toLocaleString()} splits the difference while staying closer to your listing price. This signals willingness to negotiate while protecting your bottom line. ${red_flags.length > 0 ? "Addressing the identified concerns in your counter will help secure a stronger deal." : ""}`;

  return {
    score: roundedScore,
    score_label,
    summary: summaryParts.join(" "),
    red_flags,
    counter_offer: {
      suggested_price,
      suggested_changes,
      reasoning,
    },
    source: "fallback",
  } as OfferAnalysis & { source: "fallback" };
}

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
      return json(
        { error: "Offered price, financing type, and listing price are required" },
        400
      );
    }

    const priceDiff = ((offered_price - listing_price) / listing_price) * 100;

    let result: OfferAnalysis & { source?: string };

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are a real estate offer analyst helping a FSBO (For Sale By Owner) seller evaluate a buyer's offer. Analyze the following offer and return your response as JSON only, with no other text.

Today's Date: ${new Date().toISOString().split("T")[0]}

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
        throw new Error("AI response did not contain a text block");
      }

      try {
        result = JSON.parse(textBlock.text);
      } catch {
        throw new Error("Failed to parse AI JSON response");
      }
      result.source = "ai";
    } catch (aiError) {
      result = generateFallbackAnalysis(body);
    }

    return json(result);
  } catch {
    return json(
      { error: "An unexpected error occurred. Please try again." },
      500
    );
  }
}
