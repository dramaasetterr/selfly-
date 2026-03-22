import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return NextResponse.json(
        { error: "A valid address string is required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a US residential real estate expert. Given a property address, estimate the most likely property details based on the neighborhood, region, typical housing stock, and public data patterns for that area.

Address: ${address.trim()}

Return a JSON object with exactly this structure:
{
  "sqft": <number - estimated living area in square feet, typical for this neighborhood>,
  "bedrooms": <number - estimated bedroom count>,
  "bathrooms": <number - estimated bathroom count>,
  "year_built": <number - estimated year the home was built, based on typical construction era for the area>
}

Use your knowledge of US housing patterns:
- Consider the city, state, and neighborhood to infer typical home sizes and ages.
- Suburban addresses tend toward 3-4 bed / 2-3 bath; urban condos toward 1-2 bed / 1 bath.
- Older East Coast neighborhoods often have homes from the early 1900s; Sun Belt suburbs from the 1990s-2010s.
- Provide reasonable middle-of-the-road estimates — these are starting defaults the user will adjust.

Return ONLY valid JSON, no markdown or other text.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI response did not contain a text block");
    }

    const parsed = JSON.parse(textBlock.text);

    // Validate and sanitize the response
    const sqft = Math.round(Number(parsed.sqft));
    const bedrooms = Math.round(Number(parsed.bedrooms));
    const bathrooms = Number(parsed.bathrooms);
    const year_built = Math.round(Number(parsed.year_built));

    if (
      isNaN(sqft) || sqft < 200 || sqft > 20000 ||
      isNaN(bedrooms) || bedrooms < 0 || bedrooms > 20 ||
      isNaN(bathrooms) || bathrooms < 0 || bathrooms > 20 ||
      isNaN(year_built) || year_built < 1700 || year_built > 2026
    ) {
      throw new Error("AI returned property details outside of valid ranges");
    }

    return NextResponse.json({
      sqft,
      bedrooms,
      bathrooms,
      year_built,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Property lookup API error:", errMsg, error);

    // Distinguish between client errors and server/AI errors
    if (errMsg.includes("JSON")) {
      return NextResponse.json(
        { error: "Failed to parse property details from AI response" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to look up property details. Please try again or enter them manually." },
      { status: 500 }
    );
  }
}
