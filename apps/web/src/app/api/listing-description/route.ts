import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface DescriptionRequest {
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built: number;
  property_type: string;
  hoa: boolean;
  condition?: string;
  selected_price?: number;
  features?: string;
}

// Helper: deterministic "random" based on property characteristics
function propHash(body: DescriptionRequest): number {
  const str = `${body.address}${body.sqft}${body.bedrooms}${body.year_built}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFrom<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

function generateFallbackDescription(body: DescriptionRequest): { title: string; description: string; source: "fallback" } {
  const {
    address,
    bedrooms,
    bathrooms,
    sqft,
    year_built,
    property_type,
    hoa,
    condition,
    selected_price,
    features,
  } = body;

  const propertyTypeLabel = property_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const ptLower = propertyTypeLabel.toLowerCase();

  const age = 2026 - year_built;
  const isNew = age <= 5;
  const isModern = age > 5 && age <= 15;
  const isEstablished = age > 15 && age <= 40;
  const isVintage = age > 40;

  const isLuxury = (selected_price ?? 0) >= 750000 || sqft >= 3500;
  const isStarter = sqft <= 1200 && bedrooms <= 2;
  const isFamily = bedrooms >= 4;
  const isCompact = sqft <= 1500;

  const hash = propHash(body);

  const bathText = bathrooms === 1 ? "1 bathroom" : `${bathrooms} bathrooms`;
  const condKey = (condition || "good").toLowerCase().replace(/\s+/g, "_");

  // --- TITLE generation: vary based on characteristics ---
  let title: string;
  if (isLuxury && isNew) {
    title = pickFrom([
      `Exquisite New ${bedrooms}BR ${propertyTypeLabel} — Modern Luxury Living`,
      `Brand New ${propertyTypeLabel} — ${sqft.toLocaleString()} Sqft of Pure Elegance`,
      `Stunning Contemporary ${bedrooms}-Bed Masterpiece — Move-In Ready`,
    ], hash);
  } else if (isLuxury) {
    title = pickFrom([
      `Elegant ${bedrooms}BR ${propertyTypeLabel} — Premium Living at Its Finest`,
      `${sqft.toLocaleString()} Sqft of Refined Living — ${bedrooms} Beds, ${bathrooms} Baths`,
      `Prestigious ${propertyTypeLabel} in Sought-After Location`,
    ], hash);
  } else if (isNew) {
    title = pickFrom([
      `Like-New ${bedrooms}BR ${propertyTypeLabel} — Built ${year_built}`,
      `Practically New! ${bedrooms}-Bed, ${bathrooms}-Bath ${propertyTypeLabel}`,
      `Move Right In — Nearly New ${bedrooms}-Bedroom ${propertyTypeLabel}`,
    ], hash);
  } else if (isVintage) {
    title = pickFrom([
      `Classic ${year_built} ${propertyTypeLabel} with Timeless Charm — ${bedrooms}BR`,
      `Character & Charm — ${bedrooms}-Bed ${propertyTypeLabel} with Vintage Appeal`,
      `Historic ${propertyTypeLabel} — ${bedrooms} Beds, Endless Potential`,
    ], hash);
  } else if (isFamily) {
    title = pickFrom([
      `Spacious ${bedrooms}-Bedroom Family ${propertyTypeLabel} — Room to Grow`,
      `Perfect Family Home — ${bedrooms} Beds, ${bathrooms} Baths, ${sqft.toLocaleString()} Sqft`,
      `${bedrooms}-Bedroom ${propertyTypeLabel} Built for Family Living`,
    ], hash);
  } else if (isStarter) {
    title = pickFrom([
      `Charming ${bedrooms}-Bed ${propertyTypeLabel} — Perfect Starter Home`,
      `Cozy & Affordable — ${bedrooms}BR ${propertyTypeLabel} Ready for You`,
      `Your First Home Awaits — ${bedrooms}-Bed, ${bathrooms}-Bath ${propertyTypeLabel}`,
    ], hash);
  } else if (condKey === "excellent") {
    title = pickFrom([
      `Impeccably Maintained ${bedrooms}-Bed ${propertyTypeLabel} — Turnkey Ready`,
      `Pristine ${bedrooms}BR ${propertyTypeLabel} — Shows Like a Model Home`,
      `Beautifully Kept ${bedrooms}-Bedroom ${propertyTypeLabel} — Must See!`,
    ], hash);
  } else {
    title = pickFrom([
      `${bedrooms}-Bed, ${bathrooms}-Bath ${propertyTypeLabel} — Don't Miss This One!`,
      `Wonderful ${bedrooms}-Bedroom ${propertyTypeLabel} in Great Location`,
      `Inviting ${bedrooms}BR ${propertyTypeLabel} — ${sqft.toLocaleString()} Sqft of Comfort`,
      `Welcome Home to This ${bedrooms}-Bed ${propertyTypeLabel}`,
    ], hash);
  }

  // Trim title
  if (title.length > 80) {
    title = title.substring(0, 77) + "...";
  }

  // --- DESCRIPTION paragraphs ---

  // Condition phrases
  const condPhrases: Record<string, string[]> = {
    excellent: [
      "meticulously maintained and move-in ready",
      "in pristine, show-ready condition throughout",
      "beautifully preserved with obvious pride of ownership",
    ],
    good: [
      "thoughtfully maintained and ready for its next chapter",
      "well-cared-for and in solid, move-in condition",
      "in great shape with quality finishes throughout",
    ],
    fair: [
      "solidly built with opportunities to customize to your taste",
      "a strong foundation ready for your personal vision",
      "well-constructed and awaiting your creative touch",
    ],
    needs_work: [
      "a rare opportunity for investors and renovators to unlock serious value",
      "priced to sell with incredible potential for the right buyer",
      "a diamond in the rough — bring your contractor and your vision",
    ],
  };
  const condPhrase = pickFrom(condPhrases[condKey] || condPhrases.good, hash);

  // Age-specific language
  let ageHighlight: string;
  if (isNew) {
    ageHighlight = `Built in ${year_built}, this nearly new home features contemporary design, modern building standards, and energy-efficient construction that today's buyers demand.`;
  } else if (isModern) {
    ageHighlight = `Constructed in ${year_built}, this home benefits from modern building techniques and relatively recent updates, offering the best balance of contemporary comfort and established neighborhood charm.`;
  } else if (isEstablished) {
    ageHighlight = `Built in ${year_built} in an established neighborhood, this home sits on a mature, tree-lined street with the kind of community character that newer developments simply can't replicate.`;
  } else {
    ageHighlight = `Dating back to ${year_built}, this ${ptLower} is rich with architectural character and the kind of craftsmanship that's rarely found in newer construction — original details that give this home a soul all its own.`;
  }

  // Size-specific language
  let sizeHighlight: string;
  if (sqft >= 3500) {
    sizeHighlight = `With an expansive ${sqft.toLocaleString()} square feet of living space, there's no shortage of room for living, working, and entertaining on a grand scale.`;
  } else if (sqft >= 2500) {
    sizeHighlight = `At ${sqft.toLocaleString()} square feet, the generous floor plan provides ample space for comfortable daily living with room to spare.`;
  } else if (sqft >= 1500) {
    sizeHighlight = `The well-designed ${sqft.toLocaleString()} square foot layout makes the most of every inch, offering a functional flow that feels open and inviting.`;
  } else {
    sizeHighlight = `At ${sqft.toLocaleString()} square feet, this efficiently designed home proves that smart layouts deliver comfort without excess — every room has purpose and personality.`;
  }

  // Bedroom/bath highlights
  let bedBathHighlight: string;
  if (bedrooms >= 5) {
    bedBathHighlight = `The ${bedrooms} bedrooms offer remarkable flexibility — dedicated guest suites, a home office, playroom, or media room are all within reach, with ${bathText} ensuring everyone has space.`;
  } else if (bedrooms >= 4) {
    bedBathHighlight = `Four bedrooms and ${bathText} provide the flexibility growing families need — from dedicated guest rooms to home offices, the possibilities are endless.`;
  } else if (bedrooms === 3) {
    bedBathHighlight = `Three bedrooms and ${bathText} deliver the classic, versatile layout that appeals to families, couples, and remote workers alike.`;
  } else if (bedrooms === 2) {
    bedBathHighlight = `Two bedrooms and ${bathText} create a comfortable, low-maintenance living arrangement that's ideal for couples, young professionals, or anyone seeking a manageable footprint.`;
  } else {
    bedBathHighlight = `The ${bedrooms === 1 ? "single bedroom" : `${bedrooms} bedrooms`} and ${bathText} offer a streamlined living experience — simple, efficient, and easy to maintain.`;
  }

  // HOA addition
  const hoaSnippet = hoa
    ? " The community's HOA provides added benefits including shared amenities and maintained common areas, enhancing the overall lifestyle."
    : "";

  // Price range hint (without stating price)
  let priceHint = "";
  if (selected_price) {
    if (selected_price >= 1000000) {
      priceHint = " Competitively priced in this prestigious market segment, this home offers outstanding value for discerning buyers.";
    } else if (selected_price >= 500000) {
      priceHint = " Attractively positioned in the market, this home represents compelling value for its size, condition, and location.";
    } else if (selected_price < 250000) {
      priceHint = " Priced for today's market, this home offers exceptional value and a rare entry point into homeownership.";
    }
  }

  // Features paragraph snippet
  let featuresSnippet = "";
  if (features && features.trim()) {
    featuresSnippet = ` Notable highlights include ${features.trim().replace(/\.\s*$/, "")}.`;
  }

  // Choose paragraph structure based on hash for variety
  const variant = hash % 3;

  let p1: string, p2: string, p3: string;

  if (variant === 0) {
    // Lead with location and hook
    p1 = `Welcome to ${address} — a ${condPhrase} ${ptLower} that's ready to impress. ${ageHighlight} From the moment you arrive, you'll appreciate the curb appeal and the thoughtful design that defines this ${bedrooms}-bedroom, ${bathText} home.`;
    p2 = `${sizeHighlight} ${bedBathHighlight}${featuresSnippet}${hoaSnippet} The layout seamlessly connects living spaces, creating an environment that's as perfect for quiet evenings as it is for hosting guests.`;
    p3 = `This is more than a house — it's a lifestyle waiting to happen.${priceHint} Properties like this don't stay available for long. Schedule your private showing today and discover everything ${address} has to offer. Your next chapter starts here.`;
  } else if (variant === 1) {
    // Lead with features
    p1 = `${sizeHighlight} This ${condPhrase} ${bedrooms}-bedroom, ${bathText} ${ptLower} at ${address} delivers the space, quality, and location that today's buyers are searching for. ${ageHighlight}`;
    p2 = `${bedBathHighlight} Every corner of this home has been designed with both form and function in mind — from the flowing common areas to the private retreats of the bedrooms.${featuresSnippet}${hoaSnippet} Whether you're working from home, raising a family, or simply seeking a comfortable place to call your own, this ${ptLower} adapts to your life.`;
    p3 = `Opportunity is knocking at ${address}.${priceHint} Homes of this caliber in this area generate significant interest — act now and make this one yours. Contact us today to schedule a private tour before it's too late.`;
  } else {
    // Lead with lifestyle/emotion
    p1 = `Imagine coming home to ${address} every day — a ${condPhrase} ${ptLower} where ${sqft.toLocaleString()} square feet of thoughtfully designed living space welcomes you with open arms. ${ageHighlight}`;
    p2 = `Inside, ${bedrooms} spacious bedrooms and ${bathText} are complemented by a layout that balances togetherness and privacy perfectly. ${sizeHighlight.replace(/^(At |With |The )/, "The ")}${featuresSnippet}${hoaSnippet} This home was designed for real life — morning routines, weekend gatherings, and everything in between.`;
    p3 = `${address} isn't just a listing — it's the start of something special.${priceHint} The best homes move fast, and this one is no exception. Book your showing now and see for yourself why this ${ptLower} is generating buzz. Don't wait — this opportunity won't last.`;
  }

  const description = `${p1}\n\n${p2}\n\n${p3}`;

  return { title, description, source: "fallback" };
}

