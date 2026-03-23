"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="bg-white rounded-2xl border border-gold-muted/30 p-8 shadow-sm">
      <h1 className="font-heading text-2xl font-bold text-navy text-center">
        Welcome Back
      </h1>
      <p className="mt-2 text-sm text-navy-light text-center">
        Log in to continue managing your sale
      </p>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        {error && (
          <div className="bg-red-50 border-l-3 border-error rounded-lg px-4 py-3">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-gold-muted/50 bg-white text-navy placeholder-navy-light/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full px-4 py-3 rounded-xl border border-gold-muted/50 bg-white text-navy placeholder-navy-light/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold py-3.5 rounded-xl shadow-sm transition disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Log In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-light">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gold font-semibold hover:text-gold-dark transition">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
