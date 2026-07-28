import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { useSiteSettings } from "@/hooks/use-site-settings";

const TITLE = "Contact Us — Assignmate";
const DESCRIPTION =
  "Get in touch with the Assignmate team for support, billing questions or business enquiries.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const site = useSiteSettings();
  const support = site?.general.support_email?.trim();
  const contact = site?.general.contact_email?.trim();

  return (
    <LegalPage
      title="Contact Us"
      intro="We're a small team and we read everything. Here's the fastest way to reach us."
    >
      <LegalSection heading="Support">
        <p>
          Trouble with generation, exports, or a payment that went through without activating your
          plan? Message support with your registered email and the payment reference so we can
          investigate quickly.
        </p>
        {support ? (
          <p>
            <a
              href={`mailto:${support}`}
              className="text-primary underline underline-offset-4"
            >
              {support}
            </a>
          </p>
        ) : (
          <p>Support contact details will be published here shortly.</p>
        )}
      </LegalSection>

      <LegalSection heading="Billing questions">
        <p>
          Subscriptions activate instantly after a successful payment and are non-refundable once
          active. If a payment succeeded but your plan did not activate, or you were charged twice
          by mistake, contact support and we will review it individually.
        </p>
      </LegalSection>

      <LegalSection heading="Business & partnerships">
        {contact ? (
          <p>
            <a
              href={`mailto:${contact}`}
              className="text-primary underline underline-offset-4"
            >
              {contact}
            </a>
          </p>
        ) : (
          <p>For partnership or campus enquiries, reach out through our support address.</p>
        )}
      </LegalSection>
    </LegalPage>
  );
}
