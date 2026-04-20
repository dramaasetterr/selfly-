import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType } from '@/shared';
import { json, OPTIONS } from "../../_cors";

export { OPTIONS };

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing required environment variable: ANTHROPIC_API_KEY");
}

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

// State-specific disclosure form titles and requirements
const STATE_DISCLOSURE_INFO: Record<string, { title: string; statute: string; extraSections: string[] }> = {
  NY: {
    title: "NEW YORK PROPERTY CONDITION DISCLOSURE STATEMENT",
    statute: "New York Real Property Law § 462 (Property Condition Disclosure Act)",
    extraSections: [
      "Known presence of lead paint (homes built before 1978)",
      "Proximity to agricultural districts as defined under Article 25-AA",
      "Location within a flood plain or wetland area",
      "Known fuel storage tanks (above or below ground) on the property",
      "Fire district and school district information",
    ],
  },
  CA: {
    title: "CALIFORNIA TRANSFER DISCLOSURE STATEMENT (TDS)",
    statute: "California Civil Code §§ 1102-1102.17",
    extraSections: [
      "Natural Hazard Disclosure (earthquake fault zones, seismic hazard zones, fire hazard zones, flood zones, dam inundation zones)",
      "Mello-Roos Community Facilities District assessment obligations",
      "Supplemental property tax assessments",
      "Ordnance location (former military installations)",
      "Window security bars with quick-release mechanism disclosure",
      "Industrial use disclosure within one mile",
      "Smoke detector and carbon monoxide detector compliance (CA Health & Safety Code § 13113.8)",
    ],
  },
  NJ: {
    title: "NEW JERSEY SELLER'S DISCLOSURE STATEMENT",
    statute: "New Jersey Seller's Disclosure Act (N.J.S.A. 46:3C-1 et seq.)",
    extraSections: [
      "Underground storage tanks (USTs) on the property",
      "Known presence of radon or radon mitigation systems",
      "Flood zone status and flood insurance requirements",
      "Known contamination from industrial sites (NJ DEP)",
      "Off-site conditions that may affect the property value",
    ],
  },
  FL: {
    title: "FLORIDA SELLER'S REAL PROPERTY DISCLOSURE STATEMENT",
    statute: "Florida Statute § 689.261 (Johnson v. Davis disclosure standard)",
    extraSections: [
      "Sinkhole activity or claims filed under §627.7073",
      "Chinese drywall disclosure (if applicable)",
      "Coastal Construction Control Line (CCCL) status",
      "Hurricane/wind damage history and current insurance status",
      "Homestead exemption status and portability",
      "Community Development District (CDD) fees",
    ],
  },
  TX: {
    title: "TEXAS SELLER'S DISCLOSURE NOTICE",
    statute: "Texas Property Code § 5.008",
    extraSections: [
      "Location within a 100-year floodplain or reservoir area",
      "Known annexation proceedings by a municipality",
      "MUD (Municipal Utility District) or other special district taxes",
      "Propane gas system disclosure",
      "Previous termite treatment or wood-destroying insect damage",
      "Known presence of radon gas",
    ],
  },
  CO: {
    title: "COLORADO SELLER'S PROPERTY DISCLOSURE",
    statute: "Colorado Real Estate Commission form SPD19",
    extraSections: [
      "Known mining activity or mineral rights not included",
      "Location within a wildfire hazard area",
      "Water rights and well permits associated with the property",
      "Known expansive soils or geological hazards",
      "Radon disclosure (Colorado law requires written disclosure)",
    ],
  },
  CT: {
    title: "CONNECTICUT RESIDENTIAL PROPERTY CONDITION DISCLOSURE REPORT",
    statute: "Connecticut General Statutes § 20-327b",
    extraSections: [
      "Underground fuel storage tanks",
      "Coastal area or flood zone designation",
      "Known presence of radon, lead, or asbestos",
      "Private well water quality testing results",
      "Septic system inspection and maintenance records",
    ],
  },
  WA: {
    title: "WASHINGTON SELLER DISCLOSURE STATEMENT",
    statute: "Revised Code of Washington (RCW) 64.06",
    extraSections: [
      "Location within a designated critical area (wetlands, fish/wildlife habitat, geologically hazardous area, flood hazard area)",
      "Earthquake, volcanic, or landslide hazard area",
      "Growth Management Act (GMA) compliance",
      "Private well or shared water system",
      "Septic system and on-site sewage disposal records",
    ],
  },
  MA: {
    title: "MASSACHUSETTS SELLER'S STATEMENT OF PROPERTY CONDITION",
    statute: "Massachusetts General Laws Chapter 93A (consumer protection standard)",
    extraSections: [
      "Title V septic system compliance status",
      "Lead paint disclosure (required for homes built before 1978)",
      "Known presence of urea formaldehyde insulation",
      "Wetlands or conservation restrictions",
      "Smoke and carbon monoxide detector compliance certificates",
    ],
  },
  IL: {
    title: "ILLINOIS RESIDENTIAL REAL PROPERTY DISCLOSURE REPORT",
    statute: "Illinois Residential Real Property Disclosure Act (765 ILCS 77)",
    extraSections: [
      "Known presence of radon or radon mitigation system",
      "Known flooding or drainage problems (including FEMA designation)",
      "Known boundary or lot line disputes",
      "Known mine subsidence, underground mine, or other earth stability issue",
      "Mold, mildew, or other fungus problems",
    ],
  },
};

const DEFAULT_STATE_INFO = {
  title: "RESIDENTIAL PROPERTY CONDITION DISCLOSURE STATEMENT",
  statute: "State residential disclosure requirements",
  extraSections: [
    "Known presence of hazardous materials",
    "Flood zone designation or flooding history",
    "Known pest or termite activity",
    "Well and septic system condition (if applicable)",
    "Special assessment or tax district information",
  ],
};

