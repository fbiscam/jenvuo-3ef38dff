import { createFileRoute } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — JENVU AI" },
      { name: "description", content: "The terms that govern your use of JENVU AI." },
      { property: "og:title", content: "Terms of Use — JENVU AI" },
      { property: "og:url", content: "https://jenvu.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Use"
      intro="By accessing or using JENVU AI you agree to the following terms. Please read them carefully."
    >
      <section className="space-y-3">
        <H2>1. Eligibility</H2>
        <P>
          You must be at least 18 years old and legally able to enter binding contracts in
          your jurisdiction to use the product.
        </P>
      </section>
      <section className="space-y-3">
        <H2>2. Acceptable Use</H2>
        <UL>
          <li>No reverse engineering, scraping at scale, or circumventing rate limits.</li>
          <li>No use for unlawful activity, market manipulation, or harassment.</li>
          <li>No attempts to extract proprietary prompts, models, or system instructions.</li>
        </UL>
      </section>
      <section className="space-y-3">
        <H2>3. Accounts</H2>
        <P>
          You are responsible for safeguarding your credentials and for all activity that
          occurs under your account. Notify us immediately of unauthorized access.
        </P>
      </section>
      <section className="space-y-3">
        <H2>4. Intellectual Property</H2>
        <P>
          JENVU AI, its branding, software, models, and content are owned by JENVU or its
          licensors. You retain ownership of content you submit, and grant us a limited
          license to process it solely to deliver the service.
        </P>
      </section>
      <section className="space-y-3">
        <H2>5. No Financial Advice</H2>
        <P>
          JENVU AI produces educational analysis and informational trade ideas — not
          investment, legal, tax, or financial advice. See the Disclaimer for full detail.
        </P>
      </section>
      <section className="space-y-3">
        <H2>6. Termination</H2>
        <P>
          We may suspend or terminate access for breach of these terms or to protect the
          integrity of the service. You may stop using JENVU AI at any time.
        </P>
      </section>
      <section className="space-y-3">
        <H2>7. Limitation of Liability</H2>
        <P>
          To the maximum extent permitted by law, JENVU AI is provided "as is" without
          warranties of any kind, and we are not liable for indirect, incidental, or
          consequential damages including trading losses.
        </P>
      </section>
      <section className="space-y-3">
        <H2>8. Governing Law</H2>
        <P>
          These terms are governed by the laws of the jurisdiction in which JENVU operates,
          without regard to conflict-of-law principles.
        </P>
      </section>
    </PageShell>
  );
}
