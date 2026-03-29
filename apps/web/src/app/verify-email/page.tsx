"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VerifyEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setMessage("No email found. Please log in again.");
      setResending(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Verification email sent! Check your inbox.");
    }

    setResending(false);
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setMessage(null);

    // Refresh the session to pick up updated email_confirmed_at
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      setMessage("Could not refresh session. Please try logging in again.");
      setChecking(false);
      return;
    }

    if (data.user?.email_confirmed_at) {
      router.push("/dashboard");
    } else {
      setMessage(
        "Email not yet verified. Please check your inbox and click the verification link."
      );
    }

    setChecking(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF7E4",
        padding: "1rem",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem", color: "#1a1a1a" }}>
          Check your email
        </h1>
        <p style={{ color: "#555", marginBottom: "2rem", lineHeight: 1.5 }}>
          We sent a verification link to your email address. Please click the
          link to verify your account before continuing.
        </p>

        {message && (
          <p
            style={{
              color: message.includes("sent") ? "#16a34a" : "#dc2626",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleCheckVerification}
          disabled={checking}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#C4A265",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: checking ? "wait" : "pointer",
            marginBottom: "0.75rem",
            opacity: checking ? 0.7 : 1,
          }}
        >
          {checking ? "Checking..." : "I've verified my email"}
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "transparent",
            color: "#C4A265",
            border: "2px solid #C4A265",
            borderRadius: 8,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: resending ? "wait" : "pointer",
            opacity: resending ? 0.7 : 1,
          }}
        >
          {resending ? "Sending..." : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}
