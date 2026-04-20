import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { json, OPTIONS } from "../../_cors";

export { OPTIONS };

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing required environment variable: ANTHROPIC_API_KEY");
}

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

const stepGuides: Record<string, { explanation: string; timeline: string; seller_action: string }> = {
  "title search": {
    explanation: "A title search examines public records to verify the property's legal ownership and uncover any liens, easements, or encumbrances. This is essential to ensure you can legally transfer clear title to the buyer.",
    timeline: "1-2 weeks",
    seller_action: "Provide the title company with your deed and any known lien information. If issues are found, work with the title company to resolve them promptly — unpaid liens or judgments must be cleared before closing.",
  },
  "home inspection": {
    explanation: "The buyer will hire a licensed home inspector to evaluate the property's condition, including structural elements, mechanical systems, roof, plumbing, and electrical. The results may lead to repair requests or renegotiation.",
    timeline: "7-14 days after offer acceptance",
    seller_action: "Make the property accessible for the inspection. After receiving the inspection report, be prepared to negotiate repairs or credits. You can agree to fix items, offer a credit, or decline — but being reasonable helps keep the deal on track.",
  },
  appraisal: {
    explanation: "If the buyer is using financing, the lender will order an appraisal to confirm the property's market value supports the loan amount. If the appraisal comes in low, it can affect the sale price or require renegotiation.",
    timeline: "2-3 weeks after offer acceptance",
    seller_action: "Ensure the property is clean and presentable for the appraiser's visit. Have a list of recent improvements and comparable sales ready. If the appraisal comes in low, be prepared to negotiate — options include reducing the price, the buyer paying the difference, or meeting in the middle.",
  },
  "loan approval": {
    explanation: "The buyer's lender will complete underwriting, verifying the buyer's financials and the property details before issuing final loan approval (also called 'clear to close'). This is one of the last hurdles before closing day.",
    timeline: "3-4 weeks after offer acceptance",
    seller_action: "Respond quickly to any requests from the buyer's lender, such as repair receipts or additional property information. Delays in responding can push back the closing date.",
  },
  "final walkthrough": {
    explanation: "The buyer will do a final walkthrough of the property, typically 24-48 hours before closing. They're checking that agreed-upon repairs were completed, no new damage has occurred, and the property is in the expected condition.",
    timeline: "1-2 days before closing",
    seller_action: "Complete all agreed-upon repairs before the walkthrough. Remove all personal belongings unless otherwise agreed. Leave the property clean and in the condition specified in the contract. Leave all keys, garage remotes, and appliance manuals.",
  },
  closing: {
    explanation: "Closing (also called settlement) is the final step where ownership officially transfers. You'll sign the deed, settlement statement, and other legal documents. The buyer's funds are disbursed, and you receive your proceeds.",
    timeline: "Day of closing (typically 30-45 days after offer acceptance)",
    seller_action: "Bring a valid government-issued photo ID, your house keys, and any documents requested by the title company. Review the settlement statement (HUD-1 or Closing Disclosure) carefully before signing. Your net proceeds will be wired to your bank or provided via check.",
  },
  "document preparation": {
    explanation: "Legal documents including the deed, bill of sale, and settlement statement must be prepared for closing. These documents formalize the transfer of ownership and outline the financial details of the transaction.",
    timeline: "1-2 weeks before closing",
    seller_action: "Review all documents sent by the title company or closing attorney carefully. Verify that your name, the property address, sale price, and any credits or concessions are accurate. Ask questions about anything you don't understand before signing.",
  },
  "repair negotiations": {
    explanation: "After the home inspection, the buyer may request repairs or credits based on the inspector's findings. This is a normal part of the process and requires negotiation to determine what the seller will address.",
    timeline: "5-10 days after inspection",
    seller_action: "Review the buyer's repair requests carefully. Get estimates for any requested repairs. You can agree to make repairs, offer a closing credit instead, or decline. Focus on legitimate safety and structural concerns — cosmetic requests are often negotiable.",
  },
  "earnest money deposit": {
    explanation: "The buyer deposits earnest money (typically 1-3% of the purchase price) into an escrow account as a good-faith commitment to the purchase. This money is applied to the buyer's costs at closing.",
    timeline: "1-3 business days after offer acceptance",
    seller_action: "Confirm with the escrow company or title company that the earnest money has been deposited on time. If the buyer fails to deposit earnest money within the agreed timeframe, this may be grounds to cancel the contract.",
  },
  "homeowner insurance": {
    explanation: "The buyer needs to secure homeowner's insurance before closing, which their lender will require as a condition of the loan. This protects the property and is the buyer's responsibility.",
    timeline: "1-2 weeks before closing",
    seller_action: "You generally don't need to take action for the buyer's insurance, but make sure to cancel your own homeowner's insurance policy after closing (not before). Keep your policy active through closing day.",
  },
  "utility transfer": {
    explanation: "Utilities (electric, gas, water, trash, internet) need to be transferred from the seller to the buyer on the closing date so there's no gap in service.",
    timeline: "Schedule 1 week before closing, effective on closing day",
    seller_action: "Contact all utility providers to schedule disconnection or transfer for the closing date. Provide final meter readings if required. Pay any outstanding utility balances. Give the buyer a list of utility providers and account numbers to make their setup easier.",
  },
};

