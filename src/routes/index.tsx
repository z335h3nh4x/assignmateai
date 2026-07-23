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

const PLANS = [
  { name: "Free", price: "$0", tag: "Try it out", features: ["5 assignments / month", "Up to 1,000 words", "PDF & DOCX export"], cta: "Start free", featured: false },
  { name: "Pro", price: "$12", tag: "Most popular", features: ["Unlimited assignments", "Up to 4,000 words", "All writing styles", "Priority speed"], cta: "Go Pro", featured: true },
  { name: "Campus", price: "$29", tag: "Power users", features: ["Everything in Pro", "Team seats", "Advanced references", "Early features"], cta: "Contact us", featured: false },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Simple, student-friendly <span className="gradient-text">pricing</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Cancel anytime. No credit card required to start.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              className={`glass rounded-2xl p-8 relative ${p.featured ? "ring-1 ring-primary glow" : ""}`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full gradient-bg text-white font-medium">
                  {p.tag}
                </span>
              )}
              <p className="text-sm text-muted-foreground">{p.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold font-display">{p.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
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
                  p.featured ? "gradient-bg text-white glow" : "glass hover:bg-white/10"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
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
