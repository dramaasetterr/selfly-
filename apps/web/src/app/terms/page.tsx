import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Chiavi",
  description: "Read the terms and conditions for using the Chiavi FSBO real estate platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-cream text-navy">
      {/* Header */}
      <header className="bg-white border-b border-gold-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <a href="/" className="text-sm text-gold font-semibold hover:text-gold-dark transition">
            &larr; Back to Chiavi
          </a>
          <h1 className="mt-6 font-heading text-4xl sm:text-5xl font-bold">Terms of Service</h1>
          <p className="mt-3 text-navy-light">Last updated: March 28, 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose-container space-y-12">
          {/* Acceptance */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              1. Acceptance of Terms
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              By accessing or using the Chiavi platform (&quot;Service&quot;), you agree to be bound by
              these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not
              use the Service. These Terms constitute a legally binding agreement between you and
              Chiavi (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We may update these Terms from time to time, and
              your continued use of the Service after changes are posted constitutes acceptance of
              the revised Terms.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              2. Description of Service
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              Chiavi is an AI-powered For Sale By Owner (FSBO) real estate platform that provides
              tools and resources to help homeowners sell their properties independently. Our
              Service includes, but is not limited to:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>AI-powered pricing analysis and market comparisons</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Listing creation with AI-generated property descriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Document generation (disclosure forms, contracts, counter-offers)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Offer analysis and comparison tools</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Showing management and scheduling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Closing cost calculators and net-sheet estimates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Listing syndication guidance</span>
              </li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              3. User Accounts
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Provide accurate, current, and complete information during registration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Maintain and promptly update your account information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Keep your password confidential and not share your account credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Be responsible for all activity that occurs under your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Notify us immediately of any unauthorized use of your account</span>
              </li>
            </ul>
            <p className="mt-4 text-navy-light leading-relaxed">
              You must be at least 18 years of age to create an account and use the Service.
            </p>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              4. Payment Terms
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              Chiavi offers a free tier and paid plans. For paid plans:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>One-Time Fees:</strong> Paid plans (Seller Pro at $299 and Full Service at $499) are one-time purchases, not subscriptions. There are no recurring charges.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Payment Processing:</strong> All payments are processed securely through Stripe. We do not store your payment card details.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>30-Day Money-Back Guarantee:</strong> If you are not satisfied with a paid plan, you may request a full refund within 30 days of purchase. Refund requests should be sent to support@chiavi.com.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Pricing Changes:</strong> We reserve the right to modify pricing at any time. Price changes will not affect existing purchases.</span>
              </li>
            </ul>
          </section>

          {/* FSBO Disclaimers */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              5. FSBO Disclaimers
            </h2>
            <div className="mt-6 bg-white rounded-xl border-l-4 border-gold p-6">
              <p className="font-semibold text-navy">Important: Please read this section carefully.</p>
            </div>
            <div className="mt-6 space-y-4 text-navy-light leading-relaxed">
              <p>
                <strong className="text-navy">Not Legal Advice:</strong> The information, documents,
                and tools provided by Chiavi are for informational purposes only and do not
                constitute legal advice. AI-generated documents, analyses, and recommendations are
                tools to assist you and should not be relied upon as a substitute for professional
                legal counsel.
              </p>
              <p>
                <strong className="text-navy">Not Licensed Real Estate Agents:</strong> Chiavi and
                its employees, contractors, and AI systems are not licensed real estate agents,
                brokers, or attorneys. We do not represent you in any real estate transaction. All
                decisions regarding the sale of your property are solely your responsibility.
              </p>
              <p>
                <strong className="text-navy">State Compliance:</strong> Real estate laws and
                disclosure requirements vary significantly by state and locality. As the seller, you
                are solely responsible for ensuring compliance with all applicable federal, state,
                and local laws, regulations, and disclosure requirements related to the sale of your
                property. Chiavi makes reasonable efforts to provide state-specific document
                templates, but we do not guarantee their completeness or accuracy for your
                specific situation.
              </p>
              <p>
                <strong className="text-navy">Attorney Review Recommended:</strong> We strongly
                recommend that you consult with a licensed real estate attorney in your state before
                signing any legally binding documents, including purchase agreements, disclosure
                forms, and closing documents. Some states require attorney involvement in real
                estate transactions.
              </p>
              <p>
                <strong className="text-navy">AI Limitations:</strong> AI-generated pricing
                analyses, property descriptions, and document drafts may contain errors or
                inaccuracies. You should independently verify all AI-generated content before
                relying on it. Chiavi is not responsible for any losses or damages resulting from
                reliance on AI-generated content.
              </p>
              <p>
                <strong className="text-navy">No Guarantee of Sale:</strong> Chiavi does not
                guarantee that your property will sell, that it will sell at any particular price,
                or that any particular outcome will result from using the Service.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              6. Intellectual Property
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              The Service, including its design, features, code, AI models, and content (excluding
              user-generated content), is the intellectual property of Chiavi and is protected by
              copyright, trademark, and other intellectual property laws. You may not copy,
              reproduce, distribute, modify, or create derivative works of any part of the Service
              without our prior written consent.
            </p>
            <p className="mt-4 text-navy-light leading-relaxed">
              You retain ownership of all content you upload to the Service (photos, property
              descriptions you write, etc.). By uploading content, you grant Chiavi a non-exclusive,
              worldwide, royalty-free license to use, display, and distribute that content solely
              in connection with providing the Service.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              7. Limitation of Liability
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CHIAVI AND ITS OFFICERS,
              DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF
              PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF
              THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR
              ANY OTHER LEGAL THEORY.
            </p>
            <p className="mt-4 text-navy-light leading-relaxed">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID TO CHIAVI
              FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED
              DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p className="mt-4 text-navy-light leading-relaxed">
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES
              OR LIABILITY. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE GREATEST
              EXTENT PERMITTED BY LAW.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              8. Indemnification
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              You agree to indemnify, defend, and hold harmless Chiavi and its officers, directors,
              employees, contractors, and agents from and against any and all claims, damages,
              losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees)
              arising out of or related to:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Your use of the Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Your violation of these Terms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Your violation of any applicable law or regulation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Any real estate transaction conducted using the Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>Any content you upload, submit, or transmit through the Service</span>
              </li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              9. Termination
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We may suspend or terminate your account and access to the Service at any time, with
              or without cause, and with or without notice. Reasons for termination may include,
              but are not limited to, violation of these Terms, fraudulent activity, or conduct that
              we determine to be harmful to other users or the Service.
            </p>
            <p className="mt-4 text-navy-light leading-relaxed">
              You may terminate your account at any time by contacting us at{" "}
              <a href="mailto:support@chiavi.com" className="text-gold font-semibold hover:text-gold-dark transition">
                support@chiavi.com
              </a>
              . Upon termination, your right to use the Service will cease immediately. Sections
              of these Terms that by their nature should survive termination (including Limitation
              of Liability, Indemnification, and Governing Law) will continue to apply.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              10. Governing Law and Dispute Resolution
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, without regard to its conflict of law provisions. Any disputes
              arising out of or relating to these Terms or the Service shall be resolved exclusively
              in the state or federal courts located in the State of Delaware, and you consent to
              the personal jurisdiction of such courts.
            </p>
            <p className="mt-4 text-navy-light leading-relaxed">
              Before filing any claim, you agree to first attempt to resolve the dispute informally
              by contacting us at{" "}
              <a href="mailto:support@chiavi.com" className="text-gold font-semibold hover:text-gold-dark transition">
                support@chiavi.com
              </a>
              . We will attempt to resolve the dispute within 30 days.
            </p>
          </section>

          {/* Disclaimer of Warranties */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              11. Disclaimer of Warranties
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES
              OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED.
            </p>
          </section>

          {/* Miscellaneous */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              12. Miscellaneous
            </h2>
            <ul className="mt-6 space-y-4 text-navy-light leading-relaxed">
              <li>
                <strong className="text-navy">Entire Agreement:</strong> These Terms, together with
                our Privacy Policy, constitute the entire agreement between you and Chiavi
                regarding the Service.
              </li>
              <li>
                <strong className="text-navy">Severability:</strong> If any provision of these
                Terms is found to be unenforceable, the remaining provisions will continue in full
                force and effect.
              </li>
              <li>
                <strong className="text-navy">Waiver:</strong> Our failure to enforce any right or
                provision of these Terms will not constitute a waiver of such right or provision.
              </li>
              <li>
                <strong className="text-navy">Assignment:</strong> You may not assign or transfer
                these Terms without our prior written consent. We may assign these Terms without
                restriction.
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              13. Contact Us
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-4 bg-white rounded-xl border border-gold-muted/30 p-6">
              <p className="font-semibold text-navy">Chiavi</p>
              <p className="mt-2 text-navy-light">
                Email:{" "}
                <a href="mailto:support@chiavi.com" className="text-gold font-semibold hover:text-gold-dark transition">
                  support@chiavi.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gold-muted/30 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-navy-light/60">
          <p>&copy; 2026 Chiavi. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-gold transition">Privacy Policy</a>
            <a href="/" className="hover:text-gold transition">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
