import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — Assignmate" },
      {
        name: "description",
        content:
          "Reset your Assignmate account password to regain access to your AI-powered assignment workspace, saved assignments and exports.",
      },
      { property: "og:title", content: "Reset Your Password — Assignmate" },
      {
        property: "og:description",
        content:
          "Request a password reset link and get back into your Assignmate account.",
      },
      { property: "og:url", content: "https://assignmateai.in/forgot-password" },
    ],
    links: [{ rel: "canonical", href: "https://assignmateai.in/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Password reset email sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Link to="/auth" className="fixed top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <BrandLogo size="h-12" imgMaxWidth="max-w-[180px]" showName={false} />
        </div>
        <h1 className="text-2xl font-display font-bold text-center">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-6 text-center space-y-4">
            <p className="text-sm">
              If an account exists for <span className="font-medium">{email}</span>, a password reset link has been sent.
              Check your inbox (and spam folder).
            </p>
            <Button asChild variant="secondary" className="w-full h-11">
              <Link to="/auth">Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-bg text-white glow border-0">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
