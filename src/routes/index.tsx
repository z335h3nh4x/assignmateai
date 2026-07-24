import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Upload, GraduationCap, PenLine,
  ShieldCheck, Zap, BookOpen, ChevronRight, Quote,
  Rocket, Star, Wand2, Brain, FileText, MessageSquare,
  CheckCircle2, Layers, Bot, Cpu, Globe, Lock, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { listPublicPlans, type PublicPlan } from "@/lib/plans.functions";
import { getSiteSettings, type SiteSettings } from "@/lib/site-settings.functions";
import { BrandLogo } from "@/components/brand-logo";

const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, Upload, GraduationCap, PenLine, BookOpen, ShieldCheck, Zap,
  Rocket, Star, Wand2, Brain, FileText, MessageSquare, CheckCircle2,
  Layers, Bot, Cpu, Globe, Lock, Heart,
};


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assignmate — AI-powered assignment workspace for students" },
      { name: "description", content: "AI-powered assignment workspace for students." },
      { property: "og:title", content: "Assignmate — AI assignment workspace" },
      { property: "og:description", content: "AI-powered assignment workspace for students." },
    ],
  }),
  component: Landing,
});

function useSite() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettings(),
    staleTime: 30_000,
  });
}

function Nav({ site }: { site?: SiteSettings }) {
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            {site?.landing.show_pricing !== false && (
              <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            )}
            {site?.landing.show_faq !== false && (
              <a href="#faq" className="hover:text-foreground transition">FAQ</a>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm px-4 py-2 rounded-lg hover:bg-white/5 transition">
              Login
            </Link>
            <Link to="/auth" className="text-sm px-4 py-2 rounded-lg gradient-bg text-white font-medium glow">
              {site?.landing.hero_cta_text || "Try Free"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero({ site }: { site?: SiteSettings }) {
  const eyebrow = site?.landing.hero_eyebrow || "Powered by advanced AI — trained for academics";
  const title = site?.landing.hero_title;
  const subtitle =
    site?.landing.hero_subtitle ||
    "Upload a PDF, image, DOCX or paste your prompt. Choose your level and style. Get a fully formatted, human-sounding assignment in seconds.";
  const primaryText = site?.landing.hero_cta_text || "Try Free";
  const primaryUrl = site?.landing.hero_cta_url || "/auth";
  const secondaryText = site?.landing.hero_secondary_cta_text || "See how it works";
  const secondaryUrl = site?.landing.hero_secondary_cta_url || "#features";

  return (
    <section className="relative pt-40 pb-24 px-4">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {eyebrow}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter"
        >
          {title ? (
            title
          ) : (
            <>
              Solve any assignment with{" "}
              <span className="gradient-text">{site?.general.platform_name || "Assignmate"}</span>
            </>
          )}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap gap-3 justify-center"
        >
          <CTALink href={primaryUrl} className="inline-flex items-center gap-2 rounded-xl gradient-bg text-white font-medium px-6 py-3.5 glow hover:scale-[1.02] transition">
            {primaryText} <ChevronRight className="h-4 w-4" />
          </CTALink>
          <CTALink href={secondaryUrl} className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 font-medium hover:bg-white/10 transition">
            {secondaryText}
          </CTALink>
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

function CTALink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const isInternal = href.startsWith("/") && !href.startsWith("//");
  if (isInternal) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const DEFAULT_FEATURES = [
  { icon: Upload, title: "Any input format", body: "Upload PDF, DOCX, TXT or images — or just paste the prompt." },
  { icon: GraduationCap, title: "Matched to your level", body: "School, college, university or masters — tone and depth adapt." },
  { icon: PenLine, title: "4 writing styles", body: "Simple, detailed, academic, or humanized. Pick your voice." },
  { icon: BookOpen, title: "References included", body: "Structured headings, bullets, paragraphs and proper citations." },
  { icon: ShieldCheck, title: "Human-sounding output", body: "Reads like you wrote it — not another obvious AI paste." },
  { icon: Zap, title: "Lightning fast", body: "Full assignments generated in seconds, streamed to your screen." },
];

const FEATURE_ICON_FALLBACKS = [Upload, GraduationCap, PenLine, BookOpen, ShieldCheck, Zap];

function Features({ site }: { site?: SiteSettings }) {
  const raw = site?.landing.features;
  // Admin explicitly manages the list → respect it (may be empty → hide section).
  // Nothing configured yet (undefined) → show sensible defaults.
  let items: { icon: LucideIcon; title: string; body: string }[];
  if (Array.isArray(raw)) {
    const visible = raw.filter(
      (f) => !f.hidden && ((f.title || "").trim() || (f.body || "").trim()),
    );
    if (visible.length === 0) return null;
    items = visible.map((f, i) => ({
      icon: (f.icon && FEATURE_ICON_MAP[f.icon]) || FEATURE_ICON_FALLBACKS[i % FEATURE_ICON_FALLBACKS.length],
      title: f.title || "",
      body: f.body || "",
    }));
  } else {
    items = DEFAULT_FEATURES;
  }

  const heading = site?.landing.features_heading;
  const subheading =
    site?.landing.features_subheading ||
    "Built for real student workflows — from problem sheet to polished submission.";

  return (
    <section id="features" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {heading ? (
              heading
            ) : (
              <>Everything you need to <span className="gradient-text">ship the assignment</span></>
            )}
          </h2>
          <p className="mt-4 text-muted-foreground">{subheading}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => (
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

function Pricing({ site }: { site?: SiteSettings }) {
  const { data, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });
  const plans = (data ?? []).filter((p) => p.sort_order >= 0);
  const heading = site?.landing.pricing_heading;
  const subheading =
    site?.landing.pricing_subheading || "Cancel anytime. No credit card required to start.";

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {heading ? (
              heading
            ) : (
              <>Simple, student-friendly <span className="gradient-text">pricing</span></>
            )}
          </h2>
          <p className="mt-4 text-muted-foreground">{subheading}</p>
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

function Testimonials({ site }: { site?: SiteSettings }) {
  const items = (site?.landing.testimonials || []).filter(
    (t) => (t.name || "").trim() || (t.quote || "").trim(),
  );
  if (items.length === 0) return null;
  const heading = site?.landing.testimonials_heading || "Loved by students";
  return (
    <section id="testimonials" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{heading}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <Quote className="h-5 w-5 text-primary mb-3" />
              <p className="text-sm text-foreground/90">{t.quote}</p>
              <div className="mt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function defaultFaqs(name: string) {
  return [
    { question: `Is ${name} detected as AI?`, answer: "We use a dedicated humanized style that produces natural, varied prose — most detectors flag it as human-written. Always review before submitting." },
    { question: "What files can I upload?", answer: "PDF, DOCX, TXT and images (JPG, PNG). You can also paste text directly." },
    { question: "Do you include references?", answer: "Yes. Any output style except 'Simple' produces formatted headings, bullets and inline references." },
    { question: "Can I edit the result?", answer: "Absolutely — copy it, download as PDF/DOCX, or regenerate with different settings." },
    { question: "Is my data private?", answer: "Your assignments are stored securely under your account only. We never train on your data." },
  ];
}

function FAQ({ site }: { site?: SiteSettings }) {
  const custom = (site?.landing.faq || []).filter((f) => (f.question || "").trim() || (f.answer || "").trim());
  const items = custom.length > 0 ? custom : defaultFaqs(site?.general.platform_name || "Assignmate");
  const heading = site?.landing.faq_heading || "Frequently asked";

  return (
    <section id="faq" className="py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{heading}</h2>
        </div>
        <div className="glass rounded-2xl p-2">
          <Accordion type="single" collapsible className="w-full">
            {items.map((f, i) => (
              <AccordionItem key={i} value={`i-${i}`} className="px-5 border-white/10">
                <AccordionTrigger className="text-left hover:no-underline">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function Footer({ site }: { site?: SiteSettings }) {
  const name = site?.general.platform_name || "Assignmate";
  const copyright = site?.general.copyright_text || `© 2026 ${name}. All rights reserved.`;
  const tagline = site?.general.footer_text || "Built for students who ship.";
  const support = site?.general.support_email?.trim();
  const contact = site?.general.contact_email?.trim();
  const website = site?.general.website_url?.trim();
  return (
    <footer className="py-12 px-4 border-t border-white/5">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size="h-6" imgMaxWidth="max-w-[120px]" showName={false} />
            <span className="text-sm text-muted-foreground">{name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {support && (
              <a href={`mailto:${support}`} className="hover:text-foreground transition">
                Need help? Contact us
              </a>
            )}
            {contact && (
              <a href={`mailto:${contact}`} className="hover:text-foreground transition">
                Business inquiries
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noreferrer" className="hover:text-foreground transition">
                Visit our website
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center md:items-start gap-1 border-t border-white/5 pt-6">
          <span className="text-sm text-muted-foreground">{copyright}</span>
          <span className="text-xs text-muted-foreground">{tagline}</span>
        </div>
      </div>
    </footer>
  );
}


function Landing() {
  const { data: site } = useSite();
  return (
    <div className="min-h-screen">
      <Nav site={site} />
      <Hero site={site} />
      <Features site={site} />
      {site?.landing.show_pricing !== false && <Pricing site={site} />}
      {site?.landing.show_testimonials && <Testimonials site={site} />}
      {site?.landing.show_faq !== false && <FAQ site={site} />}
      <Footer site={site} />
    </div>
  );
}
