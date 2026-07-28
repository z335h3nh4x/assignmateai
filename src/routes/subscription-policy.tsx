import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

const TITLE = "Subscription Policy — Assignmate";
const DESCRIPTION =
  "How Assignmate subscriptions work: instant activation, non-refundable digital access, and how we handle failed activations or duplicate payments.";

export const Route = createFileRoute("/subscription-policy")({
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
  component: SubscriptionPolicyPage,
});

function SubscriptionPolicyPage() {
  return (
    <LegalPage
      title="Subscription Policy"
      intro="Assignmate provides digital AI-powered subscription services."
    >
      <LegalSection heading="Non-refundable digital access">
        <p>
          All subscription purchases are generally non-refundable once the subscription has
          been activated, because users receive immediate access to premium digital features.
        </p>
      </LegalSection>

      <LegalSection heading="Payment successful but subscription not activated">
        <p>
          If a payment is successful but the subscription is not activated due to a technical
          issue, users should contact our support team. We will investigate and resolve genuine
          technical problems as quickly as possible.
        </p>
      </LegalSection>

      <LegalSection heading="Duplicate or accidental payments">
        <p>
          Duplicate or accidental payments caused by a verified payment processing error may be
          reviewed individually.
        </p>
      </LegalSection>

      <LegalSection heading="Billing and renewal">
        <p>
          Subscriptions run for the billing period shown at checkout and the renewal date is
          always visible on your dashboard and settings page. You can stop future renewals at any
          time; your plan then stays active until the end of the period you have already paid for.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          Payments are processed securely by Razorpay over an encrypted checkout that supports
          UPI, cards, net banking and wallets. Assignmate never stores your card or banking
          details.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