function getStateDisclosureInfo(state: string) {
  return STATE_DISCLOSURE_INFO[state] ?? { ...DEFAULT_STATE_INFO, title: `${state} ${DEFAULT_STATE_INFO.title}` };
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
    const stateInfo = getStateDisclosureInfo(state);
    return `You are a real estate legal document generator specializing in state-specific disclosure forms. Generate a comprehensive Seller's Disclosure Form for ${state}.

${propertyDetails}

The form should be titled "${stateInfo.title}" and reference ${stateInfo.statute}.

Create an exhaustive seller's disclosure form that complies with ${state} state requirements. Include ALL of the following sections with checkbox items formatted as [ ] Yes [ ] No [ ] Unknown:

1. PROPERTY INFORMATION (pre-filled with details above)
2. STRUCTURAL CONDITIONS
   - Foundation (cracks, settling, water intrusion, repairs)
   - Roof (material, age, leaks, repairs, warranty status)
   - Exterior walls (material, damage, moisture intrusion)
   - Interior walls and ceilings (cracks, water stains, damage)
   - Windows and doors (broken seals, rot, operation issues)
   - Flooring (damage, moisture, material types)
   - Drainage and grading (standing water, erosion, French drains)
   - Garage/carport (structural issues, door operation)
   - Chimney/fireplace (condition, liner, damper)

3. MECHANICAL SYSTEMS
   - HVAC (type, age, last serviced, known issues)
   - Plumbing (material, leaks, water pressure, water heater age/type)
   - Electrical (panel amperage, wiring type, GFCI outlets, known issues)
   - Sewer/septic (type, last inspection/pump date)
   - Water supply (municipal/well, known quality issues)

4. PLUMBING AND WATER
   - Water heater (type, age, capacity)
   - Known pipe issues (leaks, corrosion, polybutylene)
   - Water quality issues
   - Sump pump presence and condition

5. ELECTRICAL SYSTEMS
   - Panel capacity and type
   - Wiring type (copper, aluminum, knob-and-tube)
   - Known deficiencies
   - Generator or solar panel systems

6. ENVIRONMENTAL DISCLOSURES
   - Lead-based paint (required for homes built before 1978 per federal law)
   - Asbestos-containing materials
   - Mold or moisture problems
   - Radon testing and results
   - Underground storage tanks
   - Soil contamination
   - Hazardous waste proximity

7. FLOOD AND WATER DAMAGE
   - Flood zone designation
   - History of flooding or water damage
   - Flood insurance requirements
   - Drainage easements

8. PEST AND WOOD-DESTROYING ORGANISMS
   - Termite inspection history
   - Known pest infestations
   - Previous treatment records
   - Structural damage from pests

9. ZONING AND LAND USE
   - Current zoning classification
   - Known zoning violations or non-conforming use
   - Planned changes or assessments
   - Easements and encroachments

10. LEGAL AND TITLE
    - Known liens or encumbrances
    - Boundary disputes
    - HOA obligations and fees
    - Pending litigation
    - CC&Rs or deed restrictions
    - Special assessments

11. STATE-SPECIFIC DISCLOSURES (${state})
${stateInfo.extraSections.map((s: string) => `    - ${s}`).join("\n")}

12. ADDITIONAL DISCLOSURES
    - Deaths on property (within state-required reporting period)
    - Known neighborhood nuisances
    - Insurance claims (past 5 years)
    - Renovations/additions (permitted/unpermitted)

Include seller certification language, date fields, and signature lines for both seller and buyer acknowledgment.

Return a JSON object with exactly this structure:
{
  "title": "${stateInfo.title}",
  "content": "<the full document as formatted plain text with all sections, checkboxes, and signature lines>",
  "html": "<the full document as properly styled HTML for PDF rendering>"
}

The HTML version must use formal legal document styling: Times New Roman font, 1-inch margins, proper section headers, table layouts for checkbox items using [ ] Yes [ ] No [ ] Unknown format, and print-ready formatting. Use inline styles only. Return ONLY valid JSON.`;
  }

  if (document_type === "purchase_agreement") {
    return `You are a real estate legal document generator. Generate a comprehensive Purchase Agreement for ${state}.

${propertyDetails}

Create a thorough, legally-styled purchase agreement that follows ${state} conventions and includes ALL standard clauses. The document must include:

1. PARTIES
   - Seller information (blanks for name, address, phone, email)
   - Buyer information (blanks for name, address, phone, email)

2. PROPERTY DESCRIPTION
   - Full address pre-filled
   - Legal description (blank field)
   - Property type and details pre-filled
   - Tax parcel/assessor number (blank field)

3. PURCHASE PRICE AND PAYMENT
   - Total purchase price${property.price ? ` (pre-filled: $${property.price.toLocaleString()})` : " (blank)"}
   - Earnest money deposit amount and timeline
   - Additional deposit amount (if any)
   - Balance due at closing
   - Form of payment at closing

4. EARNEST MONEY
   - Amount (blank field)
   - Escrow agent/title company (blank field)
   - Deadline to deposit (business days from acceptance)
   - Disposition upon default by Buyer or Seller
   - Dispute resolution for earnest money

5. FINANCING CONTINGENCY
   - Checkboxes: [ ] Cash (no financing) [ ] Conventional [ ] FHA [ ] VA [ ] Other
   - Loan amount, interest rate cap, loan term
   - Financing application deadline
   - Financing commitment deadline
   - Failure to obtain financing provisions

6. INSPECTION CONTINGENCY
   - Inspection period (days from acceptance)
   - Types of inspections (general, radon, pest, well/septic, environmental)
   - Buyer's rights upon inspection findings
   - Seller's response deadline
   - Resolution procedures (repair, credit, price reduction, termination)

7. APPRAISAL CONTINGENCY
   - Property must appraise at or above purchase price
   - Options if appraisal is low (renegotiate, buyer pays difference, terminate)
   - Appraisal deadline

8. TITLE AND SURVEY
   - Seller to provide marketable title
   - Title insurance requirements (owner's and lender's)
   - Title commitment delivery deadline
   - Buyer's objection period
   - Survey requirements and deadline
   - Permitted exceptions

9. CLOSING
   - Closing date (blank field)
   - Closing location/agent
   - Closing costs allocation (buyer vs. seller)
   - Prorations (property taxes, HOA dues, utilities, rent)
   - Transfer taxes and recording fees responsibility

10. POSSESSION
    - Possession date: [ ] At closing [ ] On specific date
    - Early possession provisions
    - Holdover penalties ($___/day)
    - Property condition at possession

11. PERSONAL PROPERTY INCLUDED/EXCLUDED
    - Included items (appliances, fixtures, window treatments, etc.)
    - Excluded items
    - Leased items disclosure

12. PROPERTY CONDITION AND WARRANTIES
    - Seller warranties about property condition
    - "As-is" provisions (if applicable)
    - Risk of loss before closing
    - Maintenance obligations before closing

13. DEFAULT AND REMEDIES
    - Buyer default provisions
    - Seller default provisions
    - Specific performance rights
    - Liquidated damages clause
    - Attorney fees provision

14. ADDITIONAL TERMS AND CONDITIONS (${state})
    - State-specific requirements
    - Additional contingencies (blank)
    - Special stipulations (blank)

15. MISCELLANEOUS
    - Entire agreement clause
    - Amendments must be in writing
    - Time is of the essence
    - Governing law (${state})
    - Notices provision
    - Binding on heirs and assigns
    - Severability
    - Counterparts

16. SIGNATURES AND ACKNOWLEDGMENT
    - Seller signature, printed name, date
    - Buyer signature, printed name, date
    - Agent/witness (if applicable)

Return a JSON object with exactly this structure:
{
  "title": "Real Estate Purchase Agreement - ${state}",
  "content": "<the full document as formatted plain text>",
  "html": "<the full document as properly styled HTML for PDF rendering>"
}

The HTML version must use formal legal document styling: Times New Roman, 1-inch margins, numbered sections, underlined blank fields, and print-ready formatting. Use inline styles only. Return ONLY valid JSON.`;
  }

  // counter_offer
  return `You are a real estate legal document generator. Generate a detailed Counter-Offer form for ${state}.

${propertyDetails}

Create a complete counter-offer template that follows ${state} conventions. Include:

1. COUNTER-OFFER IDENTIFICATION
   - Counter-Offer Number: ___
   - Date of this Counter-Offer
   - Property address (pre-filled)

2. REFERENCE TO ORIGINAL OFFER
   - Original Offer dated: _______ by Buyer: _______
   - Original offer price: $_______

3. COUNTER-OFFER TERMS — PURCHASE PRICE
   - Seller counters with purchase price of: ${property.price ? `$${property.price.toLocaleString()}` : "$_______"}
   - Amount in words: _______

4. MODIFIED EARNEST MONEY
   - New earnest money amount: $_______
   - Deposit deadline modification

5. MODIFIED FINANCING TERMS
   - [ ] No change to financing terms
   - [ ] Modified financing: _______

6. MODIFIED CONTINGENCIES
   - [ ] No change to contingency terms
   - [ ] Modified inspection period: _______ days
   - [ ] Appraisal contingency: [ ] Retained [ ] Waived [ ] Modified
   - [ ] Other modified contingencies: _______

7. MODIFIED CLOSING DATE
   - [ ] No change to closing date
   - [ ] New closing date: _______

8. MODIFIED POSSESSION DATE
   - [ ] No change to possession terms
   - [ ] New possession date: _______
   - [ ] Possession holdover terms: _______

9. PERSONAL PROPERTY MODIFICATIONS
   - [ ] No change to included/excluded items
   - [ ] Modified included items: _______
   - [ ] Modified excluded items: _______

10. ADDITIONAL MODIFIED TERMS
    - Closing cost allocation changes
    - Repair/credit modifications
    - Other terms: _______

11. TERMS THAT REMAIN UNCHANGED
    - All terms of the Original Offer not specifically modified above remain in full force

12. EXPIRATION OF COUNTER-OFFER
    - This Counter-Offer expires at ___:___ AM/PM on _______
    - If not accepted by expiration, Original Offer is: [ ] Rejected [ ] Still open for acceptance

13. ACCEPTANCE / REJECTION / COUNTER
    - [ ] Buyer ACCEPTS this Counter-Offer in its entirety
    - [ ] Buyer REJECTS this Counter-Offer
    - [ ] Buyer submits Counter-Offer #___ (attached)

14. SIGNATURES
    - Seller signature, printed name, date, time
    - Buyer acceptance signature, printed name, date, time

Return a JSON object with exactly this structure:
{
  "title": "Counter-Offer to Purchase Agreement - ${state}",
  "content": "<the full document as formatted plain text>",
  "html": "<the full document as properly styled HTML for PDF rendering>"
}

The HTML version must use formal legal document styling: Times New Roman, 1-inch margins, clear sections, checkboxes, underlined blank fields, and print-ready formatting. Use inline styles only. Return ONLY valid JSON.`;
}

const htmlDocStyle = `style="font-family: 'Times New Roman', Times, serif; max-width: 8.5in; margin: 0 auto; padding: 1in; line-height: 1.6; color: #000;"`;
const htmlH1Style = `style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;"`;
const htmlSubtitle = `style="text-align: center; font-size: 10pt; margin-bottom: 20px; color: #333;"`;
const htmlH2Style = `style="font-size: 13pt; font-weight: bold; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px; text-transform: uppercase;"`;
const htmlH3Style = `style="font-size: 11pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px;"`;
const htmlPStyle = `style="margin: 6px 0; font-size: 11pt;"`;
const htmlCheckRow = `style="margin: 4px 0 4px 20px; font-size: 10.5pt;"`;
const htmlBlank = `style="display: inline-block; min-width: 200px; border-bottom: 1px solid #000;"`;
const htmlShortBlank = `style="display: inline-block; min-width: 100px; border-bottom: 1px solid #000;"`;
const htmlSigLine = `style="margin-top: 40px; border-top: 1px solid #000; width: 300px; display: inline-block;"`;
const htmlLegal = `style="font-size: 9pt; color: #444; margin-top: 30px; border-top: 1px solid #999; padding-top: 10px;"`;

function checkboxHtml(label: string): string {
  return `<p ${htmlCheckRow}>\u2610 Yes &nbsp; \u2610 No &nbsp; \u2610 Unknown &nbsp;&nbsp; ${label}</p>`;
}

function checkboxPlain(label: string): string {
  return `[ ] Yes  [ ] No  [ ] Unknown    ${label}`;
}

function generateFallbackDocument(req: GenerateRequest): { title: string; content: string; html: string; source: "fallback" } {
  const { document_type, state, property } = req;
  const fullAddress = `${property.address}${property.city ? `, ${property.city}` : ""}, ${state}${property.zip_code ? ` ${property.zip_code}` : ""}`;
  const propertyTypeLabel = property.property_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const priceStr = property.price ? `$${property.price.toLocaleString()}` : "$_______________";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  if (document_type === "sellers_disclosure") {
    return generateSellersDisclosure(state, property, fullAddress, propertyTypeLabel, today);
  }

  if (document_type === "purchase_agreement") {
    return generatePurchaseAgreement(state, property, fullAddress, propertyTypeLabel, priceStr, today);
  }

  // counter_offer
  return generateCounterOffer(state, property, fullAddress, propertyTypeLabel, priceStr, today);
}

