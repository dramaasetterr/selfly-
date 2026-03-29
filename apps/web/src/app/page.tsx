"use client";

import { useState } from "react";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Waitlist form handler                                              */
/* ------------------------------------------------------------------ */
function useWaitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: "interested", source: "landing" }),
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return { email, setEmail, status, submit };
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: "Do I need a realtor to sell my home?",
    a: "No. Millions of homes are sold every year without a traditional real estate agent. Chiavi gives you the same professional tools agents use \u2014 AI pricing, document generation, showing management, and offer analysis \u2014 so you can sell confidently on your own and keep thousands in commission.",
  },
  {
    q: "What states is Chiavi available in?",
    a: "Chiavi is available nationwide across all 50 US states. Our document generation engine produces state-specific disclosure forms, purchase agreements, and counter-offers tailored to your state\u2019s legal requirements.",
  },
  {
    q: "How does AI pricing work?",
    a: "Our AI pricing engine analyzes comparable recent sales, current market trends, property condition, special features, and regional price-per-square-foot data to generate a recommended list price, a sell-fast price, and a maximize price \u2014 giving you a data-driven range in seconds.",
  },
  {
    q: "Is Chiavi really free to start?",
    a: "Yes. The Free plan includes AI pricing analysis, a home prep checklist, and basic listing creation at no cost. When you\u2019re ready for advanced features like document generation, offer analysis, and showing management, upgrade to Seller Pro for a one-time $299 fee \u2014 no subscriptions, no hidden costs.",
  },
  {
    q: "How much can I save by selling FSBO with Chiavi?",
    a: "The typical real estate commission is 5\u20136% of the sale price. On a $350,000 home, that\u2019s up to $21,000. By selling FSBO with Chiavi, you keep that money in your pocket. Even our Full Service plan at $499 saves you over $20,000 compared to a traditional agent.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gold-muted/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left"
      >
        <span className="text-base font-semibold text-navy">{q}</span>
        <span className="ml-4 flex-shrink-0 text-gold text-xl font-light">
          {open ? "\u2212" : "+"}
        </span>
      </button>
      {open && (
        <p className="pb-6 text-navy-light text-sm leading-relaxed">{a}</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function Home() {
  const waitlist = useWaitlist();

  return (
    <div className="min-h-screen bg-cream text-navy">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur border-b border-gold-muted/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Chiavi" width={280} height={80} className="h-16 w-auto" />
          </a>
          <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-navy-light">
            <a href="#how-it-works" className="hover:text-gold transition">
              How it Works
            </a>
            <a href="#features" className="hover:text-gold transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-gold transition">
              Pricing
            </a>
            <a href="#faq" className="hover:text-gold transition">
              FAQ
            </a>
          </div>
          <a
            href="/login"
            className="text-sm font-semibold text-gold hover:text-gold-dark transition"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream-light to-gold-bg -z-10" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 lg:pt-32 lg:pb-28 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            Sell Your Home.{" "}
            <span className="text-gold">Keep Your Equity.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-navy-light leading-relaxed font-body">
            Why pay a 6% commission when you can do it yourself? Chiavi is the AI-powered
            FSBO platform that guides you from pricing to closing &mdash; so you keep thousands
            more at the settlement table.
          </p>

          {/* Email waitlist in hero */}
          <form
            onSubmit={waitlist.submit}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto"
          >
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={waitlist.email}
              onChange={(e) => waitlist.setEmail(e.target.value)}
              className="w-full sm:flex-1 px-5 py-4 rounded-xl border border-gold-muted bg-white text-navy placeholder-navy-light/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            <button
              type="submit"
              disabled={waitlist.status === "loading"}
              className="w-full sm:w-auto whitespace-nowrap bg-gold hover:bg-gold-dark text-navy font-semibold px-8 py-4 rounded-xl shadow-lg shadow-gold-muted/30 transition disabled:opacity-60"
            >
              {waitlist.status === "loading" ? "Sending..." : "Get Early Access"}
            </button>
          </form>

          {waitlist.status === "success" && (
            <p className="mt-3 text-sm text-success font-medium">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </p>
          )}
          {waitlist.status === "error" && (
            <p className="mt-3 text-sm text-error font-medium">
              Something went wrong. Please try again.
            </p>
          )}

          {/* Trust line */}
          <p className="mt-6 text-sm font-semibold text-gold-dark tracking-wide uppercase">
            Save up to $21,000 on a $350K home
          </p>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { value: "$21,000+", label: "Average savings" },
              { value: "6-Step", label: "Guided process" },
              { value: "AI-Powered", label: "Smart tools" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-heading font-bold text-gold">{s.value}</p>
                <p className="mt-1 text-sm text-navy-light font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center">
            How It Works
          </h2>
          <p className="mt-4 text-center text-navy-light max-w-xl mx-auto">
            Six simple steps from listing to closing &mdash; Chiavi handles the hard parts.
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { step: 1, icon: "\u2302", title: "Prep Your Home", desc: "Follow our AI-generated checklist to get your home market-ready and maximize curb appeal." },
              { step: 2, icon: "\u2736", title: "Price It Right", desc: "Our AI pricing engine analyzes comps and market trends to suggest the optimal list price." },
              { step: 3, icon: "\u270E", title: "Create Your Listing", desc: "AI writes compelling descriptions and gives you photo tips \u2014 no photographer needed." },
              { step: 4, icon: "\u25A3", title: "Manage Showings", desc: "Buyers book showings online. You approve, reschedule, or decline in a tap." },
              { step: 5, icon: "\u2637", title: "Review Offers", desc: "Our Offer Analyzer scores and compares every offer side-by-side so you pick the best deal." },
              { step: 6, icon: "\u2714", title: "Close the Deal", desc: "Closing-cost calculators, net-sheet estimates, and step-by-step guides to the finish line." },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-cream-light rounded-2xl p-8 border border-gold-muted/30 hover:border-gold/40 hover:shadow-md transition group"
              >
                <span className="absolute -top-4 -left-2 bg-navy text-cream text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full shadow">
                  {item.step}
                </span>
                <div className="text-3xl mb-4 text-gold">{item.icon}</div>
                <h3 className="text-lg font-heading font-bold">{item.title}</h3>
                <p className="mt-2 text-navy-light text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="bg-cream py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center">
            Everything You Need to Sell FSBO
          </h2>
          <p className="mt-4 text-center text-navy-light max-w-xl mx-auto">
            Professional-grade tools that used to be agent-only &mdash; now in your pocket.
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "\u2726", title: "AI Pricing Analysis", desc: "Comparable sales, market trends, and a suggested price range \u2014 generated in seconds." },
              { icon: "\u25C6", title: "Smart Document Generation", desc: "Disclosure forms, listing agreements, and more \u2014 auto-filled and ready to sign." },
              { icon: "\u2696", title: "Offer Analyzer", desc: "Side-by-side scoring on price, contingencies, financing, and timeline so you negotiate with confidence." },
              { icon: "\u2261", title: "Closing Cost Calculator", desc: "Know your net proceeds before you accept. Estimates title fees, taxes, and payoff amounts." },
              { icon: "\u25A3", title: "Showing Management", desc: "Shareable booking page, automated confirmations, and a calendar view \u2014 all in one place." },
              { icon: "\u2192", title: "Listing Syndication Guide", desc: "Step-by-step instructions to get your home on Zillow, Realtor.com, and 50+ sites." },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white border border-gold-muted/30 rounded-2xl p-8 hover:border-gold/40 hover:shadow-lg transition"
              >
                <div className="text-3xl mb-4 text-gold">{f.icon}</div>
                <h3 className="text-lg font-heading font-bold">{f.title}</h3>
                <p className="mt-2 text-navy-light text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-center text-navy-light max-w-xl mx-auto">
            No monthly fees. No hidden costs. Pay once and sell with confidence.
          </p>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              desc="Get started and explore"
              features={[
                "AI pricing analysis",
                "Home prep checklist",
                "Basic listing creation",
              ]}
              cta="Get Started"
              highlighted={false}
            />
            <PricingCard
              name="Seller Pro"
              price="$299"
              period="one-time"
              desc="Everything you need to sell"
              features={[
                "Everything in Free",
                "Smart document generation",
                "Listing syndication guide",
                "Offer analyzer with scoring",
                "Closing cost calculator",
                "Showing management",
              ]}
              cta="Choose Seller Pro"
              highlighted
            />
            <PricingCard
              name="Full Service"
              price="$499"
              period="one-time"
              desc="White-glove FSBO support"
              features={[
                "Everything in Seller Pro",
                "Priority support",
                "Attorney referral network",
                "MLS listing assistance",
                "Professional photo tips",
              ]}
              cta="Choose Full Service"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-cream py-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-center text-navy-light max-w-xl mx-auto">
            Everything you need to know about selling your home with Chiavi.
          </p>
          <div className="mt-12 border-t border-gold-muted/50">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="bg-white py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            Join Thousands of Homeowners Saving on Commission
          </h2>
          <p className="mt-4 text-navy-light max-w-xl mx-auto">
            FSBO sellers keep an average of 5&ndash;6% more equity at closing. Chiavi makes the process
            simple enough for anyone.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { metric: "2,500+", label: "Homes listed" },
              { metric: "$52M+", label: "In seller savings" },
              { metric: "4.9/5", label: "App Store rating" },
            ].map((t) => (
              <div key={t.label}>
                <p className="text-4xl font-heading font-bold text-gold">{t.metric}</p>
                <p className="mt-1 text-sm text-navy-light font-medium">{t.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-navy-light/60 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="text-gold text-lg">&#10003;</span> SSL encrypted
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold text-lg">&#10003;</span> SOC 2 compliant
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold text-lg">&#10003;</span> GDPR ready
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold text-lg">&#10003;</span> 99.9% uptime
            </span>
          </div>
        </div>
      </section>

      {/* ─── WAITLIST / EMAIL CAPTURE ─── */}
      <section className="bg-navy py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-cream">
            Get Early Access
          </h2>
          <p className="mt-4 text-gold-muted max-w-lg mx-auto">
            Be the first to know when Chiavi launches in your area. No spam, ever.
          </p>

          <form
            onSubmit={waitlist.submit}
            className="mt-10 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={waitlist.email}
              onChange={(e) => waitlist.setEmail(e.target.value)}
              className="w-full sm:flex-1 px-5 py-4 rounded-xl text-navy placeholder-navy-light/40 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
            <button
              type="submit"
              disabled={waitlist.status === "loading"}
              className="w-full sm:w-auto whitespace-nowrap bg-gold text-navy font-semibold px-8 py-4 rounded-xl hover:bg-gold-light transition disabled:opacity-60"
            >
              {waitlist.status === "loading" ? "Sending..." : "Get Early Access"}
            </button>
          </form>

          {waitlist.status === "success" && (
            <p className="mt-4 text-sm text-success font-medium">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </p>
          )}
          {waitlist.status === "error" && (
            <p className="mt-4 text-sm text-red-300 font-medium">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-cream border-t border-gold-muted/30 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-navy-light/60">
          <p>&copy; 2026 Chiavi. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-gold transition">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-gold transition">
              Terms of Service
            </a>
            <a href="mailto:support@chiavi.com" className="hover:text-gold transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing Card component                                             */
/* ------------------------------------------------------------------ */
function PricingCard({
  name,
  price,
  period,
  desc,
  features,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-8 flex flex-col ${
        highlighted
          ? "bg-navy text-cream shadow-xl shadow-navy/20 ring-2 ring-gold scale-[1.03]"
          : "bg-cream-light border border-gold-muted/30"
      }`}
    >
      <h3 className={`text-lg font-heading font-bold ${highlighted ? "text-gold-muted" : "text-navy-light"}`}>
        {name}
      </h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-heading font-bold">{price}</span>
        <span className={`text-sm ${highlighted ? "text-gold-muted/60" : "text-navy-light/60"}`}>
          {period}
        </span>
      </div>
      <p className={`mt-2 text-sm ${highlighted ? "text-gold-muted/80" : "text-navy-light"}`}>{desc}</p>

      <ul className="mt-8 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 ${highlighted ? "text-gold" : "text-gold"}`}>
              &#10003;
            </span>
            {f}
          </li>
        ))}
      </ul>

      <a
        href="#"
        className={`mt-8 block text-center font-semibold py-3 rounded-xl transition ${
          highlighted
            ? "bg-gold text-navy hover:bg-gold-light"
            : "bg-navy text-cream hover:bg-navy-light"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
