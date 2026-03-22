import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { PricingInput, PricingResult } from '../shared';
import { json, OPTIONS } from "../_cors";

export { OPTIONS };

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing required environment variable: ANTHROPIC_API_KEY");
}

const anthropic = new Anthropic();

// Regional price per square foot by state
const STATE_PRICE_PER_SQFT: Record<string, number> = {
  CA: 500, NY: 350, NJ: 325, CT: 300, FL: 275,
  TX: 225, CO: 350, WA: 375, MA: 400, IL: 225,
  AZ: 275, OR: 325, NV: 250, GA: 225, NC: 240,
  VA: 300, MD: 325, PA: 250, OH: 185, MI: 185,
  TN: 240, SC: 240, MN: 260, WI: 215, MO: 200,
  IN: 185, HI: 600, DC: 475, UT: 310, ID: 280,
};
const DEFAULT_PRICE_PER_SQFT = 250;

// Parse state abbreviation from address string
function parseStateFromAddress(address: string): string | null {
  // Try to match a 2-letter state abbreviation near the end
  // Patterns: "City, ST 12345", "City, ST", "City ST 12345", "Something, State"
  const abbrevMatch = address.match(/\b([A-Z]{2})\s*\d{5}/) || address.match(/,\s*([A-Z]{2})\s*$/);
  if (abbrevMatch) return abbrevMatch[1];

  // Try full state names to abbreviations
  const stateNames: Record<string, string> = {
    california: "CA", "new york": "NY", "new jersey": "NJ", connecticut: "CT",
    florida: "FL", texas: "TX", colorado: "CO", washington: "WA",
    massachusetts: "MA", illinois: "IL", arizona: "AZ", oregon: "OR",
    nevada: "NV", georgia: "GA", "north carolina": "NC", virginia: "VA",
    maryland: "MD", pennsylvania: "PA", ohio: "OH", michigan: "MI",
    tennessee: "TN", "south carolina": "SC", minnesota: "MN", wisconsin: "WI",
    missouri: "MO", indiana: "IN", hawaii: "HI", utah: "UT", idaho: "ID",
  };
  const lower = address.toLowerCase();
  for (const [name, abbrev] of Object.entries(stateNames)) {
    if (lower.includes(name)) return abbrev;
  }
  return null;
}

// Parse features string for value-add keywords
function applyFeatureAdjustments(features: string, basePrice: number, reasoning: string[]): number {
  if (!features || features.trim().length === 0) return basePrice;

  const lower = features.toLowerCase();
  let adjustment = 0;
  let percentageBoost = 0;
  const appliedFeatures: string[] = [];

  // Pool: +$25K-50K scaled with home value
  if (lower.includes("pool")) {
    const poolValue = basePrice > 800000 ? 50000 : basePrice > 400000 ? 35000 : 25000;
    adjustment += poolValue;
    appliedFeatures.push(`pool (+$${(poolValue / 1000).toFixed(0)}K)`);
  }

  // Finished basement: +$30K-60K
  if (lower.includes("basement")) {
    const basementValue = basePrice > 800000 ? 60000 : basePrice > 400000 ? 45000 : 30000;
    adjustment += basementValue;
    appliedFeatures.push(`basement (+$${(basementValue / 1000).toFixed(0)}K)`);
  }

  // Renovated/remodeled/updated: +8%
  if (lower.includes("renovated") || lower.includes("remodeled") || lower.includes("updated")) {
    percentageBoost += 8;
    appliedFeatures.push("renovated/updated (+8%)");
  }

  // Garage: +$15K per mention
  const garageMatches = lower.match(/garage/g);
  if (garageMatches) {
    const garageValue = garageMatches.length * 15000;
    adjustment += garageValue;
    appliedFeatures.push(`garage (+$${(garageValue / 1000).toFixed(0)}K)`);
  }

  // New roof: +$10K
  if (lower.includes("new roof")) {
    adjustment += 10000;
    appliedFeatures.push("new roof (+$10K)");
  }

  // Hardwood: +$8K
  if (lower.includes("hardwood")) {
    adjustment += 8000;
    appliedFeatures.push("hardwood floors (+$8K)");
  }

  // Solar: +$15K
  if (lower.includes("solar")) {
    adjustment += 15000;
    appliedFeatures.push("solar (+$15K)");
  }

  // Large lot/acre/backyard: +$20K
  if (lower.includes("acre") || lower.includes("large lot") || lower.includes("backyard")) {
    adjustment += 20000;
    appliedFeatures.push("lot/yard premium (+$20K)");
  }

  // View/waterfront/lakefront: +15%
  if (lower.includes("view") || lower.includes("waterfront") || lower.includes("lakefront")) {
    percentageBoost += 15;
    appliedFeatures.push("view/waterfront (+15%)");
  }

  // Vaulted/high ceiling: +$10K
  if (lower.includes("vaulted") || lower.includes("high ceiling")) {
    adjustment += 10000;
    appliedFeatures.push("vaulted/high ceilings (+$10K)");
  }

  let result = basePrice + adjustment;
  if (percentageBoost > 0) {
    result *= 1 + percentageBoost / 100;
  }

  if (appliedFeatures.length > 0) {
    reasoning.push(
      `Property features adjustment: ${appliedFeatures.join(", ")}. ` +
      `Total feature-based adjustment: +$${Math.round(result - basePrice).toLocaleString()}.`
    );
  }

  return result;
}

