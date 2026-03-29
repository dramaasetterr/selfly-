import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Chiavi",
  description: "Learn how Chiavi collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-cream text-navy">
      {/* Header */}
      <header className="bg-white border-b border-gold-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <a href="/" className="text-sm text-gold font-semibold hover:text-gold-dark transition">
            &larr; Back to Chiavi
          </a>
          <h1 className="mt-6 font-heading text-4xl sm:text-5xl font-bold">Privacy Policy</h1>
          <p className="mt-3 text-navy-light">Last updated: March 28, 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose-container space-y-12">
          {/* Introduction */}
          <section>
            <p className="text-navy-light leading-relaxed">
              Chiavi (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Chiavi platform, an AI-powered
              For Sale By Owner (FSBO) real estate application. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use our website, web
              application, and related services (collectively, the &quot;Service&quot;). Please read this
              Privacy Policy carefully. By using the Service, you consent to the practices described
              herein.
            </p>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              1. Information We Collect
            </h2>
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-heading text-lg font-semibold text-navy">Personal Information You Provide</h3>
                <p className="mt-2 text-navy-light leading-relaxed">
                  When you create an account or use our Service, we may collect the following:
                </p>
                <ul className="mt-3 space-y-2 text-navy-light">
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Full name and email address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Phone number (if provided)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Property address and details (square footage, bedrooms, condition, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Photos and descriptions of your property</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Payment and billing information (processed securely via Stripe)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Offer details, messages, and communications through the platform</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-heading text-lg font-semibold text-navy">Information Collected Automatically</h3>
                <p className="mt-2 text-navy-light leading-relaxed">
                  When you access the Service, we may automatically collect:
                </p>
                <ul className="mt-3 space-y-2 text-navy-light">
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>IP address, browser type, and operating system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Pages visited, time spent on pages, and navigation patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Device identifiers and general location data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span>Referring website or link that brought you to our Service</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Use of Data */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              2. How We Use Your Information
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We use the information we collect for the following purposes:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To provide, operate, and maintain the Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To process transactions and manage your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To generate AI-powered pricing analyses, listing descriptions, and document drafts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To facilitate communication between buyers and sellers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To send transactional emails, notifications, and service updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To improve our Service, develop new features, and conduct analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To detect, prevent, and address fraud or technical issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span>To comply with legal obligations</span>
              </li>
            </ul>
          </section>

          {/* AI Disclosure */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              3. Artificial Intelligence Usage Disclosure
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              Chiavi uses artificial intelligence (AI) and machine learning technologies to power
              several core features of the Service, including but not limited to:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Pricing Analysis:</strong> AI models analyze comparable sales data, market trends, and property characteristics to suggest listing prices.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Listing Description Generation:</strong> AI generates property descriptions based on the details you provide.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Document Drafting:</strong> AI assists in generating disclosure forms, contracts, and other real estate documents.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Offer Analysis:</strong> AI scores and compares offers based on price, terms, and contingencies.</span>
              </li>
            </ul>
            <p className="mt-4 text-navy-light leading-relaxed">
              Property data you input may be processed by our AI provider (Anthropic) to generate
              these outputs. We do not sell your personal data to AI providers, and data sent to AI
              services is used solely for the purpose of providing the requested feature. AI-generated
              content is provided as a tool and should not be considered a substitute for professional
              legal, financial, or real estate advice.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              4. Third-Party Services
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We use the following third-party service providers to operate the Service:
            </p>
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-xl border border-gold-muted/30 p-5">
                <h3 className="font-semibold text-navy">Supabase</h3>
                <p className="mt-1 text-sm text-navy-light">Authentication, database hosting, and file storage. Your account data and property information are stored on Supabase infrastructure.</p>
              </div>
              <div className="bg-white rounded-xl border border-gold-muted/30 p-5">
                <h3 className="font-semibold text-navy">Stripe</h3>
                <p className="mt-1 text-sm text-navy-light">Payment processing. We do not store your credit card information directly; all payment data is handled securely by Stripe in accordance with PCI-DSS standards.</p>
              </div>
              <div className="bg-white rounded-xl border border-gold-muted/30 p-5">
                <h3 className="font-semibold text-navy">Resend</h3>
                <p className="mt-1 text-sm text-navy-light">Transactional email delivery. Your email address is shared with Resend solely for the purpose of sending account-related notifications and communications.</p>
              </div>
              <div className="bg-white rounded-xl border border-gold-muted/30 p-5">
                <h3 className="font-semibold text-navy">Anthropic</h3>
                <p className="mt-1 text-sm text-navy-light">AI and language model provider. Property data and user inputs are sent to Anthropic&apos;s API to generate pricing analyses, listing descriptions, documents, and offer evaluations. Anthropic does not use this data to train their models.</p>
              </div>
            </div>
            <p className="mt-4 text-navy-light leading-relaxed text-sm">
              Each third-party provider maintains its own privacy policy governing the information
              we share with them. We encourage you to review their respective policies.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              5. Cookies and Tracking Technologies
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your
              preferences, and analyze usage patterns. Specifically:
            </p>
            <ul className="mt-4 space-y-2 text-navy-light">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Essential Cookies:</strong> Required for authentication and core functionality. These cannot be disabled.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">&#8226;</span>
                <span><strong>Analytics Cookies:</strong> Help us understand how users interact with the Service so we can improve it.</span>
              </li>
            </ul>
            <p className="mt-4 text-navy-light leading-relaxed">
              You can control cookie preferences through your browser settings. Disabling essential
              cookies may prevent you from using certain features of the Service.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              6. Data Retention
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We retain your personal information for as long as your account is active or as
              needed to provide the Service. If you delete your account, we will delete or anonymize
              your personal information within 30 days, except where we are required to retain it
              for legal or regulatory purposes (e.g., transaction records, tax compliance). Anonymized
              or aggregated data that cannot identify you may be retained indefinitely for analytics
              and product improvement.
            </p>
          </section>

          {/* CCPA / GDPR */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              7. Your Privacy Rights (CCPA / GDPR)
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              Depending on your location, you may have the following rights regarding your personal
              information:
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-heading text-lg font-semibold text-navy">California Residents (CCPA)</h3>
                <ul className="mt-2 space-y-2 text-navy-light">
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Know:</strong> Request details about the categories and specific pieces of personal information we collect.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Delete:</strong> Request deletion of your personal information.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Opt-Out:</strong> We do not sell personal information. If this changes, we will provide an opt-out mechanism.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-navy">European Residents (GDPR)</h3>
                <ul className="mt-2 space-y-2 text-navy-light">
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right of Access:</strong> Obtain a copy of the personal data we hold about you.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Rectification:</strong> Correct inaccurate or incomplete personal data.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Erasure:</strong> Request deletion of your personal data under certain circumstances.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Restrict Processing:</strong> Limit how we use your data.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-1">&#8226;</span>
                    <span><strong>Right to Object:</strong> Object to processing based on legitimate interests or direct marketing.</span>
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-navy-light leading-relaxed">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:support@chiavi.com" className="text-gold font-semibold hover:text-gold-dark transition">
                support@chiavi.com
              </a>
              . We will respond to your request within 30 days.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              8. Children&apos;s Privacy
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              The Service is not intended for use by individuals under the age of 18. We do not
              knowingly collect personal information from children. If we become aware that we have
              collected personal information from a child under 18, we will take steps to delete
              that information promptly. If you believe a child has provided us with personal
              information, please contact us at{" "}
              <a href="mailto:support@chiavi.com" className="text-gold font-semibold hover:text-gold-dark transition">
                support@chiavi.com
              </a>
              .
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              9. Data Security
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We implement industry-standard security measures to protect your personal information,
              including encryption in transit (TLS/SSL), encryption at rest, secure authentication,
              and access controls. However, no method of electronic transmission or storage is 100%
              secure, and we cannot guarantee absolute security. You are responsible for maintaining
              the confidentiality of your account credentials.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              10. Changes to This Privacy Policy
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will revise the
              &quot;Last updated&quot; date at the top of this page and, for material changes, notify you via
              email or a prominent notice on the Service. Your continued use of the Service after
              any changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-heading text-2xl font-bold text-navy border-b border-gold-muted/30 pb-3">
              11. Contact Us
            </h2>
            <p className="mt-6 text-navy-light leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us:
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
            <a href="/terms" className="hover:text-gold transition">Terms of Service</a>
            <a href="/" className="hover:text-gold transition">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
