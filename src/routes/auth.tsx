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

import { useSiteSettings, platformName } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in" }] }),
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) afterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

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

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? `${window.location.origin}${next}` : window.location.origin,
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
        </form>

        {mode === "login" && (
          <div className="mt-3 text-right">
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

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
      </motion.div>
    </div>
  );
}
