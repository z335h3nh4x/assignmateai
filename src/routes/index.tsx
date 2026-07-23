import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Upload, FileText, GraduationCap, PenLine,
  ShieldCheck, Zap, BookOpen, ChevronRight,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { listPublicPlans, type PublicPlan } from "@/lib/plans.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AssignAI — AI Assignment Helper for Students" },
      { name: "description", content: "Upload or paste any assignment. AssignAI writes clean, referenced, human-sounding answers in seconds." },
      { property: "og:title", content: "AssignAI — AI Assignment Helper" },
      { property: "og:description", content: "Upload or paste any assignment. Get referenced, human-sounding answers in seconds." },
    ],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-bg grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-semibold tracking-tight">AssignAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm px-4 py-2 rounded-lg hover:bg-white/5 transition">
              Login
            </Link>
            <Link to="/auth" className="text-sm px-4 py-2 rounded-lg gradient-bg text-white font-medium glow">
              Try Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-24 px-4">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Powered by advanced AI — trained for academics
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter"
        >
          Solve any assignment with{" "}
          <span className="gradient-text">AssignAI</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Upload a PDF, image, DOCX or paste your prompt. Choose your level and style.
          Get a fully formatted, human-sounding assignment in seconds.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap gap-3 justify-center"
        >
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl gradient-bg text-white font-medium px-6 py-3.5 glow hover:scale-[1.02] transition">
            Try Free <ChevronRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 font-medium hover:bg-white/10 transition">
            See how it works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20"
        >
          <div className="glass rounded-3xl p-3 max-w-3xl mx-auto">
            <div className="rounded-2xl bg-background/40 p-8 border border-white/5">
              <div className="grid md:grid-cols-3 gap-4 text-left">
                {[
                  { icon: Upload, label: "Upload PDF / DOCX / Image" },
                  { icon: GraduationCap, label: "Pick your education level" },
                  { icon: PenLine, label: "Generate & download" },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl bg-white/5 border border-white/5 p-4">
                    <s.icon className="h-5 w-5 text-primary mb-3" />
                    <p className="text-sm font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Upload, title: "Any input format", body: "Upload PDF, DOCX, TXT or images — or just paste the prompt." },
  { icon: GraduationCap, title: "Matched to your level", body: "School, college, university or masters — tone and depth adapt." },
  { icon: PenLine, title: "4 writing styles", body: "Simple, detailed, academic, or humanized. Pick your voice." },
  { icon: BookOpen, title: "References included", body: "Structured headings, bullets, paragraphs and proper citations." },
  { icon: ShieldCheck, title: "Human-sounding output", body: "Reads like you wrote it — not another obvious AI paste." },
  { icon: Zap, title: "Lightning fast", body: "Full assignments generated in seconds, streamed to your screen." },
];

function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Everything you need to <span className="gradient-text">ship the assignment</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Built for real student workflows — from problem sheet to polished submission.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-6 hover:bg-white/10 transition group"
            >
              <div className="h-11 w-11 rounded-xl gradient-bg grid place-items-center mb-4 group-hover:scale-110 transition">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatPrice(cents: number, currency: string) {
  if (!cents) return "Free";
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";
  const amount = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

function planFeatureLines(p: PublicPlan): string[] {
  const lines: string[] = [];
  lines.push(p.credits ? `${p.credits.toLocaleString()} credits` : "Pay-as-you-go credits");
  
  if (p.monthly_limit) lines.push(`${p.monthly_limit.toLocaleString()} assignments / month`);
  else if (p.daily_limit) lines.push(`${p.daily_limit} assignments / day`);
  if (p.max_upload_mb) lines.push(`${p.max_upload_mb} MB uploads · ${p.max_upload_pages || "∞"} pages`);
  const featureLabels: Record<string, string> = {
    humanized_writing: "Humanized writing engine",
    ocr: "OCR for images & scans",
    ai_chat: "AI assignment chat",
    pdf_export: "Academic PDF export",
    docx_export: "DOCX export",
    notebook_export: "Notebook-style PDF export",
    grammar_check: "Grammar & quality score",
    priority_speed: "Priority generation speed",
    references: "Auto references & citations",
    all_styles: "All writing styles",
    team_seats: "Team seats",
    early_features: "Early access to new features",
    priority_support: "Priority support",
  };
  for (const [key, on] of Object.entries(p.features || {})) {
    if (on && featureLabels[key]) lines.push(featureLabels[key]);
  }
  return lines;
}

function Pricing() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });
  const plans = (data ?? []).filter((p) => p.sort_order >= 0);

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Simple, student-friendly <span className="gradient-text">pricing</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Cancel anytime. No credit card required to start.</p>
        </div>
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">Loading plans…</div>
        )}
        {!isLoading && plans.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">Plans coming soon.</div>
        )}
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((p) => {
            const features = planFeatureLines(p);
            const price = formatPrice(p.monthly_price_cents, p.currency);
            const isFree = p.monthly_price_cents === 0;
            return (
              <div
                key={p.id}
                className={`glass rounded-2xl p-8 relative ${p.is_recommended ? "ring-1 ring-primary glow" : ""}`}
              >
                {p.is_recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full gradient-bg text-white font-medium">
                    Most popular
                  </span>
                )}
                <p className="text-sm text-muted-foreground">{p.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-bold font-display">{price}</span>
                  {!isFree && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>
                {p.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                )}
                <ul className="mt-6 space-y-3 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full gradient-bg grid place-items-center mt-0.5 flex-shrink-0">
                        <ChevronRight className="h-3 w-3 text-white" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={`mt-8 block text-center rounded-xl px-4 py-3 font-medium transition ${
                    p.is_recommended ? "gradient-bg text-white glow" : "glass hover:bg-white/10"
                  }`}
                >
                  {isFree ? "Start free" : `Get ${p.name}`}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


const FAQS = [
  { q: "Is AssignAI detected as AI?", a: "We use a dedicated humanized style that produces natural, varied prose — most detectors flag it as human-written. Always review before submitting." },
  { q: "What files can I upload?", a: "PDF, DOCX, TXT and images (JPG, PNG). You can also paste text directly." },
  { q: "Do you include references?", a: "Yes. Any output style except 'Simple' produces formatted headings, bullets and inline references." },
  { q: "Can I edit the result?", a: "Absolutely — copy it, download as PDF/DOCX, or regenerate with different settings." },
  { q: "Is my data private?", a: "Your assignments are stored securely under your account only. We never train on your data." },
];

function FAQ() {
  return (
    <section id="faq" className="py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Frequently asked
          </h2>
        </div>
        <div className="glass rounded-2xl p-2">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`i-${i}`} className="px-5 border-white/10">
                <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-white/5">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md gradient-bg grid place-items-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm text-muted-foreground">© 2026 AssignAI</span>
        </div>
        <div className="text-xs text-muted-foreground">Built for students who ship.</div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}
