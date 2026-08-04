import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { rememberPostAuthRedirect } from "@/lib/oauth-callback";


import { useSiteSettings, platformName } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or Create an Account — Assignmate" },
      {
        name: "description",
        content:
          "Sign in to Assignmate or create a free account to upload assignments, generate worked AI solutions and export submission-ready documents.",
      },
      { property: "og:title", content: "Sign in or Create an Account — Assignmate" },
      {
        property: "og:description",
        content:
          "Access your Assignmate AI assignment workspace with email or Google sign-in.",
      },
      { property: "og:url", content: "https://assignmateai.in/auth" },
    ],
    links: [{ rel: "canonical", href: "https://assignmateai.in/auth" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const site = useSiteSettings();
  const name = platformName(site);
  const tagline = site?.general.tagline?.trim() || "AI-powered assignment workspace for students.";


  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const afterAuth = () => {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/dashboard" });
  };
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"password" | "otp">("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);


  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        afterAuth();
        return;
      }
      setCheckingSession(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) afterAuth();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  if (checkingSession) {
    return <div className="min-h-screen" aria-busy="true" />;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}` },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is required.");
        afterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        afterAuth();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp(resend = false) {
    const target = email.trim().toLowerCase();
    if (!target) {
      toast.error("Enter your email first");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: target,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
        },
      });
      if (error) throw error;
      // Verify against the exact address the code was issued to — any drift
      // (casing/whitespace/edited field) makes Supabase report "expired".
      setSentEmail(target);
      setEmail(target);
      setOtpSent(true);
      setOtp("");
      setResendIn(45);
      toast.success(resend ? "New code sent" : `We sent a 6-digit code to ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const token = otp.replace(/\D/g, "");
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    const target = (sentEmail || email).trim().toLowerCase();
    setLoading(true);
    try {
      // This project's email hook issues passwordless login codes as recovery
      // tokens. Verify with that matching type first. The generic `email` type
      // remains a compatibility fallback for accounts issued a standard OTP.
      let { error } = await supabase.auth.verifyOtp({ email: target, token, type: "recovery" });
      if (error) {
        const fallback = await supabase.auth.verifyOtp({ email: target, token, type: "email" });
        if (!fallback.error) error = null;
      }
      if (error) throw error;
      afterAuth();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /expired|invalid/i.test(msg)
          ? "That code didn't work. Codes expire after a few minutes — tap Resend code."
          : msg || "Could not verify the code",
      );
      setLoading(false);
    }
  }



  async function handleGoogle() {
    setLoading(true);
    // Full-page redirects must return to a PUBLIC origin URL; the intended
    // destination is stored separately and applied after the session exists.
    rememberPostAuthRedirect(next ?? "/dashboard");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    afterAuth();
  }


  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Link to="/" className="fixed top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <BrandLogo size="h-12" imgMaxWidth="max-w-[180px]" showName={false} />
        </div>
        <h1 className="text-2xl font-display font-bold text-center">
          {mode === "login" ? `Welcome back to ${name}` : `Create your ${name} account`}
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {tagline}
        </p>


        <Button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          variant="secondary"
          className="w-full mt-6 h-11 bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.5 1.7 14.9.7 12 .7 7.4.7 3.5 3.3 1.6 7l3.6 2.8C6.1 6.9 8.8 5 12 5z" />
            <path fill="#4285F4" d="M23.3 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.6l3.6 2.8c2.1-1.9 3.3-4.8 3.3-8.5z" />
            <path fill="#FBBC05" d="M5.2 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.6 7.4C.6 9 0 10.9 0 13s.6 4 1.6 5.6l3.6-2.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.6-2.8c-1 .7-2.3 1.1-4.3 1.1-3.2 0-5.9-1.9-7.2-4.7l-3.6 2.8C3.5 20.7 7.4 24 12 24z" />
          </svg>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {method === "otp" ? (
          otpSent ? (
            <form onSubmit={verifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to <span className="text-foreground font-medium">{email}</span>
              </p>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 text-center text-2xl tracking-[0.5em] bg-white/5 border-white/10"
                placeholder="••••••"
                aria-label="6-digit verification code"
              />
              <Button type="submit" disabled={loading} className="w-full h-11 gradient-bg text-white glow border-0">
                {loading ? "Verifying..." : "Verify & continue"}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Change email
                </button>
                <button
                  type="button"
                  disabled={loading || resendIn > 0}
                  onClick={() => sendOtp(true)}
                  className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11 bg-white/5 border-white/10"
                    placeholder="you@gmail.com"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 gradient-bg text-white glow border-0">
                {loading ? "Sending code..." : "Send login code"}
              </Button>
              <button
                type="button"
                onClick={() => setMethod("password")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Use password instead
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 bg-white/5 border-white/10"
                  placeholder="you@school.edu"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type="password" required minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11 bg-white/5 border-white/10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-bg text-white glow border-0">
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              onClick={() => { setMethod("otp"); setOtpSent(false); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Email me a login code instead
            </button>
          </form>
        )}


        {mode === "login" && method === "password" && (
          <div className="mt-3 text-right">
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        {method === "password" && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
