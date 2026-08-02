import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

const TITLE = "Privacy Policy — Assignmate";
const DESCRIPTION =
  "What data Assignmate collects, how your assignments and uploads are used, and the choices you have over your information.";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://assignmateai.in/privacy-policy" },
    ],
    links: [{ rel: "canonical", href: "https://assignmateai.in/privacy-policy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This page explains what Assignmate collects and how that information is used. It is maintained by the Assignmate team and updated as the product changes."
    >
      <LegalSection heading="What we collect">
        <p>
          Account details such as your name, email address and sign-in method; the assignments,
          prompts, uploaded files and reference links you submit; and basic usage records such as
          how many assignments and credits you have used in the current billing cycle.
        </p>
      </LegalSection>

      <LegalSection heading="How your content is used">
        <p>
          Your assignment content and uploads are used to generate your results and to show you
          your own history. Content is sent to our AI provider only to produce the output you
          requested.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          Payments are handled by Razorpay. Card, UPI and banking details are entered on
          Razorpay's encrypted checkout and are never stored by Assignmate. We keep only the
          payment reference, amount, plan and status needed to activate and support your
          subscription.
        </p>
      </LegalSection>

      <LegalSection heading="Access and security">
        <p>
          Your assignments, usage and billing records are private to your account and protected by
          database-level access rules. Administrators can access account and assignment records
          only for support and moderation.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices">
        <p>
          You can edit or delete your assignments at any time from your history, and update your
          profile from settings. To request deletion of your account and associated data, contact
          us via the{" "}
          <Link to="/contact" className="text-primary underline underline-offset-4">
            Contact Us
          </Link>{" "}
          page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
