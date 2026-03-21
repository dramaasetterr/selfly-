import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { PricingInput, PricingResult } from "@selfly/shared";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body: PricingInput = await request.json();

    const { address, sqft, bedrooms, bathrooms, year_built, condition } = body;

    if (!address || !sqft || !bedrooms || !bathrooms || !year_built || !condition) {
      return NextResponse.json(
        { error: "All property fields are required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a real estate pricing expert. Analyze the following property details and suggest a recommended list price. Return your response as JSON only, with no other text.

Property Details:
- Address: ${address}
- Square Footage: ${sqft}
- Bedrooms: ${bedrooms}
- Bathrooms: ${bathrooms}
- Year Built: ${year_built}
- Condition: ${condition}

Return a JSON object with exactly this structure:
{
  "recommended_price": <number - your suggested list price as a whole number>,
  "sell_fast_price": <number - 5% below recommended_price, as a whole number>,
  "maximize_price": <number - 5% above recommended_price, as a whole number>,
  "reasoning": [<string>, <string>, <string>] - exactly 3 bullet points explaining your pricing logic
}

Base your analysis on the property characteristics provided. Consider square footage, bedroom/bathroom count, year built, and condition to estimate a reasonable price. Return ONLY valid JSON, no markdown or other text.`,
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

    const result: PricingResult = JSON.parse(textBlock.text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pricing API error:", error);
    return NextResponse.json(
      { error: "Failed to generate pricing" },
      { status: 500 }
    );
  }
}
