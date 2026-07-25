import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password" },
      { name: "description", content: "Choose a new password for your Assignmate account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-processes recovery hash into a session
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/dashboard" });
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
        <h1 className="text-2xl font-display font-bold text-center">Set a new password</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {ready ? "Choose a strong password you haven't used before." : "Verifying your reset link…"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="password">New password</Label>
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
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm" type="password" required minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-9 h-11 bg-white/5 border-white/10"
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full h-11 gradient-bg text-white glow border-0">
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