function generateFallbackPricing(body: PricingInput): PricingResult & { source: "fallback" } {
  const { address, sqft, bedrooms, bathrooms, year_built, condition, features } = body;
  const reasoning: string[] = [];

  // 1. Regional base price per sqft
  const stateAbbrev = parseStateFromAddress(address);
  const basePricePerSqft = stateAbbrev
    ? (STATE_PRICE_PER_SQFT[stateAbbrev] ?? DEFAULT_PRICE_PER_SQFT)
    : DEFAULT_PRICE_PER_SQFT;

  const stateLabel = stateAbbrev || "unknown state";

  // 2. Property size with tiered diminishing returns
  let sizeValue: number;
  if (sqft <= 2500) {
    sizeValue = sqft * basePricePerSqft;
  } else if (sqft <= 4000) {
    const basePortion = 2500 * basePricePerSqft;
    const midPortion = (sqft - 2500) * basePricePerSqft * 0.90;
    sizeValue = basePortion + midPortion;
  } else {
    const basePortion = 2500 * basePricePerSqft;
    const midPortion = 1500 * basePricePerSqft * 0.90;
    const upperPortion = (sqft - 4000) * basePricePerSqft * 0.82;
    sizeValue = basePortion + midPortion + upperPortion;
  }

  const reasoningParts: string[] = [];
  if (sqft <= 2500) {
    reasoningParts.push(`${sqft.toLocaleString()} sqft at full $${basePricePerSqft}/sqft`);
  } else if (sqft <= 4000) {
    reasoningParts.push(`first 2,500 sqft at full $${basePricePerSqft}/sqft`);
    reasoningParts.push(`remaining ${(sqft - 2500).toLocaleString()} sqft at 90% rate`);
  } else {
    reasoningParts.push(`first 2,500 sqft at full $${basePricePerSqft}/sqft`);
    reasoningParts.push(`next 1,500 sqft at 90% rate`);
    reasoningParts.push(`remaining ${(sqft - 4000).toLocaleString()} sqft at 82% rate`);
  }

  reasoning.push(
    `Base valuation of $${basePricePerSqft}/sqft for ${stateLabel.toUpperCase()} applied to ${sqft.toLocaleString()} sqft` +
    (sqft > 2500 ? ` (${reasoningParts.join(", ")})` : "") +
    ` = $${Math.round(sizeValue).toLocaleString()} base.`
  );

  let price = sizeValue;

  // 3. Bedroom adjustment — scales with home value tier
  let bedroomAdj = 0;
  if (bedrooms > 3) {
    const extra = bedrooms - 3;
    if (price > 1000000) {
      bedroomAdj = extra * 40000;
    } else if (price > 500000) {
      bedroomAdj = extra * 25000;
    } else {
      bedroomAdj = extra * 15000;
    }
  } else if (bedrooms < 3) {
    bedroomAdj = -((3 - bedrooms) * 10000);
  }
  price += bedroomAdj;

  // 4. Bathroom adjustment — scales with home value tier
  let bathroomAdj = 0;
  if (bathrooms > 2) {
    const extra = bathrooms - 2;
    if (price > 1000000) {
      bathroomAdj = extra * 30000;
    } else if (price > 500000) {
      bathroomAdj = extra * 20000;
    } else {
      bathroomAdj = extra * 10000;
    }
  } else if (bathrooms < 2) {
    bathroomAdj = -((2 - bathrooms) * 10000);
  }
  price += bathroomAdj;

  if (bedroomAdj !== 0 || bathroomAdj !== 0) {
    const parts: string[] = [];
    if (bedroomAdj > 0) parts.push(`+$${bedroomAdj.toLocaleString()} for ${bedrooms - 3} extra bedroom(s) above the 3-bed baseline`);
    if (bedroomAdj < 0) parts.push(`-$${Math.abs(bedroomAdj).toLocaleString()} for being ${3 - bedrooms} bedroom(s) below the 3-bed baseline`);
    if (bathroomAdj > 0) parts.push(`+$${bathroomAdj.toLocaleString()} for ${bathrooms - 2} extra bathroom(s) above the 2-bath baseline`);
    if (bathroomAdj < 0) parts.push(`-$${Math.abs(bathroomAdj).toLocaleString()} for being ${2 - bathrooms} bathroom(s) below the 2-bath baseline`);
    reasoning.push(`Bedroom/bathroom adjustments (scaled to home value tier): ${parts.join("; ")}.`);
  } else {
    reasoning.push(`${bedrooms} bedrooms and ${bathrooms} bathrooms match the standard 3-bed/2-bath baseline — no adjustment needed.`);
  }

  // 5. Age adjustment
  const age = new Date().getFullYear() - year_built;
  let ageMultiplier: number;
  let ageLabel: string;
  if (age <= 5) {
    ageMultiplier = 1.08;
    ageLabel = "new construction (0-5 years)";
  } else if (age <= 15) {
    ageMultiplier = 1.03;
    ageLabel = "modern build (6-15 years)";
  } else if (age <= 30) {
    ageMultiplier = 1.0;
    ageLabel = "established (16-30 years)";
  } else if (age <= 50) {
    ageMultiplier = 0.95;
    ageLabel = "older construction (31-50 years)";
  } else {
    ageMultiplier = 0.92;
    ageLabel = "historic (50+ years)";
  }
  price *= ageMultiplier;

  const ageReasonParts = `Built in ${year_built} (${age} years old) — classified as ${ageLabel}`;
  if (age > 50) {
    reasoning.push(`${ageReasonParts}, applying a -8% age adjustment. Note: historic properties may command a premium for period charm and architectural character that this algorithm cannot fully capture.`);
  } else if (ageMultiplier !== 1.0) {
    const pctStr = ageMultiplier > 1
      ? `+${((ageMultiplier - 1) * 100).toFixed(0)}%`
      : `${((ageMultiplier - 1) * 100).toFixed(0)}%`;
    reasoning.push(`${ageReasonParts}, applying a ${pctStr} age adjustment.`);
  } else {
    reasoning.push(`${ageReasonParts} — no age adjustment applied.`);
  }

  // 6. Condition multiplier
  const conditionMultipliers: Record<string, { mult: number; label: string }> = {
    excellent: { mult: 1.12, label: "Excellent (+12%)" },
    good: { mult: 1.05, label: "Good (+5%)" },
    fair: { mult: 0.92, label: "Fair (-8%)" },
    needs_work: { mult: 0.82, label: "Needs Work (-18%)" },
  };
  const conditionKey = condition.toLowerCase().replace(/\s+/g, "_");
  const condEntry = conditionMultipliers[conditionKey] ?? { mult: 1.0, label: condition };
  price *= condEntry.mult;

  reasoning.push(`Condition rated as "${condEntry.label}" — ${condEntry.mult > 1 ? "premium" : condEntry.mult < 1 ? "discount" : "neutral"} applied to reflect the property's current state.`);

  // 7. Features adjustment
  price = applyFeatureAdjustments(features ?? "", price, reasoning);

  // 8. Luxury premium — based on size, bedrooms, and estimated price
  const isLargeSqft = sqft >= 4000;
  const isManyBeds = bedrooms >= 5;
  const isHighValue = price > 800000;
  const luxuryConditions = [isLargeSqft, isManyBeds, isHighValue].filter(Boolean).length;

  if (luxuryConditions >= 3) {
    price *= 1.15;
    reasoning.push(`Luxury premium of 15% applied — property meets all three luxury criteria: 4,000+ sqft, 5+ bedrooms, and $800K+ estimated value.`);
  } else if (luxuryConditions === 2) {
    price *= 1.12;
    reasoning.push(`Luxury premium of 12% applied — property meets two of three luxury criteria (4,000+ sqft, 5+ bedrooms, $800K+ value).`);
  } else if (luxuryConditions === 1) {
    price *= 1.08;
    reasoning.push(`Luxury premium of 8% applied — property meets one luxury criterion (4,000+ sqft, 5+ bedrooms, or $800K+ value).`);
  }

  // 9. Market trend factor (+3% for 2026)
  price *= 1.03;

  // Floor
  price = Math.max(price, 50000);

  const recommended = Math.round(price / 1000) * 1000; // Round to nearest $1K
  const sell_fast = Math.round(recommended * 0.93 / 1000) * 1000;
  const maximize = Math.round(recommended * 1.08 / 1000) * 1000;

  reasoning.push(`A 3% market appreciation factor for 2026 market conditions has been applied. Sell-fast price is set 7% below recommended to attract competitive offers quickly; maximize price is 8% above for sellers willing to wait for the right buyer.`);

  return {
    recommended_price: recommended,
    sell_fast_price: sell_fast,
    maximize_price: maximize,
    reasoning,
    source: "fallback",
  } as PricingResult & { source: "fallback" };
}

