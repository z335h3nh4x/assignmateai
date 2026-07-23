import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";

import { getMyEntitlements, type MyEntitlements } from "./entitlements.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const FEATURE_LABELS: Record<string, string> = {
  humanized_writing: "Humanized Writing",
  ocr: "OCR (image/handwriting reading)",
  ai_chat: "AI Assignment Chat",
  pdf_export: "Academic PDF Export",
  docx_export: "DOCX Export",
  notebook_pdf: "Notebook PDF Export",
  citation_generator: "Citation Generator",
  grammar_checker: "Grammar Checker",
  priority_queue: "Priority Queue",
  faster_generation: "Faster Generation",
  premium_templates: "Premium Templates",
  api_access: "API Access",
  future_features: "Future Features",
};

type UpgradeCtx = { open: (feature: string) => void };
const UpgradeCtxObj = createContext<UpgradeCtx | null>(null);

export function PlanFeaturesProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fn = useServerFn(getMyEntitlements);
  const q = useQuery<MyEntitlements>({
    queryKey: ["my-entitlements"],
    queryFn: () => fn(),
    enabled: !!isAuthed,
    staleTime: 15_000,
  });

  const ctx = useMemo<UpgradeCtx>(() => ({ open: (f) => setFeature(f) }), []);

  const legacyShape = q.data
    ? {
        planId: q.data.plan.id,
        planSlug: q.data.plan.slug,
        planName: q.data.plan.name,
        features: q.data.plan.features ?? {},
      }
    : null;

  return (
    <EntitlementsCtx.Provider value={q.data ?? null}>
      <PlanDataCtx.Provider value={legacyShape}>
        <UpgradeCtxObj.Provider value={ctx}>
          {children}
          <UpgradeDialog
            feature={feature}
            planName={q.data?.plan.name ?? "Free"}
            onClose={() => setFeature(null)}
          />
        </UpgradeCtxObj.Provider>
      </PlanDataCtx.Provider>
    </EntitlementsCtx.Provider>
  );
}

type LegacyPlan = { planId: string | null; planSlug: string; planName: string; features: Record<string, boolean> };
const PlanDataCtx = createContext<LegacyPlan | null>(null);
const EntitlementsCtx = createContext<MyEntitlements | null>(null);

export function useMyPlan(): LegacyPlan | null {
  return useContext(PlanDataCtx);
}

export function useMyEntitlements(): MyEntitlements | null {
  return useContext(EntitlementsCtx);
}


export function useFeature(key: string) {
  const plan = useContext(PlanDataCtx);
  const upgrade = useContext(UpgradeCtxObj);
  const allowed = !!plan?.features?.[key];
  const requestUpgrade = useCallback(() => upgrade?.open(key), [upgrade, key]);
  const guard = useCallback(
    (fn: () => void) => {
      if (allowed) fn();
      else upgrade?.open(key);
    },
    [allowed, upgrade, key],
  );
  return {
    allowed,
    loading: !plan,
    planName: plan?.planName ?? "Free",
    requestUpgrade,
    guard,
  };
}

function UpgradeDialog({
  feature,
  planName,
  onClose,
}: {
  feature: string | null;
  planName: string;
  onClose: () => void;
}) {
  const open = !!feature;
  const label = feature ? FEATURE_LABELS[feature] ?? feature : "";
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full gradient-bg glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center">Upgrade to unlock {label}</DialogTitle>
          <DialogDescription className="text-center">
            Your current plan ({planName}) doesn't include this feature. Upgrade to a plan
            that includes <span className="font-medium text-foreground">{label}</span> to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button asChild className="gradient-bg text-white border-0" onClick={onClose}>
            <Link to="/" hash="pricing">View plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wraps a Button-like element and turns it into a lock affordance when the
 * feature is not allowed. Click always calls guard() so it opens the upgrade
 * dialog instead of triggering the underlying action.
 */
export function LockIcon({ className = "" }: { className?: string }) {
  return <Lock className={`h-3.5 w-3.5 ${className}`} aria-label="Locked" />;
}
