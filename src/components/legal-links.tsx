import { Link } from "@tanstack/react-router";

/** Single source of truth for the legal / info links shown across the app. */
export const LEGAL_LINKS = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/subscription-policy", label: "Subscription Policy" },
  { to: "/contact", label: "Contact Us" },
  { to: "/about", label: "About Us" },
] as const;

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground ${className}`}
    >
      {LEGAL_LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="transition hover:text-foreground">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