export async function POST(request: NextRequest) {
  try {
    const body: DescriptionRequest = await request.json();

    const {
      address,
      bedrooms,
      bathrooms,
      sqft,
      year_built,
      property_type,
      hoa,
      condition,
      selected_price,
      features,
    } = body;

    if (!address || !bedrooms || !bathrooms || !sqft || !year_built) {
      return NextResponse.json(
        { error: "Property details are required" },
        { status: 400 }
      );
    }

    const propertyTypeLabel = property_type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const age = 2026 - year_built;
    const priceRange = selected_price
      ? selected_price >= 1000000 ? "luxury" : selected_price >= 500000 ? "mid-high" : selected_price >= 250000 ? "mid" : "affordable"
      : "unknown";

    let result: { title: string; description: string; source?: string };

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are a top-producing real estate copywriter who specializes in FSBO (For Sale By Owner) listings. Your descriptions consistently generate high engagement and showing requests. Write a compelling, unique listing description for this property.

Property Details:
- Address: ${address}
- Type: ${propertyTypeLabel}
- Bedrooms: ${bedrooms}
- Bathrooms: ${bathrooms}
- Square Footage: ${sqft.toLocaleString()}
- Year Built: ${year_built} (${age} years old)
- HOA: ${hoa ? "Yes" : "No"}
${condition ? `- Condition: ${condition}` : ""}
${selected_price ? `- Listed Price: $${selected_price.toLocaleString()} (${priceRange} segment)` : ""}
${features ? `- Special Features & Upgrades: ${features}` : ""}

Writing guidelines:
1. TITLE: Create a catchy, specific headline (max 80 chars). Avoid generic titles like "Welcome Home" — make it unique to THIS property's best feature.
2. DESCRIPTION: Write 3-4 paragraphs that:
   - Open with the single most compelling feature or emotional hook
   - Use vivid, sensory language (not just adjectives — paint a picture)
   - Highlight the ${bedrooms} bedrooms, ${bathrooms} bathrooms, and ${sqft.toLocaleString()} sqft naturally within the narrative
   - Reference the ${age}-year-old construction appropriately (${age <= 5 ? "emphasize newness and modern features" : age >= 50 ? "celebrate character and craftsmanship" : "balance established charm with updates"})
   - ${condition === "excellent" ? "Emphasize the pristine, turnkey nature" : condition === "needs_work" ? "Frame as an opportunity with upside potential" : "Highlight the home's solid condition"}
   - ${features ? `Prominently highlight these special features: ${features}. Weave them naturally into the description as key selling points` : "Focus on the core property attributes"}
   - Create urgency in the final paragraph without being pushy
   - Do NOT mention the price in the description text
   - Use line breaks (\\n\\n) between paragraphs
   - ${priceRange === "luxury" ? "Use sophisticated, upscale language befitting a luxury property" : priceRange === "affordable" ? "Emphasize value and opportunity" : "Use warm, professional, inviting language"}

Return a JSON object with exactly this structure:
{
  "title": "<string - catchy headline, max 80 characters>",
  "description": "<string - 3-4 paragraph listing description with \\n\\n between paragraphs>"
}

Return ONLY valid JSON, no markdown or other text.`,
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("AI response did not contain a text block");
      }

      result = JSON.parse(textBlock.text);
      result.source = "ai";
    } catch (aiError) {
      console.error("Listing description AI call failed, using fallback:", aiError instanceof Error ? aiError.message : aiError);
      result = generateFallbackDescription(body);
    }

    return NextResponse.json(result);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Listing description API error:", errMsg, error);
    return NextResponse.json(
      { error: "Failed to generate listing description", detail: errMsg },
      { status: 500 }
    );
  }
}
