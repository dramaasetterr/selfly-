import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface GuideRequest {
  state: string;
  remaining_steps: string[];
  property_address: string;
  sale_price: number;
}

interface GuideStep {
  step: string;
  explanation: string;
  timeline: string;
  seller_action: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GuideRequest = await request.json();
    const { state, remaining_steps, property_address, sale_price } = body;

    if (!remaining_steps || remaining_steps.length === 0) {
      return NextResponse.json(
        { error: "At least one remaining step is required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are a friendly real estate closing advisor helping a FSBO (For Sale By Owner) seller understand what to expect during the closing process. Generate a personalized closing guide.

Property Details:
- Address: ${property_address || "Not specified"}
- Sale Price: $${sale_price ? sale_price.toLocaleString() : "Not specified"}
- State: ${state || "Not specified"}

The seller still needs to complete these closing steps:
${remaining_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

For EACH remaining step listed above, provide a helpful explanation. Return your response as a JSON array only, with no other text. Each element should have this structure:
{
  "step": "<the step name exactly as listed above>",
  "explanation": "<2-3 sentences explaining what this step involves and why it matters>",
  "timeline": "<typical timeline, e.g. '1-2 weeks' or 'Day of closing'>",
  "seller_action": "<1-2 sentences telling the seller exactly what they need to do>"
}

${state ? `Tailor advice to ${state} state laws and practices where relevant.` : ""}

Be warm, practical, and reassuring. FSBO sellers may be doing this for the first time. Return ONLY valid JSON array, no markdown or other text.`,
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

    const guide: GuideStep[] = JSON.parse(textBlock.text);

    return NextResponse.json({ guide });
  } catch (error) {
    console.error("Closing guide API error:", error);
    return NextResponse.json(
      { error: "Failed to generate closing guide" },
      { status: 500 }
    );
  }
}
