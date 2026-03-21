import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType } from "@selfly/shared";

const anthropic = new Anthropic();

interface GenerateRequest {
  document_type: DocumentType;
  state: string;
  property: {
    address: string;
    city?: string;
    zip_code?: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    year_built: number;
    property_type: string;
    price?: number;
  };
}

function getPrompt(req: GenerateRequest): string {
  const { document_type, state, property } = req;
  const propertyDetails = `
Property Address: ${property.address}${property.city ? `, ${property.city}` : ""}, ${state}${property.zip_code ? ` ${property.zip_code}` : ""}
Property Type: ${property.property_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Footage: ${property.sqft.toLocaleString()}
Year Built: ${property.year_built}
${property.price ? `Listed Price: $${property.price.toLocaleString()}` : ""}`.trim();

  if (document_type === "sellers_disclosure") {
    return `You are a real estate legal document generator. Generate a state-specific Seller's Disclosure Form for ${state}.

${propertyDetails}

Create a comprehensive seller's disclosure form that complies with ${state} state requirements. Include the following sections:
1. Property Information (pre-filled with the details above)
2. Structural Conditions (foundation, roof, walls, windows, doors)
3. Mechanical Systems (HVAC, plumbing, electrical, water heater)
4. Environmental Disclosures (lead paint, asbestos, mold, radon, flood zone)
5. Legal Disclosures (liens, easements, HOA, boundary disputes, pending assessments)
6. Additional Disclosures specific to ${state} state law

Use checkboxes rendered as [ ] for unchecked and [X] for checked items where the property details are known. Include signature lines at the bottom.

Return a JSON object with exactly this structure:
{
  "title": "Seller's Disclosure Statement - ${state}",
  "content": "<the full document as formatted plain text with sections, checkboxes, and signature lines>",
  "html": "<the full document as properly styled HTML for PDF rendering>"
}

The HTML version must use formal document styling: serif fonts, proper margins (1in), clear section headers, table layouts for form fields, and print-ready formatting. Use inline styles only. Return ONLY valid JSON.`;
  }

  if (document_type === "purchase_agreement") {
    return `You are a real estate legal document generator. Generate a standard Purchase Agreement template for ${state}.

${propertyDetails}

Create a comprehensive purchase agreement template that follows ${state} state conventions. Include:
1. Parties (Seller info pre-filled where possible, Buyer fields as blanks: _______________)
2. Property Description (pre-filled with address and details)
3. Purchase Price${property.price ? ` (pre-filled: $${property.price.toLocaleString()})` : " (blank for negotiation)"}
4. Earnest Money Deposit (blank amount, with escrow instructions)
5. Financing Contingency (conventional, FHA, VA, cash — with checkboxes)
6. Inspection Contingency (timeline fields)
7. Appraisal Contingency
8. Title and Closing (closing date field, title company)
9. Possession Date
10. Included/Excluded Items
11. Additional Terms and Conditions specific to ${state}
12. Signatures and Date Lines

Return a JSON object with exactly this structure:
{
  "title": "Real Estate Purchase Agreement - ${state}",
  "content": "<the full document as formatted plain text>",
  "html": "<the full document as properly styled HTML for PDF rendering>"
}

The HTML version must use formal document styling: serif fonts, proper margins (1in), clear section headers, underlined blank fields, and print-ready formatting. Use inline styles only. Return ONLY valid JSON.`;
  }

  // counter_offer
  return `You are a real estate legal document generator. Generate a Counter-Offer template for ${state}.

${propertyDetails}

Create a counter-offer template that follows ${state} state conventions. Include:
1. Reference to Original Offer (date field, buyer name blank, original offer price blank)
2. Counter-Offer Terms:
   - New Purchase Price field${property.price ? ` (suggest: $${property.price.toLocaleString()})` : ""}
   - Modified Contingencies section
   - Modified Closing Date
   - Modified Earnest Money
   - Other Modified Terms
3. Items That Remain Unchanged from Original Offer
4. Expiration Date and Time for this Counter-Offer
5. Acceptance/Rejection section
6. Signatures and Date Lines for both parties

Return a JSON object with exactly this structure:
{
  "title": "Counter-Offer to Purchase Agreement - ${state}",
  "content": "<the full document as formatted plain text>",
  "html": "<the full document as properly styled HTML for PDF rendering>"
}

The HTML version must use formal document styling: serif fonts, proper margins (1in), clear section headers, underlined blank fields, and print-ready formatting. Use inline styles only. Return ONLY valid JSON.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    const { document_type, state, property } = body;

    if (!document_type || !state || !property?.address) {
      return NextResponse.json(
        { error: "Document type, state, and property address are required" },
        { status: 400 }
      );
    }

    const prompt = getPrompt(body);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const result = JSON.parse(textBlock.text);

    return NextResponse.json({
      title: result.title,
      content: result.content,
      html: result.html,
    });
  } catch (error) {
    console.error("Document generation API error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
