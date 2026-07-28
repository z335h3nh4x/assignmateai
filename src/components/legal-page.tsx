import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LegalLinks } from "@/components/legal-links";

/** Shared shell for the public legal / information pages. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4 px-4 py-5">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo size="h-6" imgMaxWidth="max-w-[120px]" showName={false} />
            <span className="text-sm text-muted-foreground">Assignmate</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        {intro && <p className="mt-4 text-muted-foreground">{intro}</p>}
        <div className="mt-10 space-y-8">{children}</div>
      </main>

      <footer className="border-t border-white/5 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <LegalLinks className="justify-center md:justify-start" />
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl border border-white/10 p-6">
      <h2 className="font-display text-xl font-semibold">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