function generateSellersDisclosure(
  state: string,
  property: GenerateRequest["property"],
  fullAddress: string,
  propertyTypeLabel: string,
  today: string,
): { title: string; content: string; html: string; source: "fallback" } {
  const stateInfo = getStateDisclosureInfo(state);
  const title = stateInfo.title;
  const prePaint = property.year_built < 1978;

  // PLAIN TEXT
  const content = `${title}
Pursuant to ${stateInfo.statute}
Date: ${today}

═══════════════════════════════════════════════════════════════
SECTION 1: PROPERTY INFORMATION
═══════════════════════════════════════════════════════════════
Property Address: ${fullAddress}
Property Type: ${propertyTypeLabel}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Footage: ${property.sqft.toLocaleString()}
Year Built: ${property.year_built}
Seller Name(s): _______________________________________________
Seller Mailing Address: _______________________________________________
Date Seller Acquired Property: _______________
Has Seller occupied the property? [ ] Yes [ ] No
If yes, dates of occupancy: _______________

═══════════════════════════════════════════════════════════════
SECTION 2: STRUCTURAL CONDITIONS
═══════════════════════════════════════════════════════════════
The Seller discloses the following regarding structural conditions.
For each item, indicate: [ ] Yes (issue exists) [ ] No [ ] Unknown

FOUNDATION
${checkboxPlain("Cracks in foundation (hairline, moderate, or major)")}
${checkboxPlain("Evidence of settling or shifting")}
${checkboxPlain("Water intrusion through foundation")}
${checkboxPlain("Previous foundation repairs (describe): _______")}

ROOF
${checkboxPlain("Current leaks or previous leak damage")}
${checkboxPlain("Missing, broken, or curling shingles/tiles")}
Roof material: _______ Approximate age: _______ years
Last inspection date: _______ Warranty: [ ] Yes [ ] No Expires: _______

EXTERIOR WALLS
${checkboxPlain("Cracks or damage to exterior surfaces")}
${checkboxPlain("Evidence of moisture intrusion or rot")}
${checkboxPlain("Previous repairs to exterior (describe): _______")}
Siding material: _______

INTERIOR WALLS AND CEILINGS
${checkboxPlain("Cracks in walls or ceilings")}
${checkboxPlain("Water stains or evidence of water damage")}
${checkboxPlain("Evidence of previous repairs to walls/ceilings")}

WINDOWS AND DOORS
${checkboxPlain("Broken or fogged window seals")}
${checkboxPlain("Windows or doors that do not operate properly")}
${checkboxPlain("Evidence of rot or deterioration")}
Window type: _______ Approximate age: _______

FLOORING
${checkboxPlain("Damage to flooring surfaces")}
${checkboxPlain("Evidence of moisture damage under flooring")}
${checkboxPlain("Uneven or sagging floors")}

DRAINAGE AND GRADING
${checkboxPlain("Standing water or poor drainage on property")}
${checkboxPlain("Erosion issues")}
${checkboxPlain("French drains or other drainage systems installed")}

GARAGE/CARPORT
${checkboxPlain("Structural issues with garage or carport")}
${checkboxPlain("Garage door opener malfunction")}
${checkboxPlain("Cracks in garage floor")}

CHIMNEY/FIREPLACE
${checkboxPlain("Fireplace present: [ ] Wood [ ] Gas [ ] None")}
${checkboxPlain("Chimney cracks, deterioration, or needed repairs")}
${checkboxPlain("Last chimney inspection date: _______")}

═══════════════════════════════════════════════════════════════
SECTION 3: MECHANICAL SYSTEMS (HVAC)
═══════════════════════════════════════════════════════════════
Heating system type: _______ Fuel: _______ Age: _______ years
Air conditioning type: _______ Age: _______ years
Last HVAC service date: _______
${checkboxPlain("Known HVAC deficiencies or needed repairs")}
${checkboxPlain("Zones not adequately heated or cooled")}
${checkboxPlain("Ductwork issues (leaks, poor airflow)")}

═══════════════════════════════════════════════════════════════
SECTION 4: PLUMBING AND WATER
═══════════════════════════════════════════════════════════════
Water supply: [ ] Municipal [ ] Private well [ ] Shared well
Sewer: [ ] Public sewer [ ] Septic system [ ] Cesspool
Water heater type: _______ Age: _______ Capacity: _______ gallons
Pipe material: [ ] Copper [ ] PEX [ ] PVC [ ] Galvanized [ ] Polybutylene [ ] Unknown
${checkboxPlain("Known pipe leaks or corrosion")}
${checkboxPlain("Low water pressure issues")}
${checkboxPlain("Discolored or poor-quality water")}
${checkboxPlain("Sump pump present and operational")}
${checkboxPlain("Water softener or filtration system")}
If septic: Last inspection date: _______ Last pumped: _______
If well: Last water quality test: _______ Results: _______

═══════════════════════════════════════════════════════════════
SECTION 5: ELECTRICAL SYSTEMS
═══════════════════════════════════════════════════════════════
Electrical panel capacity: _______ amps Brand: _______
Wiring type: [ ] Copper [ ] Aluminum [ ] Knob-and-tube [ ] Unknown
${checkboxPlain("Panel has been upgraded or replaced")}
${checkboxPlain("Known electrical deficiencies")}
${checkboxPlain("Electrical outlets that do not work")}
${checkboxPlain("GFCI outlets in kitchen, bathrooms, exterior, garage")}
${checkboxPlain("AFCI breakers installed")}
${checkboxPlain("Solar panel system: [ ] Owned [ ] Leased [ ] None")}
${checkboxPlain("Backup generator: [ ] Yes [ ] No")}

═══════════════════════════════════════════════════════════════
SECTION 6: ENVIRONMENTAL DISCLOSURES
═══════════════════════════════════════════════════════════════
LEAD-BASED PAINT${prePaint ? " (REQUIRED — home built before 1978 per 42 U.S.C. § 4852d)" : ""}
${checkboxPlain("Known lead-based paint or lead-based paint hazards")}
${checkboxPlain("Lead-based paint inspection or risk assessment conducted")}
${prePaint ? "Seller is required to provide Buyer with any known information regarding lead-based paint and/or lead-based paint hazards, and the EPA pamphlet \"Protect Your Family From Lead in Your Home.\"" : "Property was built after 1978; federal lead paint disclosure not required."}

ASBESTOS
${checkboxPlain("Known asbestos-containing materials in the property")}
${checkboxPlain("Asbestos testing or abatement performed")}

MOLD AND MOISTURE
${checkboxPlain("Known mold or mildew problems")}
${checkboxPlain("Known moisture issues (condensation, humidity, dampness)")}
${checkboxPlain("Mold remediation performed (date: _______)")}

RADON
${checkboxPlain("Radon testing conducted")}
Test results: _______ pCi/L Date tested: _______
${checkboxPlain("Radon mitigation system installed")}

OTHER ENVIRONMENTAL
${checkboxPlain("Underground storage tanks (active or abandoned)")}
${checkboxPlain("Above-ground storage tanks")}
${checkboxPlain("Known soil contamination")}
${checkboxPlain("Proximity to waste disposal sites, Superfund sites, or industrial facilities")}
${checkboxPlain("Known electromagnetic field (EMF) sources nearby")}

═══════════════════════════════════════════════════════════════
SECTION 7: FLOOD AND WATER DAMAGE HISTORY
═══════════════════════════════════════════════════════════════
FEMA Flood Zone Designation: _______ Map Number: _______
${checkboxPlain("Property is in a FEMA-designated flood zone")}
${checkboxPlain("Flood insurance currently maintained")}
Annual flood insurance premium: $_______
${checkboxPlain("Property has experienced flooding or water damage")}
If yes, describe dates and extent: _______________________________________________
${checkboxPlain("Water damage claims filed with insurance")}
${checkboxPlain("Drainage easements on the property")}

═══════════════════════════════════════════════════════════════
SECTION 8: PEST AND WOOD-DESTROYING ORGANISMS
═══════════════════════════════════════════════════════════════
${checkboxPlain("Known termite or other wood-destroying insect activity")}
${checkboxPlain("Previous termite inspection performed")}
Last inspection date: _______ Company: _______
${checkboxPlain("Termite treatment history")}
Last treatment date: _______ Type: _______
${checkboxPlain("Active termite warranty or bond: [ ] Yes [ ] No")}
${checkboxPlain("Structural damage from wood-destroying organisms")}
${checkboxPlain("Other pest infestations (rodents, carpenter ants, etc.)")}
${checkboxPlain("Pest control service currently active")}

═══════════════════════════════════════════════════════════════
SECTION 9: ZONING AND LAND USE
═══════════════════════════════════════════════════════════════
Current zoning classification: _______
${checkboxPlain("Known zoning violations")}
${checkboxPlain("Non-conforming use (legal or illegal)")}
${checkboxPlain("Known planned changes to zoning or land use nearby")}
${checkboxPlain("Easements affecting the property (utility, access, drainage)")}
${checkboxPlain("Encroachments (by or upon this property)")}
${checkboxPlain("Required permits obtained for all improvements/additions")}
${checkboxPlain("Unpermitted additions, structures, or modifications")}

═══════════════════════════════════════════════════════════════
SECTION 10: LEGAL AND TITLE
═══════════════════════════════════════════════════════════════
${checkboxPlain("Known liens or encumbrances")}
${checkboxPlain("Boundary or lot line disputes")}
${checkboxPlain("Homeowners Association (HOA)")}
If HOA: Monthly dues: $_______ Special assessments pending: [ ] Yes [ ] No
HOA management company: _______
${checkboxPlain("CC&Rs, deed restrictions, or covenants")}
${checkboxPlain("Pending litigation affecting the property")}
${checkboxPlain("Judgments or claims against the Seller affecting the property")}
${checkboxPlain("Special assessment districts (taxes, fees, bonds)")}
${checkboxPlain("Property is subject to a land lease")}

═══════════════════════════════════════════════════════════════
SECTION 11: STATE-SPECIFIC DISCLOSURES (${state})
═══════════════════════════════════════════════════════════════
Pursuant to ${stateInfo.statute}, the Seller additionally discloses:

${stateInfo.extraSections.map(s => checkboxPlain(s)).join("\n")}

Additional state-specific notes: _______________________________________________

═══════════════════════════════════════════════════════════════
SECTION 12: ADDITIONAL DISCLOSURES
═══════════════════════════════════════════════════════════════
${checkboxPlain("Deaths on property within state-required reporting period")}
${checkboxPlain("Known neighborhood nuisances (noise, odors, traffic, etc.)")}
${checkboxPlain("Insurance claims filed in the past 5 years")}
If yes, describe: _______________________________________________
${checkboxPlain("Renovations or additions made during Seller's ownership")}
If yes, were permits obtained? [ ] Yes [ ] No [ ] Some
Describe work performed: _______________________________________________
${checkboxPlain("Home warranty currently in effect")}
Warranty company: _______ Expires: _______
${checkboxPlain("Property used for any commercial or business purpose")}
${checkboxPlain("Known issues not addressed above")}
If yes, describe: _______________________________________________

═══════════════════════════════════════════════════════════════
SELLER CERTIFICATION
═══════════════════════════════════════════════════════════════
The Seller certifies that the information provided in this Disclosure Statement is true, correct, and complete to the best of the Seller's knowledge as of the date signed below. Seller agrees to promptly notify Buyer of any changes to the information provided herein that occur prior to closing.

This disclosure is not a warranty or guarantee of any kind by the Seller or any agent representing the Seller. It is not a substitute for any inspections the Buyer may wish to obtain. Buyer is advised to obtain independent professional inspections of the property.

Seller Signature: _________________________ Date: ____________
Seller Printed Name: _________________________

Seller Signature: _________________________ Date: ____________
Seller Printed Name: _________________________

═══════════════════════════════════════════════════════════════
BUYER ACKNOWLEDGMENT
═══════════════════════════════════════════════════════════════
Buyer acknowledges receipt and review of this Seller's Disclosure Statement. Buyer understands that this disclosure is based on Seller's knowledge and is not a substitute for professional inspections. Buyer is encouraged to obtain all desired inspections prior to the expiration of any inspection contingency period.

Buyer Signature: _________________________ Date: ____________
Buyer Printed Name: _________________________

Buyer Signature: _________________________ Date: ____________
Buyer Printed Name: _________________________`;

  // HTML VERSION
  const html = `<div ${htmlDocStyle}>
<h1 ${htmlH1Style}>${title}</h1>
<p ${htmlSubtitle}>Pursuant to ${stateInfo.statute}</p>
<p style="text-align: center; font-size: 11pt;">Date: ${today}</p>

<h2 ${htmlH2Style}>Section 1: Property Information</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 11pt; border: 1px solid #ccc;">
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; width: 200px; font-weight: bold; border: 1px solid #ccc;">Property Address</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${fullAddress}</td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Property Type</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${propertyTypeLabel}</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Bedrooms</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.bedrooms}</td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Bathrooms</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.bathrooms}</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Square Footage</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.sqft.toLocaleString()}</td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Year Built</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.year_built}</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Seller Name(s)</td><td style="padding: 6px 10px; border: 1px solid #ccc;"><span ${htmlBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Date Acquired</td><td style="padding: 6px 10px; border: 1px solid #ccc;"><span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Seller Occupied?</td><td style="padding: 6px 10px; border: 1px solid #ccc;">\u2610 Yes &nbsp; \u2610 No &nbsp; Dates: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
</table>

<h2 ${htmlH2Style}>Section 2: Structural Conditions</h2>
<p ${htmlPStyle}><em>For each item below, indicate whether an issue exists:</em></p>

<h3 ${htmlH3Style}>Foundation</h3>
${checkboxHtml("Cracks in foundation (hairline, moderate, or major)")}
${checkboxHtml("Evidence of settling or shifting")}
${checkboxHtml("Water intrusion through foundation")}
${checkboxHtml("Previous foundation repairs")}
<p ${htmlCheckRow}>If yes, describe: <span ${htmlBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Roof</h3>
${checkboxHtml("Current leaks or previous leak damage")}
${checkboxHtml("Missing, broken, or curling shingles/tiles")}
<p ${htmlCheckRow}>Roof material: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Age: <span ${htmlShortBlank}>&nbsp;</span> years</p>
<p ${htmlCheckRow}>Last inspection: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Warranty: \u2610 Yes \u2610 No &nbsp; Expires: <span ${htmlShortBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Exterior Walls</h3>
${checkboxHtml("Cracks or damage to exterior surfaces")}
${checkboxHtml("Evidence of moisture intrusion or rot")}
<p ${htmlCheckRow}>Siding material: <span ${htmlShortBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Interior Walls and Ceilings</h3>
${checkboxHtml("Cracks in walls or ceilings")}
${checkboxHtml("Water stains or evidence of water damage")}
${checkboxHtml("Evidence of previous repairs")}

<h3 ${htmlH3Style}>Windows and Doors</h3>
${checkboxHtml("Broken or fogged window seals")}
${checkboxHtml("Windows or doors that do not operate properly")}
${checkboxHtml("Evidence of rot or deterioration")}
<p ${htmlCheckRow}>Window type: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Age: <span ${htmlShortBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Flooring</h3>
${checkboxHtml("Damage to flooring surfaces")}
${checkboxHtml("Evidence of moisture damage under flooring")}
${checkboxHtml("Uneven or sagging floors")}

<h3 ${htmlH3Style}>Drainage and Grading</h3>
${checkboxHtml("Standing water or poor drainage on property")}
${checkboxHtml("Erosion issues")}
${checkboxHtml("French drains or other drainage systems installed")}

<h3 ${htmlH3Style}>Garage/Carport</h3>
${checkboxHtml("Structural issues with garage or carport")}
${checkboxHtml("Garage door opener malfunction")}
${checkboxHtml("Cracks in garage floor")}

<h3 ${htmlH3Style}>Chimney/Fireplace</h3>
<p ${htmlCheckRow}>Fireplace: \u2610 Wood &nbsp; \u2610 Gas &nbsp; \u2610 None</p>
${checkboxHtml("Chimney cracks, deterioration, or needed repairs")}
<p ${htmlCheckRow}>Last chimney inspection: <span ${htmlShortBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>Section 3: Mechanical Systems (HVAC)</h2>
<p ${htmlCheckRow}>Heating type: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Fuel: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Age: <span ${htmlShortBlank}>&nbsp;</span> years</p>
<p ${htmlCheckRow}>A/C type: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Age: <span ${htmlShortBlank}>&nbsp;</span> years</p>
<p ${htmlCheckRow}>Last HVAC service: <span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Known HVAC deficiencies or needed repairs")}
${checkboxHtml("Zones not adequately heated or cooled")}
${checkboxHtml("Ductwork issues (leaks, poor airflow)")}

<h2 ${htmlH2Style}>Section 4: Plumbing and Water</h2>
<p ${htmlCheckRow}>Water supply: \u2610 Municipal &nbsp; \u2610 Private well &nbsp; \u2610 Shared well</p>
<p ${htmlCheckRow}>Sewer: \u2610 Public sewer &nbsp; \u2610 Septic system &nbsp; \u2610 Cesspool</p>
<p ${htmlCheckRow}>Water heater type: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Age: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Capacity: <span ${htmlShortBlank}>&nbsp;</span> gal</p>
<p ${htmlCheckRow}>Pipe material: \u2610 Copper &nbsp; \u2610 PEX &nbsp; \u2610 PVC &nbsp; \u2610 Galvanized &nbsp; \u2610 Polybutylene &nbsp; \u2610 Unknown</p>
${checkboxHtml("Known pipe leaks or corrosion")}
${checkboxHtml("Low water pressure issues")}
${checkboxHtml("Discolored or poor-quality water")}
${checkboxHtml("Sump pump present and operational")}
${checkboxHtml("Water softener or filtration system")}
<p ${htmlCheckRow}>If septic — Last inspection: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Last pumped: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>If well — Last water test: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Results: <span ${htmlShortBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>Section 5: Electrical Systems</h2>
<p ${htmlCheckRow}>Panel capacity: <span ${htmlShortBlank}>&nbsp;</span> amps &nbsp; Brand: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>Wiring: \u2610 Copper &nbsp; \u2610 Aluminum &nbsp; \u2610 Knob-and-tube &nbsp; \u2610 Unknown</p>
${checkboxHtml("Panel has been upgraded or replaced")}
${checkboxHtml("Known electrical deficiencies")}
${checkboxHtml("Outlets that do not work")}
${checkboxHtml("GFCI outlets in kitchen, bathrooms, exterior, garage")}
${checkboxHtml("AFCI breakers installed")}
<p ${htmlCheckRow}>Solar panels: \u2610 Owned &nbsp; \u2610 Leased &nbsp; \u2610 None</p>
<p ${htmlCheckRow}>Backup generator: \u2610 Yes &nbsp; \u2610 No</p>

<h2 ${htmlH2Style}>Section 6: Environmental Disclosures</h2>
<h3 ${htmlH3Style}>Lead-Based Paint${prePaint ? ' <span style="color: red; font-weight: bold;">(REQUIRED — home built before 1978 per 42 U.S.C. § 4852d)</span>' : ""}</h3>
${checkboxHtml("Known lead-based paint or lead-based paint hazards")}
${checkboxHtml("Lead-based paint inspection or risk assessment conducted")}
${prePaint ? `<p style="margin: 8px 0 8px 20px; font-size: 10pt; background: #fff3cd; padding: 8px; border: 1px solid #ffc107;"><strong>Federal Requirement:</strong> Seller must provide Buyer with any known information regarding lead-based paint and the EPA pamphlet "Protect Your Family From Lead in Your Home."</p>` : ""}

<h3 ${htmlH3Style}>Asbestos</h3>
${checkboxHtml("Known asbestos-containing materials")}
${checkboxHtml("Asbestos testing or abatement performed")}

<h3 ${htmlH3Style}>Mold and Moisture</h3>
${checkboxHtml("Known mold or mildew problems")}
${checkboxHtml("Known moisture issues (condensation, humidity, dampness)")}
${checkboxHtml("Mold remediation performed")}
<p ${htmlCheckRow}>Date of remediation: <span ${htmlShortBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Radon</h3>
${checkboxHtml("Radon testing conducted")}
<p ${htmlCheckRow}>Results: <span ${htmlShortBlank}>&nbsp;</span> pCi/L &nbsp; Date: <span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Radon mitigation system installed")}

<h3 ${htmlH3Style}>Other Environmental</h3>
${checkboxHtml("Underground storage tanks (active or abandoned)")}
${checkboxHtml("Above-ground storage tanks")}
${checkboxHtml("Known soil contamination")}
${checkboxHtml("Proximity to waste disposal/Superfund/industrial sites")}

<h2 ${htmlH2Style}>Section 7: Flood and Water Damage History</h2>
<p ${htmlCheckRow}>FEMA Flood Zone: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Map #: <span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Property is in a FEMA-designated flood zone")}
${checkboxHtml("Flood insurance currently maintained")}
<p ${htmlCheckRow}>Annual premium: $<span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Property has experienced flooding or water damage")}
<p ${htmlCheckRow}>Describe: <span ${htmlBlank}>&nbsp;</span></p>
${checkboxHtml("Water damage claims filed with insurance")}
${checkboxHtml("Drainage easements on the property")}

<h2 ${htmlH2Style}>Section 8: Pest and Wood-Destroying Organisms</h2>
${checkboxHtml("Known termite or wood-destroying insect activity")}
${checkboxHtml("Previous termite inspection performed")}
<p ${htmlCheckRow}>Last inspection: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Company: <span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Termite treatment history")}
<p ${htmlCheckRow}>Last treatment: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Type: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>Active warranty/bond: \u2610 Yes &nbsp; \u2610 No</p>
${checkboxHtml("Structural damage from wood-destroying organisms")}
${checkboxHtml("Other pest infestations (rodents, carpenter ants, etc.)")}
${checkboxHtml("Pest control service currently active")}

<h2 ${htmlH2Style}>Section 9: Zoning and Land Use</h2>
<p ${htmlCheckRow}>Current zoning: <span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Known zoning violations")}
${checkboxHtml("Non-conforming use (legal or illegal)")}
${checkboxHtml("Known planned changes to zoning or land use nearby")}
${checkboxHtml("Easements affecting the property (utility, access, drainage)")}
${checkboxHtml("Encroachments (by or upon this property)")}
${checkboxHtml("Required permits obtained for all improvements")}
${checkboxHtml("Unpermitted additions, structures, or modifications")}

<h2 ${htmlH2Style}>Section 10: Legal and Title</h2>
${checkboxHtml("Known liens or encumbrances")}
${checkboxHtml("Boundary or lot line disputes")}
${checkboxHtml("Homeowners Association (HOA)")}
<p ${htmlCheckRow}>Monthly HOA dues: $<span ${htmlShortBlank}>&nbsp;</span> &nbsp; Pending special assessments: \u2610 Yes \u2610 No</p>
<p ${htmlCheckRow}>HOA company: <span ${htmlBlank}>&nbsp;</span></p>
${checkboxHtml("CC&Rs, deed restrictions, or covenants")}
${checkboxHtml("Pending litigation affecting the property")}
${checkboxHtml("Judgments or claims against Seller affecting property")}
${checkboxHtml("Special assessment districts (taxes, fees, bonds)")}
${checkboxHtml("Property subject to a land lease")}

<h2 ${htmlH2Style}>Section 11: State-Specific Disclosures (${state})</h2>
<p ${htmlPStyle}><em>Pursuant to ${stateInfo.statute}, the Seller additionally discloses:</em></p>
${stateInfo.extraSections.map((s: string) => checkboxHtml(s)).join("\n")}
<p ${htmlCheckRow}>Additional notes: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>Section 12: Additional Disclosures</h2>
${checkboxHtml("Deaths on property within state-required reporting period")}
${checkboxHtml("Known neighborhood nuisances (noise, odors, traffic)")}
${checkboxHtml("Insurance claims filed in past 5 years")}
<p ${htmlCheckRow}>Describe: <span ${htmlBlank}>&nbsp;</span></p>
${checkboxHtml("Renovations or additions during Seller's ownership")}
<p ${htmlCheckRow}>Permits obtained: \u2610 Yes \u2610 No \u2610 Some</p>
<p ${htmlCheckRow}>Describe work: <span ${htmlBlank}>&nbsp;</span></p>
${checkboxHtml("Home warranty currently in effect")}
<p ${htmlCheckRow}>Company: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Expires: <span ${htmlShortBlank}>&nbsp;</span></p>
${checkboxHtml("Property used for commercial or business purpose")}
${checkboxHtml("Known issues not addressed in sections above")}
<p ${htmlCheckRow}>Describe: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>Seller Certification</h2>
<p ${htmlPStyle}>The Seller certifies that the information provided in this Disclosure Statement is true, correct, and complete to the best of the Seller's knowledge as of the date signed below. Seller agrees to promptly notify Buyer of any changes to the information provided herein that occur prior to closing.</p>
<p ${htmlPStyle}><em>This disclosure is not a warranty or guarantee of any kind by the Seller or any agent representing the Seller. It is not a substitute for any inspections the Buyer may wish to obtain. Buyer is advised to obtain independent professional inspections.</em></p>
<br/>
<table style="width: 100%; font-size: 11pt;">
<tr><td style="width: 50%; padding: 8px;">Seller Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td style="padding: 20px 8px 8px;">Seller Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 20px 8px 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
</table>

<h2 ${htmlH2Style}>Buyer Acknowledgment</h2>
<p ${htmlPStyle}>Buyer acknowledges receipt and review of this Seller's Disclosure Statement. Buyer understands that this disclosure is based on Seller's knowledge and is not a substitute for professional inspections.</p>
<br/>
<table style="width: 100%; font-size: 11pt;">
<tr><td style="width: 50%; padding: 8px;">Buyer Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td style="padding: 20px 8px 8px;">Buyer Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 20px 8px 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
</table>

<p ${htmlLegal}>This form is provided as a disclosure aid and does not constitute legal advice. Parties are advised to consult with a licensed real estate attorney in ${state} for legal guidance. Form generated on ${today}.</p>
</div>`;

  return { title, content, html, source: "fallback" };
}