function normalizeStepName(step: string): string {
  return step.toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function findBestMatch(step: string): { explanation: string; timeline: string; seller_action: string } | null {
  const normalized = normalizeStepName(step);

  // Direct match
  if (stepGuides[normalized]) return stepGuides[normalized];

  // Partial match
  for (const [key, value] of Object.entries(stepGuides)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Keyword match
  const keywords: Record<string, string> = {
    title: "title search",
    inspect: "home inspection",
    apprais: "appraisal",
    loan: "loan approval",
    financ: "loan approval",
    mortgage: "loan approval",
    walk: "final walkthrough",
    close: "closing",
    settl: "closing",
    document: "document preparation",
    deed: "document preparation",
    repair: "repair negotiations",
    fix: "repair negotiations",
    earnest: "earnest money deposit",
    escrow: "earnest money deposit",
    insur: "homeowner insurance",
    utilit: "utility transfer",
    electric: "utility transfer",
    water: "utility transfer",
  };

  for (const [keyword, guideKey] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      return stepGuides[guideKey];
    }
  }

  return null;
}

function generateFallbackGuide(body: GuideRequest): { guide: GuideStep[]; source: "fallback" } {
  const { remaining_steps } = body;

  const guide: GuideStep[] = remaining_steps.map((step) => {
    const match = findBestMatch(step);
    if (match) {
      return {
        step,
        explanation: match.explanation,
        timeline: match.timeline,
        seller_action: match.seller_action,
      };
    }

    // Generic fallback for unrecognized steps
    return {
      step,
      explanation: `This is an important step in the closing process. Make sure you understand what's required and communicate with your title company or closing attorney if you have questions. Each step brings you closer to a successful sale.`,
      timeline: "Consult your title company or closing attorney for the specific timeline",
      seller_action: `Contact your title company or real estate attorney to clarify what is needed from you for this step. Keep all communication in writing and save copies of all documents. Respond promptly to any requests to avoid delays in closing.`,
    };
  });

  return { guide, source: "fallback" };
}

export async function POST(request: NextRequest) {
  try {
    const body: GuideRequest = await request.json();
    const { state, remaining_steps, property_address, sale_price } = body;

    if (!remaining_steps || remaining_steps.length === 0) {
      return json(
        { error: "At least one remaining step is required" },
        400
      );
    }

    let result: { guide: GuideStep[]; source?: string };

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
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
        throw new Error("AI response did not contain a text block");
      }

      let guide: GuideStep[];
      try {
        guide = JSON.parse(textBlock.text);
      } catch {
        throw new Error("Failed to parse AI JSON response");
      }
      result = { guide, source: "ai" };
    } catch (aiError) {
      result = generateFallbackGuide(body);
    }

    return json(result, 200);
  } catch {
    return json(
      { error: "An unexpected error occurred. Please try again." },
      500
    );
  }
}
