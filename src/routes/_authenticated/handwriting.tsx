import { createFileRoute } from "@tanstack/react-router";
import { Pencil, CheckCircle2, Sparkles, FileDown, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/handwriting")({
  head: () => ({
    meta: [
      { title: "My Handwriting — Assignmate" },
      { name: "description", content: "Coming soon: generate notebook assignments in your own handwriting with Assignmate." },
    ],
  }),
  component: HandwritingPage,
});

const FEATURES = [
  "Personal handwriting profile",
  "One-time handwriting setup",
  "AI-powered handwriting generation",
  "Works with Notebook PDF exports",
  "Securely linked to your account",
];

function HandwritingPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-2">
        <Badge
          variant="outline"
          className="rounded-full border-yellow-500/30 bg-yellow-500/10 text-yellow-400 px-3 py-1 text-xs font-medium"
        >
          🟡 Coming Soon
        </Badge>
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        ✍️ My Handwriting
      </h1>
      <p className="mt-2 text-muted-foreground">
        Soon you'll be able to generate notebook assignments using your own handwriting.
      </p>

      <Card className="mt-8 glass relative overflow-hidden p-1">
        <div className="absolute inset-0 gradient-bg opacity-10" />
        <div className="relative rounded-xl bg-background/40 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="mx-auto md:mx-0 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl gradient-bg glow">
              <Pencil className="h-10 w-10 text-white" strokeWidth={1.5} />
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                Your Handwriting. Your Assignments.
              </h2>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                Download a handwriting template, fill it out with your own handwriting, upload it once, and
                AssignMate will generate future notebook assignments in your personal handwriting.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                This feature is currently under development and will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-6 glass p-6 md:p-8">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Feature Preview
        </h3>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6 glass p-6 md:p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileDown className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">Handwriting Template</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          When this feature launches, you'll be able to download a guided template to capture your handwriting style.
        </p>
        <Button disabled className="mt-5 min-w-[220px]">
          Download Handwriting Template
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">Available when this feature launches.</p>
      </Card>

      <Card className="mt-6 glass p-5 md:p-6 flex items-start gap-4">
        <Lightbulb className="h-5 w-5 shrink-0 text-yellow-400 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          This feature will be included for <span className="font-medium text-foreground">Basic and Plus members</span>{" "}
          when released.
        </p>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        We're actively building this feature. Stay tuned for a future update.
      </p>
    </div>
  );
}
