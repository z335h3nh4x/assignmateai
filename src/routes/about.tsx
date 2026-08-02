import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { TrustBadges } from "@/components/trust-badges";

const TITLE = "About Us — Assignmate";
const DESCRIPTION =
  "Assignmate is an AI assignment workspace built for Indian students: upload your paper, get worked solutions, and export submission-ready documents.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://assignmateai.in/about" },
    ],
    links: [{ rel: "canonical", href: "https://assignmateai.in/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <LegalPage
      title="About Us"
      intro="Assignmate is an AI-powered assignment workspace built for students who are short on time but still want to understand their work."
    >
      <LegalSection heading="What we do">
        <p>
          Upload a question paper, PDF, document or photo and Assignmate reads it, detects each
          question, and works through the answers step by step — with proper equations, tables,
          diagrams and citations — then exports a clean academic or handwritten-style document.
        </p>
      </LegalSection>

      <LegalSection heading="Who it's for">
        <p>
          School, college and university students across India who want a faster first draft,
          clearer worked solutions, and submission-ready formatting without fighting a word
          processor.
        </p>
      </LegalSection>

      <LegalSection heading="How we handle payments">
        <div className="pt-1">
          <TrustBadges className="justify-start" compact />
        </div>
      </LegalSection>
    </LegalPage>
  );
}
