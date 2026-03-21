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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an expert real estate copywriter. Write a compelling, professional listing description for a home being sold by the owner (FSBO). Return your response as JSON only, with no other text.

Property Details:
- Address: ${address}
- Type: ${propertyTypeLabel}
- Bedrooms: ${bedrooms}
- Bathrooms: ${bathrooms}
- Square Footage: ${sqft.toLocaleString()}
- Year Built: ${year_built}
- HOA: ${hoa ? "Yes" : "No"}
${condition ? `- Condition: ${condition}` : ""}
${selected_price ? `- Listed Price: $${selected_price.toLocaleString()}` : ""}

Return a JSON object with exactly this structure:
{
  "title": "<string - a catchy, concise headline for the listing, max 80 characters>",
  "description": "<string - a compelling 2-3 paragraph listing description that highlights key features, the neighborhood appeal, and creates urgency. Use line breaks between paragraphs.>"
}

Write in a warm, professional tone. Highlight the best features. Do NOT mention the price in the description. Return ONLY valid JSON, no markdown or other text.`,
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

    const result = JSON.parse(textBlock.text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Listing description API error:", error);
    return NextResponse.json(
      { error: "Failed to generate listing description" },
      { status: 500 }
    );
  }
}