function generatePurchaseAgreement(
  state: string,
  property: GenerateRequest["property"],
  fullAddress: string,
  propertyTypeLabel: string,
  priceStr: string,
  today: string,
): { title: string; content: string; html: string; source: "fallback" } {
  const title = `Real Estate Purchase Agreement - ${state}`;

  const content = `${title}
Date: ${today}

THIS REAL ESTATE PURCHASE AGREEMENT ("Agreement") is entered into as of the date of final acceptance by both parties, by and between:

═══════════════════════════════════════════════════════════════
1. PARTIES
═══════════════════════════════════════════════════════════════
SELLER:
Name(s): _______________________________________________
Address: _______________________________________________
Phone: _______________________ Email: _______________________

BUYER:
Name(s): _______________________________________________
Address: _______________________________________________
Phone: _______________________ Email: _______________________

═══════════════════════════════════════════════════════════════
2. PROPERTY DESCRIPTION
═══════════════════════════════════════════════════════════════
Street Address: ${fullAddress}
Property Type: ${propertyTypeLabel}
Bedrooms: ${property.bedrooms} | Bathrooms: ${property.bathrooms}
Square Footage: ${property.sqft.toLocaleString()} | Year Built: ${property.year_built}
Legal Description: _______________________________________________
Tax Parcel / Assessor Number: _______________________________________________

Together with all improvements, fixtures, and appurtenances thereto, and all rights, privileges, and easements appurtenant thereto (collectively, the "Property").

═══════════════════════════════════════════════════════════════
3. PURCHASE PRICE AND PAYMENT
═══════════════════════════════════════════════════════════════
a) Total Purchase Price: ${priceStr}
   (______________________________________________ Dollars)

b) Payment shall be made as follows:
   Earnest Money Deposit:         $_______________
   Additional Deposit (if any):   $_______________
   Loan Amount (if financed):     $_______________
   Balance Due at Closing:        $_______________
                                  ─────────────────
   TOTAL:                         ${priceStr}

c) Form of payment at closing: [ ] Certified check [ ] Wire transfer [ ] Other: _______

═══════════════════════════════════════════════════════════════
4. EARNEST MONEY DEPOSIT
═══════════════════════════════════════════════════════════════
a) Amount: $_______________
b) Escrow Agent: _______________________________________________
   Address: _______________________________________________
c) Deposit due within _______ business days of mutual acceptance of this Agreement.
d) Earnest money shall be applied toward the purchase price at closing.
e) DEFAULT BY BUYER: If Buyer defaults, Seller may retain earnest money as liquidated damages,
   unless Seller elects to pursue specific performance or actual damages.
f) DEFAULT BY SELLER: If Seller defaults, earnest money shall be returned to Buyer,
   and Buyer may pursue specific performance or actual damages.
g) DISPUTE: If the parties cannot agree on disposition of earnest money, it shall be held
   by the escrow agent until resolution by mutual agreement, mediation, or court order.

═══════════════════════════════════════════════════════════════
5. FINANCING CONTINGENCY
═══════════════════════════════════════════════════════════════
This Agreement [ ] IS [ ] IS NOT contingent upon Buyer obtaining financing.

If contingent, Buyer shall obtain financing as follows:
[ ] Cash — no financing contingency
[ ] Conventional loan
[ ] FHA loan
[ ] VA loan
[ ] Other: _______________________________________________

Loan Amount: $_______________ not to exceed _______ % of purchase price
Interest Rate: not to exceed _______ % ( [ ] Fixed [ ] Adjustable )
Loan Term: _______ years

Buyer shall:
a) Submit a complete loan application within _______ days of mutual acceptance.
b) Provide Seller with written evidence of loan pre-approval within _______ days.
c) Obtain a firm financing commitment within _______ days of mutual acceptance.

If Buyer is unable to obtain financing commitment by the deadline, Buyer may terminate this
Agreement by written notice, and earnest money shall be refunded in full.

═══════════════════════════════════════════════════════════════
6. INSPECTION CONTINGENCY
═══════════════════════════════════════════════════════════════
This Agreement [ ] IS [ ] IS NOT contingent upon satisfactory property inspections.

If contingent:
a) Buyer shall have _______ days from mutual acceptance to complete inspections at Buyer's expense.
b) Inspections may include, but are not limited to:
   [ ] General home inspection    [ ] Radon testing
   [ ] Pest/termite inspection    [ ] Well/water quality testing
   [ ] Septic inspection          [ ] Environmental assessment
   [ ] Roof inspection            [ ] Pool/spa inspection
   [ ] Structural engineering     [ ] Other: _______

c) If Buyer discovers material defects, Buyer shall provide Seller written notice within
   _______ days of the inspection, specifying the defects.

d) Upon receipt of Buyer's notice, Seller shall respond within _______ days by:
   [ ] Agreeing to make requested repairs at Seller's expense
   [ ] Offering a credit toward closing costs of: $_______
   [ ] Offering a price reduction of: $_______
   [ ] Declining to make repairs or offer credit

e) If parties cannot reach agreement on inspection issues within _______ days of Buyer's
   notice, either party may terminate this Agreement, and earnest money shall be refunded to Buyer.

═══════════════════════════════════════════════════════════════
7. APPRAISAL CONTINGENCY
═══════════════════════════════════════════════════════════════
This Agreement [ ] IS [ ] IS NOT contingent upon the Property appraising at or above the purchase price.

If contingent:
a) If the Property appraises below the purchase price, the parties agree to:
   [ ] Renegotiate the purchase price
   [ ] Buyer to pay the difference between appraised value and purchase price
   [ ] Seller to reduce price to appraised value
   [ ] Either party may terminate, with earnest money refunded to Buyer
   [ ] Other: _______________________________________________
b) Appraisal must be completed by: _______________

═══════════════════════════════════════════════════════════════
8. TITLE AND SURVEY
═══════════════════════════════════════════════════════════════
a) Seller shall convey marketable title by general warranty deed (or grant deed where applicable),
   free and clear of all liens, encumbrances, easements, and restrictions, except:
   _______________________________________________
b) Title insurance: Seller shall provide a standard owner's title insurance policy at Seller's expense.
   Buyer may obtain extended/lender's coverage at Buyer's expense.
c) Title company: _______________________________________________
d) Title commitment shall be delivered to Buyer within _______ days of mutual acceptance.
e) Buyer shall have _______ days after receipt of title commitment to notify Seller of objections.
f) Survey: [ ] Buyer shall obtain [ ] Seller shall provide at _______ expense, delivered by _______.
g) Permitted exceptions: _______________________________________________

═══════════════════════════════════════════════════════════════
9. CLOSING
═══════════════════════════════════════════════════════════════
a) Closing date: on or before _______________
b) Closing shall take place at: _______________________________________________
c) Closing costs shall be allocated as follows:
   - Seller pays: recording fees for deed, Seller's title insurance, Seller's attorney fees,
     real estate transfer tax (Seller's share per ${state} law), HOA transfer/estoppel fees
   - Buyer pays: loan origination and lender fees, Buyer's title insurance (lender's policy),
     Buyer's attorney fees, recording fees for mortgage/deed of trust
   - Split equally: escrow/closing agent fees (unless otherwise agreed)

d) PRORATIONS — The following shall be prorated as of the closing date:
   - Real property taxes and assessments
   - HOA dues
   - Utilities (if applicable)
   - Rent (if applicable)
   - Prepaid insurance (if assumed)

═══════════════════════════════════════════════════════════════
10. POSSESSION
═══════════════════════════════════════════════════════════════
a) Possession shall be delivered to Buyer:
   [ ] At closing (upon recording of deed)
   [ ] On: _______________
   [ ] Other: _______________________________________________
b) If Seller fails to deliver possession on time, Seller shall pay Buyer $_______ per day
   as holdover rent until possession is delivered.
c) Prior to possession, Seller shall maintain the Property in its present condition,
   ordinary wear and tear excepted.
d) Seller shall remove all personal property and debris not included in the sale.

═══════════════════════════════════════════════════════════════
11. PERSONAL PROPERTY INCLUDED/EXCLUDED
═══════════════════════════════════════════════════════════════
a) INCLUDED in sale (permanently attached fixtures and the following):
   [ ] Refrigerator      [ ] Washer/Dryer        [ ] Window treatments
   [ ] Dishwasher        [ ] Garage door opener   [ ] Light fixtures
   [ ] Oven/Range        [ ] Built-in shelving    [ ] Ceiling fans
   [ ] Microwave         [ ] Security system      [ ] Outdoor structures
   [ ] Other: _______________________________________________

b) EXCLUDED from sale:
   _______________________________________________

c) Leased items (not owned by Seller — Buyer to assume or return):
   _______________________________________________

═══════════════════════════════════════════════════════════════
12. PROPERTY CONDITION AND WARRANTIES
═══════════════════════════════════════════════════════════════
a) Seller warrants that, to the best of Seller's knowledge, all information in the
   Seller's Disclosure Statement is true and complete.
b) [ ] Property is sold "AS IS" — Buyer accepts property in its current condition.
   [ ] Property is NOT sold "as is" — Seller warrants systems and appliances to be
       in working order at closing.
c) RISK OF LOSS: If the Property is damaged or destroyed prior to closing by fire,
   casualty, or other cause, Buyer may:
   [ ] Terminate this Agreement and receive a full refund of earnest money, OR
   [ ] Proceed with closing and receive insurance proceeds and/or a price adjustment.
d) Seller shall maintain existing insurance coverage through the closing date.

═══════════════════════════════════════════════════════════════
13. DEFAULT AND REMEDIES
═══════════════════════════════════════════════════════════════
a) BUYER DEFAULT: If Buyer fails to perform under this Agreement, Seller may:
   (i)  Retain the earnest money as liquidated damages and terminate, OR
   (ii) Pursue specific performance or actual damages.
b) SELLER DEFAULT: If Seller fails to perform under this Agreement, Buyer may:
   (i)   Receive a full refund of earnest money, OR
   (ii)  Pursue specific performance, OR
   (iii) Pursue actual damages.
c) ATTORNEY FEES: In any action arising from this Agreement, the prevailing party
   shall be entitled to recover reasonable attorney fees and court costs.

═══════════════════════════════════════════════════════════════
14. ADDITIONAL TERMS AND CONDITIONS (${state})
═══════════════════════════════════════════════════════════════
Additional contingencies: _______________________________________________
Special stipulations: _______________________________________________
_______________________________________________
_______________________________________________

═══════════════════════════════════════════════════════════════
15. MISCELLANEOUS
═══════════════════════════════════════════════════════════════
a) ENTIRE AGREEMENT: This Agreement constitutes the entire agreement between the parties
   and supersedes all prior negotiations, representations, and agreements.
b) AMENDMENTS: This Agreement may only be amended by written instrument signed by both parties.
c) TIME IS OF THE ESSENCE for all dates and deadlines specified in this Agreement.
d) GOVERNING LAW: This Agreement shall be governed by the laws of the State of ${state}.
e) NOTICES: All notices shall be in writing and delivered personally, by certified mail,
   or by email to the addresses listed in Section 1.
f) BINDING EFFECT: This Agreement shall be binding upon and inure to the benefit of
   the parties, their heirs, successors, and assigns.
g) SEVERABILITY: If any provision is held invalid, all remaining provisions shall remain in effect.
h) COUNTERPARTS: This Agreement may be executed in counterparts, each of which shall
   constitute an original.

═══════════════════════════════════════════════════════════════
16. SIGNATURES
═══════════════════════════════════════════════════════════════
By signing below, the parties agree to be bound by all terms and conditions of this Agreement.

SELLER:
Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________

Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________

BUYER:
Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________

Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________

WITNESS/AGENT (if applicable):
Signature: _________________________ Date: ____________
Printed Name: _________________________ License #: _____________`;

  // HTML VERSION
  const html = `<div ${htmlDocStyle}>
<h1 ${htmlH1Style}>${title}</h1>
<p style="text-align: center; font-size: 11pt; margin-bottom: 20px;">Date: ${today}</p>
<p ${htmlPStyle}>THIS REAL ESTATE PURCHASE AGREEMENT ("Agreement") is entered into as of the date of final acceptance by both parties, by and between:</p>

<h2 ${htmlH2Style}>1. Parties</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 11pt;">
<tr><td style="padding: 6px; width: 100px; font-weight: bold; vertical-align: top;">SELLER:</td><td style="padding: 6px;">
  Name(s): <span ${htmlBlank}>&nbsp;</span><br/>
  Address: <span ${htmlBlank}>&nbsp;</span><br/>
  Phone: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Email: <span ${htmlBlank}>&nbsp;</span>
</td></tr>
<tr><td style="padding: 6px; font-weight: bold; vertical-align: top;">BUYER:</td><td style="padding: 6px;">
  Name(s): <span ${htmlBlank}>&nbsp;</span><br/>
  Address: <span ${htmlBlank}>&nbsp;</span><br/>
  Phone: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; Email: <span ${htmlBlank}>&nbsp;</span>
</td></tr>
</table>

<h2 ${htmlH2Style}>2. Property Description</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 11pt; border: 1px solid #ccc;">
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; width: 200px; font-weight: bold; border: 1px solid #ccc;">Street Address</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${fullAddress}</td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Property Type</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${propertyTypeLabel}</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Bedrooms / Baths</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.bedrooms} / ${property.bathrooms}</td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Square Footage</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.sqft.toLocaleString()}</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Year Built</td><td style="padding: 6px 10px; border: 1px solid #ccc;">${property.year_built}</td></tr>
<tr><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Legal Description</td><td style="padding: 6px 10px; border: 1px solid #ccc;"><span ${htmlBlank}>&nbsp;</span></td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 6px 10px; font-weight: bold; border: 1px solid #ccc;">Tax Parcel / Assessor #</td><td style="padding: 6px 10px; border: 1px solid #ccc;"><span ${htmlBlank}>&nbsp;</span></td></tr>
</table>
<p ${htmlPStyle}><em>Together with all improvements, fixtures, and appurtenances thereto, and all rights, privileges, and easements appurtenant thereto (collectively, the "Property").</em></p>

<h2 ${htmlH2Style}>3. Purchase Price and Payment</h2>
<p ${htmlPStyle}><strong>a) Total Purchase Price:</strong> <strong>${priceStr}</strong></p>
<p ${htmlPStyle}>(<span ${htmlBlank}>&nbsp;</span> Dollars)</p>
<p ${htmlPStyle}><strong>b) Payment breakdown:</strong></p>
<table style="width: 60%; margin-left: 20px; font-size: 11pt;">
<tr><td style="padding: 3px;">Earnest Money Deposit:</td><td style="padding: 3px;">$<span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 3px;">Additional Deposit:</td><td style="padding: 3px;">$<span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 3px;">Loan Amount:</td><td style="padding: 3px;">$<span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr style="border-top: 1px solid #000;"><td style="padding: 3px;"><strong>Balance Due at Closing:</strong></td><td style="padding: 3px;">$<span ${htmlShortBlank}>&nbsp;</span></td></tr>
</table>
<p ${htmlPStyle}><strong>c) Form of payment at closing:</strong> \u2610 Certified check &nbsp; \u2610 Wire transfer &nbsp; \u2610 Other: <span ${htmlShortBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>4. Earnest Money Deposit</h2>
<p ${htmlPStyle}>a) Amount: $<span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>b) Escrow Agent: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>c) Deposit due within <span ${htmlShortBlank}>&nbsp;</span> business days of mutual acceptance.</p>
<p ${htmlPStyle}>d) Earnest money shall be applied toward the purchase price at closing.</p>
<p ${htmlPStyle}>e) <strong>Default by Buyer:</strong> Seller may retain earnest money as liquidated damages, or pursue specific performance/actual damages.</p>
<p ${htmlPStyle}>f) <strong>Default by Seller:</strong> Earnest money returned to Buyer; Buyer may pursue specific performance/actual damages.</p>
<p ${htmlPStyle}>g) <strong>Dispute:</strong> Earnest money held by escrow agent until resolution by mutual agreement, mediation, or court order.</p>

<h2 ${htmlH2Style}>5. Financing Contingency</h2>
<p ${htmlPStyle}>This Agreement \u2610 IS &nbsp; \u2610 IS NOT contingent upon Buyer obtaining financing.</p>
<p ${htmlPStyle}>\u2610 Cash (no financing) &nbsp; \u2610 Conventional &nbsp; \u2610 FHA &nbsp; \u2610 VA &nbsp; \u2610 Other: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Loan Amount: $<span ${htmlShortBlank}>&nbsp;</span> &nbsp; Rate not to exceed: <span ${htmlShortBlank}>&nbsp;</span>% &nbsp; \u2610 Fixed \u2610 Adjustable &nbsp; Term: <span ${htmlShortBlank}>&nbsp;</span> years</p>
<p ${htmlPStyle}>a) Loan application deadline: <span ${htmlShortBlank}>&nbsp;</span> days from acceptance</p>
<p ${htmlPStyle}>b) Pre-approval evidence: <span ${htmlShortBlank}>&nbsp;</span> days from acceptance</p>
<p ${htmlPStyle}>c) Firm commitment deadline: <span ${htmlShortBlank}>&nbsp;</span> days from acceptance</p>
<p ${htmlPStyle}><em>If Buyer cannot obtain financing by deadline, Buyer may terminate with full earnest money refund.</em></p>

<h2 ${htmlH2Style}>6. Inspection Contingency</h2>
<p ${htmlPStyle}>This Agreement \u2610 IS &nbsp; \u2610 IS NOT contingent upon satisfactory inspections.</p>
<p ${htmlPStyle}>a) Inspection period: <span ${htmlShortBlank}>&nbsp;</span> days from acceptance.</p>
<p ${htmlPStyle}>b) Inspections may include:</p>
<p ${htmlCheckRow}>\u2610 General home inspection &nbsp; \u2610 Radon testing &nbsp; \u2610 Pest/termite</p>
<p ${htmlCheckRow}>\u2610 Well/water quality &nbsp; \u2610 Septic &nbsp; \u2610 Environmental</p>
<p ${htmlCheckRow}>\u2610 Roof &nbsp; \u2610 Pool/spa &nbsp; \u2610 Structural engineering &nbsp; \u2610 Other: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>c) Buyer's notice of defects: within <span ${htmlShortBlank}>&nbsp;</span> days of inspection.</p>
<p ${htmlPStyle}>d) Seller's response: within <span ${htmlShortBlank}>&nbsp;</span> days. Options: \u2610 Repair &nbsp; \u2610 Credit: $<span ${htmlShortBlank}>&nbsp;</span> &nbsp; \u2610 Price reduction &nbsp; \u2610 Decline</p>
<p ${htmlPStyle}>e) If no agreement within <span ${htmlShortBlank}>&nbsp;</span> days, either party may terminate with earnest money refunded.</p>

<h2 ${htmlH2Style}>7. Appraisal Contingency</h2>
<p ${htmlPStyle}>This Agreement \u2610 IS &nbsp; \u2610 IS NOT contingent upon appraisal at or above purchase price.</p>
<p ${htmlPStyle}>If appraisal is below purchase price:</p>
<p ${htmlCheckRow}>\u2610 Renegotiate price &nbsp; \u2610 Buyer pays difference &nbsp; \u2610 Seller reduces to appraised value</p>
<p ${htmlCheckRow}>\u2610 Either party may terminate &nbsp; \u2610 Other: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Appraisal deadline: <span ${htmlShortBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>8. Title and Survey</h2>
<p ${htmlPStyle}>a) Seller shall convey marketable title by general warranty deed, free of liens and encumbrances except: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>b) Owner's title insurance at Seller's expense; lender's/extended at Buyer's expense.</p>
<p ${htmlPStyle}>c) Title company: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>d) Title commitment delivered within <span ${htmlShortBlank}>&nbsp;</span> days.</p>
<p ${htmlPStyle}>e) Buyer's objection period: <span ${htmlShortBlank}>&nbsp;</span> days after receipt.</p>
<p ${htmlPStyle}>f) Survey: \u2610 Buyer obtains &nbsp; \u2610 Seller provides &nbsp; at <span ${htmlShortBlank}>&nbsp;</span> expense, by <span ${htmlShortBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>9. Closing</h2>
<p ${htmlPStyle}>a) Closing date: on or before <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>b) Location: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>c) <strong>Closing costs:</strong></p>
<p ${htmlCheckRow}><strong>Seller pays:</strong> deed recording, Seller's title insurance, Seller's attorney, transfer tax (Seller's share per ${state} law), HOA transfer fees</p>
<p ${htmlCheckRow}><strong>Buyer pays:</strong> loan fees, lender's title insurance, Buyer's attorney, mortgage recording</p>
<p ${htmlCheckRow}><strong>Split equally:</strong> escrow/closing agent fees (unless otherwise agreed)</p>
<p ${htmlPStyle}>d) <strong>Prorations</strong> as of closing date: property taxes, HOA dues, utilities, rent, prepaid insurance.</p>

<h2 ${htmlH2Style}>10. Possession</h2>
<p ${htmlPStyle}>a) Possession: \u2610 At closing (upon recording) &nbsp; \u2610 On: <span ${htmlShortBlank}>&nbsp;</span> &nbsp; \u2610 Other: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>b) Holdover: $<span ${htmlShortBlank}>&nbsp;</span>/day if Seller fails to deliver on time.</p>
<p ${htmlPStyle}>c) Seller shall maintain Property in present condition through closing, ordinary wear excepted.</p>
<p ${htmlPStyle}>d) Seller shall remove all non-included personal property and debris.</p>

<h2 ${htmlH2Style}>11. Personal Property Included/Excluded</h2>
<p ${htmlPStyle}><strong>Included:</strong> All permanently attached fixtures, plus:</p>
<p ${htmlCheckRow}>\u2610 Refrigerator &nbsp; \u2610 Washer/Dryer &nbsp; \u2610 Window treatments &nbsp; \u2610 Dishwasher</p>
<p ${htmlCheckRow}>\u2610 Garage opener &nbsp; \u2610 Light fixtures &nbsp; \u2610 Oven/Range &nbsp; \u2610 Built-in shelving</p>
<p ${htmlCheckRow}>\u2610 Ceiling fans &nbsp; \u2610 Microwave &nbsp; \u2610 Security system &nbsp; \u2610 Outdoor structures</p>
<p ${htmlPStyle}>Other included: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}><strong>Excluded:</strong> <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}><strong>Leased items (not owned):</strong> <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>12. Property Condition and Warranties</h2>
<p ${htmlPStyle}>a) Seller warrants disclosure statement is true and complete to the best of Seller's knowledge.</p>
<p ${htmlPStyle}>b) \u2610 Property sold "AS IS" &nbsp; \u2610 Seller warrants systems/appliances in working order at closing.</p>
<p ${htmlPStyle}>c) <strong>Risk of Loss:</strong> If Property is damaged before closing, Buyer may terminate (full refund) or proceed with insurance proceeds/price adjustment.</p>
<p ${htmlPStyle}>d) Seller shall maintain insurance through closing.</p>

<h2 ${htmlH2Style}>13. Default and Remedies</h2>
<p ${htmlPStyle}><strong>a) Buyer Default:</strong> Seller may retain earnest money as liquidated damages and terminate, OR pursue specific performance/actual damages.</p>
<p ${htmlPStyle}><strong>b) Seller Default:</strong> Buyer receives full earnest money refund, OR may pursue specific performance, OR pursue actual damages.</p>
<p ${htmlPStyle}><strong>c) Attorney Fees:</strong> Prevailing party entitled to reasonable attorney fees and court costs.</p>

<h2 ${htmlH2Style}>14. Additional Terms and Conditions (${state})</h2>
<p ${htmlPStyle}>Additional contingencies: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Special stipulations: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}><span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>15. Miscellaneous</h2>
<p ${htmlPStyle}>a) <strong>Entire Agreement:</strong> This constitutes the entire agreement, superseding all prior negotiations.</p>
<p ${htmlPStyle}>b) <strong>Amendments:</strong> Must be in writing, signed by both parties.</p>
<p ${htmlPStyle}>c) <strong>Time is of the Essence</strong> for all dates and deadlines.</p>
<p ${htmlPStyle}>d) <strong>Governing Law:</strong> State of ${state}.</p>
<p ${htmlPStyle}>e) <strong>Notices:</strong> Written, delivered personally, by certified mail, or email to Section 1 addresses.</p>
<p ${htmlPStyle}>f) <strong>Binding Effect:</strong> Binding on heirs, successors, and assigns.</p>
<p ${htmlPStyle}>g) <strong>Severability:</strong> Invalid provisions do not affect remaining provisions.</p>
<p ${htmlPStyle}>h) <strong>Counterparts:</strong> May be executed in counterparts, each an original.</p>

<h2 ${htmlH2Style}>16. Signatures</h2>
<p ${htmlPStyle}>By signing below, the parties agree to all terms and conditions of this Agreement.</p>
<br/>
<table style="width: 100%; font-size: 11pt;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold;">SELLER:</td></tr>
<tr><td style="width: 55%; padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td colspan="2" style="padding: 20px 6px 6px; font-weight: bold;">BUYER:</td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td colspan="2" style="padding: 20px 6px 6px; font-weight: bold;">WITNESS/AGENT (if applicable):</td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span> &nbsp; License #: <span ${htmlShortBlank}>&nbsp;</span></td><td></td></tr>
</table>

<p ${htmlLegal}>This document is provided as a template and does not constitute legal advice. Parties are advised to consult with a licensed real estate attorney in ${state}. Form generated on ${today}.</p>
</div>`;

  return { title, content, html, source: "fallback" };
}