export async function POST(request: NextRequest) {
  try {
    const body: PricingInput = await request.json();

    const { address, sqft, bedrooms, bathrooms, year_built, condition } = body;

    if (!address || !sqft || !bedrooms || !bathrooms || !year_built || !condition) {
      return json({ error: "All property fields are required" }, 400);
    }

    let result: PricingResult & { source?: string };

    try {
      const featuresLine = body.features
        ? `\n- Notable Features: ${body.features}`
        : "";

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are an expert real estate appraiser and pricing analyst with deep knowledge of regional US housing markets. Analyze the following property and provide a data-driven pricing recommendation.

Property Details:
- Address: ${address}
- Square Footage: ${sqft.toLocaleString()}
- Bedrooms: ${bedrooms}
- Bathrooms: ${bathrooms}
- Year Built: ${year_built} (${new Date().getFullYear() - year_built} years old)
- Condition: ${condition}${featuresLine}

Consider ALL of the following in your analysis:
1. Regional market conditions based on the property's location (state/city)
2. Price per square foot typical for the area
3. Bedroom and bathroom count relative to area norms
4. Property age and its impact (new construction premium, historic charm, etc.)
5. Current condition and how it affects market value
6. 2026 housing market trends for this region
7. Comparable property values in similar neighborhoods
${body.features ? "8. The specific property features mentioned and their impact on value" : ""}

Return a JSON object with exactly this structure:
{
  "recommended_price": <number - your best estimate list price, rounded to nearest $1000>,
  "sell_fast_price": <number - approximately 7% below recommended, rounded to nearest $1000>,
  "maximize_price": <number - approximately 8% above recommended, rounded to nearest $1000>,
  "reasoning": [<string>, <string>, <string>, <string>, <string>] - exactly 5 detailed bullet points explaining your pricing logic. Each point should reference specific data points ($/sqft, market comps, condition impact, age factor, regional trends).
}

Be specific in your reasoning — cite the approximate $/sqft you used, explain adjustments for bedrooms/bathrooms/condition/age, and reference the local market. Return ONLY valid JSON, no markdown or other text.`,
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
      result = generateFallbackPricing(body);
    }

    return json(result);
  } catch {
    return json(
      { error: "An unexpected error occurred. Please try again." },
      500
    );
  }
}

