"use client";

import { useState } from "react";

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

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function Home() {
  const waitlist = useWaitlist();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <a href="#" className="text-2xl font-extrabold tracking-tight text-primary">
            Selfly
          </a>
          <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-primary transition">
              How it Works
            </a>
            <a href="#features" className="hover:text-primary transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-primary transition">
              Pricing
            </a>
          </div>
          {/* mobile hamburger — kept minimal, no JS toggle for brevity */}
          <a
            href="#pricing"
            className="sm:hidden text-sm font-semibold text-primary"
          >
            Pricing
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 -z-10" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 lg:pt-32 lg:pb-28 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            Sell Your Home.{" "}
            <span className="text-primary">Save Thousands.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 leading-relaxed">
            Selfly is the AI-powered For Sale By Owner platform that guides you through every step
            — from pricing and listing to offers and closing — so you keep the commission in your
            pocket.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition"
            >
              Download the App
            </a>
            <a
              href="#how-it-works"
              className="text-primary font-semibold hover:underline text-lg"
            >
              See how it works &rarr;
            </a>
          </div>

          {/* stats row */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { value: "$21,000+", label: "Average savings" },
              { value: "6-Step", label: "Guided process" },
              { value: "AI-Powered", label: "Smart tools" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center">
            How It Works
          </h2>
          <p className="mt-4 text-center text-gray-500 max-w-xl mx-auto">
            Six simple steps from listing to closing — Selfly handles the hard parts.
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                icon: "📋",
                title: "Prep Your Home",
                desc: "Follow our AI-generated checklist to get your home market-ready and maximize curb appeal.",
              },
              {
                step: 2,
                icon: "📊",
                title: "Price It Right",
                desc: "Our AI pricing engine analyzes comps and market trends to suggest the optimal list price.",
              },
              {
                step: 3,
                icon: "📝",
                title: "Create Your Listing",
                desc: "AI writes compelling descriptions and gives you photo tips — no photographer needed.",
              },
              {
                step: 4,
                icon: "📅",
                title: "Manage Showings",
                desc: "Buyers book showings online. You approve, reschedule, or decline in a tap.",
              },
              {
                step: 5,
                icon: "🔍",
                title: "Review Offers",
                desc: "Our Offer Analyzer scores and compares every offer side-by-side so you pick the best deal.",
              },
              {
                step: 6,
                icon: "🏠",
                title: "Close the Deal",
                desc: "Closing-cost calculators, net-sheet estimates, and step-by-step guides to the finish line.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition group"
              >
                {/* step number badge */}
                <span className="absolute -top-4 -left-2 bg-primary text-white text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full shadow">
                  {item.step}
                </span>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center">
            Everything You Need to Sell FSBO
          </h2>
          <p className="mt-4 text-center text-gray-500 max-w-xl mx-auto">
            Professional-grade tools that used to be agent-only — now in your pocket.
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🤖",
                title: "AI Pricing Analysis",
                desc: "Comparable sales, market trends, and a suggested price range — generated in seconds.",
              },
              {
                icon: "📄",
                title: "Smart Document Generation",
                desc: "Disclosure forms, listing agreements, and more — auto-filled and ready to sign.",
              },
              {
                icon: "⚖️",
                title: "Offer Analyzer",
                desc: "Side-by-side scoring on price, contingencies, financing, and timeline so you negotiate with confidence.",
              },
              {
                icon: "🧮",
                title: "Closing Cost Calculator",
                desc: "Know your net proceeds before you accept. Estimates title fees, taxes, and payoff amounts.",
              },
              {
                icon: "🗓️",
                title: "Showing Management",
                desc: "Shareable booking page, automated confirmations, and a calendar view — all in one place.",
              },
              {
                icon: "📡",
                title: "Listing Syndication Guide",
                desc: "Step-by-step instructions to get your home on Zillow, Realtor.com, and 50+ sites.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="border border-gray-100 rounded-2xl p-8 hover:border-primary/30 hover:shadow-lg transition"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-center text-gray-500 max-w-xl mx-auto">
            No monthly fees. No hidden costs. Pay once and sell with confidence.
          </p>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Free */}
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
            {/* Seller Pro */}
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
            {/* Full Service */}
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

      {/* ─── SOCIAL PROOF ─── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            Join Thousands of Homeowners Saving on Commission
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            FSBO sellers keep an average of 5-6% more equity at closing. Selfly makes the process
            simple enough for anyone.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { metric: "2,500+", label: "Homes listed" },
              { metric: "$52M+", label: "In seller savings" },
              { metric: "4.9/5", label: "App Store rating" },
            ].map((t) => (
              <div key={t.label}>
                <p className="text-4xl font-extrabold text-primary">{t.metric}</p>
                <p className="mt-1 text-sm text-gray-500 font-medium">{t.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-400 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="text-green-500 text-lg">&#10003;</span> SSL encrypted
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500 text-lg">&#10003;</span> SOC 2 compliant
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500 text-lg">&#10003;</span> GDPR ready
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500 text-lg">&#10003;</span> 99.9% uptime
            </span>
          </div>
        </div>
      </section>

      {/* ─── WAITLIST / EMAIL CAPTURE ─── */}
      <section className="bg-primary py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Get Early Access
          </h2>
          <p className="mt-4 text-blue-100 max-w-lg mx-auto">
            Be the first to know when Selfly launches in your area. No spam, ever.
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
              className="w-full sm:flex-1 px-5 py-4 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              disabled={waitlist.status === "loading"}
              className="w-full sm:w-auto whitespace-nowrap bg-white text-primary font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition disabled:opacity-60"
            >
              {waitlist.status === "loading" ? "Sending..." : "Get Early Access"}
            </button>
          </form>

          {waitlist.status === "success" && (
            <p className="mt-4 text-sm text-green-200 font-medium">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </p>
          )}
          {waitlist.status === "error" && (
            <p className="mt-4 text-sm text-red-200 font-medium">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Selfly. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-600 transition">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-600 transition">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-600 transition">
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
          ? "bg-primary text-white shadow-xl shadow-blue-200 ring-2 ring-primary scale-[1.03]"
          : "bg-white border border-gray-200"
      }`}
    >
      <h3 className={`text-lg font-bold ${highlighted ? "text-blue-100" : "text-gray-500"}`}>
        {name}
      </h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold">{price}</span>
        <span className={`text-sm ${highlighted ? "text-blue-200" : "text-gray-400"}`}>
          {period}
        </span>
      </div>
      <p className={`mt-2 text-sm ${highlighted ? "text-blue-100" : "text-gray-500"}`}>{desc}</p>

      <ul className="mt-8 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 ${highlighted ? "text-blue-200" : "text-primary"}`}>
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
            ? "bg-white text-primary hover:bg-blue-50"
            : "bg-primary text-white hover:bg-blue-700"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