function generateCounterOffer(
  state: string,
  property: GenerateRequest["property"],
  fullAddress: string,
  _propertyTypeLabel: string,
  priceStr: string,
  today: string,
): { title: string; content: string; html: string; source: "fallback" } {
  const title = `Counter-Offer to Purchase Agreement - ${state}`;

  const content = `${title}
Date: ${today}

═══════════════════════════════════════════════════════════════
1. COUNTER-OFFER IDENTIFICATION
═══════════════════════════════════════════════════════════════
Counter-Offer Number: _______
Date of this Counter-Offer: ${today}
Property Address: ${fullAddress}

═══════════════════════════════════════════════════════════════
2. REFERENCE TO ORIGINAL OFFER
═══════════════════════════════════════════════════════════════
This Counter-Offer is made in response to the Purchase Agreement ("Original Offer"):
Original Offer dated: _______________
Submitted by Buyer(s): _______________________________________________
Buyer's Agent (if any): _______________________________________________
Original Offer Price: $_______________

═══════════════════════════════════════════════════════════════
3. COUNTER-OFFER TERMS — PURCHASE PRICE
═══════════════════════════════════════════════════════════════
The Seller hereby counters with a purchase price of: ${priceStr}
(______________________________________________ Dollars)

This represents a [ ] increase [ ] decrease of $_____________ from the Original Offer Price.

═══════════════════════════════════════════════════════════════
4. MODIFIED EARNEST MONEY
═══════════════════════════════════════════════════════════════
[ ] No change to earnest money terms
[ ] Earnest money deposit shall be increased to: $_______________
[ ] Earnest money deposit deadline modified to: _______ business days from acceptance
[ ] Earnest money to be held by: _______________________________________________

═══════════════════════════════════════════════════════════════
5. MODIFIED FINANCING TERMS
═══════════════════════════════════════════════════════════════
[ ] No change to financing terms
[ ] Buyer must provide proof of funds/pre-approval within _______ days
[ ] Financing commitment deadline changed to: _______________
[ ] Seller requires Buyer to be pre-approved for [ ] Conventional [ ] FHA [ ] VA [ ] Cash only
[ ] Other financing modifications: _______________________________________________

═══════════════════════════════════════════════════════════════
6. MODIFIED CONTINGENCIES
═══════════════════════════════════════════════════════════════
[ ] No change to contingency terms

Inspection Contingency:
[ ] No change
[ ] Modified inspection period: _______ days from acceptance
[ ] Buyer to complete all inspections within _______ days
[ ] As-is sale — inspection for informational purposes only

Appraisal Contingency:
[ ] No change
[ ] Appraisal contingency retained
[ ] Appraisal contingency waived by Buyer
[ ] If appraisal is below purchase price: _______________________________________________

Other Contingencies:
[ ] Sale of Buyer's property contingency: [ ] Added [ ] Removed [ ] Modified
[ ] Other: _______________________________________________

═══════════════════════════════════════════════════════════════
7. MODIFIED CLOSING DATE
═══════════════════════════════════════════════════════════════
[ ] No change to closing date
[ ] Closing shall take place on or before: _______________
[ ] Closing to occur within _______ days of mutual acceptance

═══════════════════════════════════════════════════════════════
8. MODIFIED POSSESSION DATE
═══════════════════════════════════════════════════════════════
[ ] No change to possession terms
[ ] Possession at closing
[ ] Seller to retain possession until: _______________ (post-closing occupancy)
   Seller shall pay $_______ per day during holdover period
   Seller shall maintain insurance and utilities during occupancy
[ ] Other possession terms: _______________________________________________

═══════════════════════════════════════════════════════════════
9. PERSONAL PROPERTY MODIFICATIONS
═══════════════════════════════════════════════════════════════
[ ] No change to included/excluded items
[ ] The following items are NOW INCLUDED in the sale:
    _______________________________________________
[ ] The following items are NOW EXCLUDED from the sale:
    _______________________________________________

═══════════════════════════════════════════════════════════════
10. ADDITIONAL MODIFIED TERMS
═══════════════════════════════════════════════════════════════
Closing Cost Allocation:
[ ] No change
[ ] Seller shall contribute $_______ toward Buyer's closing costs
[ ] Seller shall pay no closing cost contributions
[ ] Other: _______________________________________________

Repair/Credit Modifications:
[ ] No change
[ ] Seller to provide repair credit of: $_______
[ ] Seller to complete the following repairs prior to closing:
    _______________________________________________
[ ] Property sold strictly AS-IS

Home Warranty:
[ ] No change
[ ] Seller shall provide a home warranty up to: $_______
[ ] Buyer to obtain home warranty at Buyer's expense

Other Terms:
_______________________________________________
_______________________________________________

═══════════════════════════════════════════════════════════════
11. TERMS THAT REMAIN UNCHANGED
═══════════════════════════════════════════════════════════════
All other terms and conditions of the Original Offer dated _______________ shall remain
in full force and effect, except as specifically modified by this Counter-Offer. In the
event of any conflict between the Original Offer and this Counter-Offer, the terms of
this Counter-Offer shall prevail.

═══════════════════════════════════════════════════════════════
12. EXPIRATION OF COUNTER-OFFER
═══════════════════════════════════════════════════════════════
This Counter-Offer shall expire at _______ [ ] AM [ ] PM on _______________
(date and time, local time for the property location).

If this Counter-Offer is not accepted in writing by the above deadline:
[ ] The Original Offer is deemed REJECTED
[ ] The Original Offer remains open for acceptance by Seller

IMPORTANT: Delivery of acceptance must be received by the offering party (not merely sent)
before the expiration time for acceptance to be effective.

═══════════════════════════════════════════════════════════════
13. ACCEPTANCE / REJECTION / COUNTER
═══════════════════════════════════════════════════════════════
[ ] Buyer ACCEPTS this Counter-Offer in its entirety
    — This Counter-Offer, together with the Original Offer (as modified), shall constitute
      a binding agreement between the parties.

[ ] Buyer REJECTS this Counter-Offer
    — The Original Offer is hereby withdrawn.

[ ] Buyer submits Counter-Offer #_______ (attached hereto)
    — This Counter-Offer is not accepted, and a new Counter-Offer is submitted.

═══════════════════════════════════════════════════════════════
14. SIGNATURES
═══════════════════════════════════════════════════════════════

SELLER (Counter-Offer made by):
Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________

Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________


BUYER (Acceptance/Rejection/Counter):
Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________

Signature: _________________________ Date: ____________ Time: _______
Printed Name: _________________________`;

  // HTML VERSION
  const html = `<div ${htmlDocStyle}>
<h1 ${htmlH1Style}>${title}</h1>
<p style="text-align: center; font-size: 11pt; margin-bottom: 20px;">Date: ${today}</p>

<h2 ${htmlH2Style}>1. Counter-Offer Identification</h2>
<p ${htmlPStyle}>Counter-Offer Number: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Date: ${today}</p>
<p ${htmlPStyle}>Property: <strong>${fullAddress}</strong></p>

<h2 ${htmlH2Style}>2. Reference to Original Offer</h2>
<p ${htmlPStyle}>This Counter-Offer is made in response to the Purchase Agreement ("Original Offer"):</p>
<p ${htmlPStyle}>Original Offer dated: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Submitted by Buyer(s): <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Buyer's Agent: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>Original Offer Price: $<span ${htmlShortBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>3. Counter-Offer Terms — Purchase Price</h2>
<p ${htmlPStyle}>The Seller hereby counters with a purchase price of: <strong>${priceStr}</strong></p>
<p ${htmlPStyle}>(<span ${htmlBlank}>&nbsp;</span> Dollars)</p>
<p ${htmlPStyle}>This represents \u2610 increase \u2610 decrease of $<span ${htmlShortBlank}>&nbsp;</span> from the Original Offer Price.</p>

<h2 ${htmlH2Style}>4. Modified Earnest Money</h2>
<p ${htmlCheckRow}>\u2610 No change to earnest money terms</p>
<p ${htmlCheckRow}>\u2610 Earnest money increased to: $<span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>\u2610 Deposit deadline modified to: <span ${htmlShortBlank}>&nbsp;</span> business days</p>
<p ${htmlCheckRow}>\u2610 Held by: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>5. Modified Financing Terms</h2>
<p ${htmlCheckRow}>\u2610 No change to financing terms</p>
<p ${htmlCheckRow}>\u2610 Proof of funds/pre-approval within <span ${htmlShortBlank}>&nbsp;</span> days</p>
<p ${htmlCheckRow}>\u2610 Financing commitment deadline: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>\u2610 Required: \u2610 Conventional \u2610 FHA \u2610 VA \u2610 Cash only</p>
<p ${htmlCheckRow}>\u2610 Other: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>6. Modified Contingencies</h2>
<p ${htmlCheckRow}>\u2610 No change to contingency terms</p>

<h3 ${htmlH3Style}>Inspection Contingency</h3>
<p ${htmlCheckRow}>\u2610 No change</p>
<p ${htmlCheckRow}>\u2610 Modified period: <span ${htmlShortBlank}>&nbsp;</span> days</p>
<p ${htmlCheckRow}>\u2610 All inspections within <span ${htmlShortBlank}>&nbsp;</span> days</p>
<p ${htmlCheckRow}>\u2610 As-is sale — inspection informational only</p>

<h3 ${htmlH3Style}>Appraisal Contingency</h3>
<p ${htmlCheckRow}>\u2610 No change &nbsp; \u2610 Retained &nbsp; \u2610 Waived by Buyer</p>
<p ${htmlCheckRow}>\u2610 If below price: <span ${htmlBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Other Contingencies</h3>
<p ${htmlCheckRow}>\u2610 Sale of Buyer's property: \u2610 Added \u2610 Removed \u2610 Modified</p>
<p ${htmlCheckRow}>\u2610 Other: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>7. Modified Closing Date</h2>
<p ${htmlCheckRow}>\u2610 No change to closing date</p>
<p ${htmlCheckRow}>\u2610 Closing on or before: <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>\u2610 Within <span ${htmlShortBlank}>&nbsp;</span> days of acceptance</p>

<h2 ${htmlH2Style}>8. Modified Possession Date</h2>
<p ${htmlCheckRow}>\u2610 No change to possession terms</p>
<p ${htmlCheckRow}>\u2610 Possession at closing</p>
<p ${htmlCheckRow}>\u2610 Seller retains possession until: <span ${htmlShortBlank}>&nbsp;</span> at $<span ${htmlShortBlank}>&nbsp;</span>/day</p>
<p ${htmlCheckRow}>\u2610 Other: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>9. Personal Property Modifications</h2>
<p ${htmlCheckRow}>\u2610 No change to included/excluded items</p>
<p ${htmlCheckRow}>\u2610 Now INCLUDED: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>\u2610 Now EXCLUDED: <span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>10. Additional Modified Terms</h2>
<h3 ${htmlH3Style}>Closing Cost Allocation</h3>
<p ${htmlCheckRow}>\u2610 No change &nbsp; \u2610 Seller contributes $<span ${htmlShortBlank}>&nbsp;</span> &nbsp; \u2610 No Seller contribution</p>
<p ${htmlCheckRow}>\u2610 Other: <span ${htmlBlank}>&nbsp;</span></p>

<h3 ${htmlH3Style}>Repair/Credit Modifications</h3>
<p ${htmlCheckRow}>\u2610 No change &nbsp; \u2610 Repair credit: $<span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>\u2610 Seller to complete repairs: <span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlCheckRow}>\u2610 Property sold strictly AS-IS</p>

<h3 ${htmlH3Style}>Home Warranty</h3>
<p ${htmlCheckRow}>\u2610 No change &nbsp; \u2610 Seller provides up to $<span ${htmlShortBlank}>&nbsp;</span> &nbsp; \u2610 Buyer obtains at own expense</p>

<h3 ${htmlH3Style}>Other Terms</h3>
<p ${htmlPStyle}><span ${htmlBlank}>&nbsp;</span></p>
<p ${htmlPStyle}><span ${htmlBlank}>&nbsp;</span></p>

<h2 ${htmlH2Style}>11. Terms That Remain Unchanged</h2>
<p ${htmlPStyle}>All other terms and conditions of the Original Offer dated <span ${htmlShortBlank}>&nbsp;</span> shall remain in full force and effect, except as specifically modified by this Counter-Offer. In the event of any conflict, the terms of this Counter-Offer shall prevail.</p>

<h2 ${htmlH2Style}>12. Expiration of Counter-Offer</h2>
<p ${htmlPStyle}>This Counter-Offer expires at <span ${htmlShortBlank}>&nbsp;</span> \u2610 AM \u2610 PM on <span ${htmlShortBlank}>&nbsp;</span></p>
<p ${htmlPStyle}>If not accepted by deadline:</p>
<p ${htmlCheckRow}>\u2610 Original Offer is deemed REJECTED</p>
<p ${htmlCheckRow}>\u2610 Original Offer remains open for acceptance</p>
<p style="margin: 10px 0; font-size: 10pt; background: #f0f0f0; padding: 8px; border: 1px solid #ccc;"><strong>IMPORTANT:</strong> Delivery of acceptance must be received (not merely sent) before the expiration time to be effective.</p>

<h2 ${htmlH2Style}>13. Acceptance / Rejection / Counter</h2>
<div style="border: 2px solid #000; padding: 16px; margin: 10px 0;">
<p ${htmlCheckRow}>\u2610 Buyer <strong>ACCEPTS</strong> this Counter-Offer in its entirety</p>
<p style="margin-left: 40px; font-size: 10pt; color: #444;"><em>This Counter-Offer, together with the Original Offer (as modified), constitutes a binding agreement.</em></p>
<br/>
<p ${htmlCheckRow}>\u2610 Buyer <strong>REJECTS</strong> this Counter-Offer</p>
<p style="margin-left: 40px; font-size: 10pt; color: #444;"><em>The Original Offer is hereby withdrawn.</em></p>
<br/>
<p ${htmlCheckRow}>\u2610 Buyer submits <strong>Counter-Offer #<span ${htmlShortBlank}>&nbsp;</span></strong> (attached)</p>
<p style="margin-left: 40px; font-size: 10pt; color: #444;"><em>This Counter-Offer is not accepted; a new Counter-Offer is submitted.</em></p>
</div>

<h2 ${htmlH2Style}>14. Signatures</h2>
<table style="width: 100%; font-size: 11pt;">
<tr><td colspan="2" style="padding: 6px; font-weight: bold;">SELLER (Counter-Offer made by):</td></tr>
<tr><td style="width: 55%; padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td colspan="2" style="padding: 20px 6px 6px; font-weight: bold;">BUYER (Acceptance/Rejection/Counter):</td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
<tr><td style="padding: 8px;">Signature: <span ${htmlSigLine}>&nbsp;</span></td><td style="padding: 8px;">Date: <span ${htmlShortBlank}>&nbsp;</span> Time: <span ${htmlShortBlank}>&nbsp;</span></td></tr>
<tr><td style="padding: 8px;">Printed Name: <span ${htmlBlank}>&nbsp;</span></td><td></td></tr>
</table>

<p ${htmlLegal}>This document is provided as a template and does not constitute legal advice. Parties are advised to consult with a licensed real estate attorney in ${state}. Form generated on ${today}.</p>
</div>`;

  return { title, content, html, source: "fallback" };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    const { document_type, state, property } = body;

    if (!document_type || !state || !property?.address) {
      return json(
        { error: "Document type, state, and property address are required" },
        400
      );
    }

    let result: { title: string; content: string; html: string; source?: string };

    try {
      const prompt = getPrompt(body);

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = message.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("AI response did not contain a text block");
      }

      let parsed: { title: string; content: string; html: string };
      try {
        parsed = JSON.parse(textBlock.text);
      } catch {
        throw new Error("Failed to parse AI JSON response");
      }
      result = {
        title: parsed.title,
        content: parsed.content,
        html: parsed.html,
        source: "ai",
      };
    } catch (aiError) {
      result = generateFallbackDocument(body);
    }

    return json(result);
  } catch {
    return json(
      { error: "An unexpected error occurred. Please try again." },
      500
    );
  }
}


