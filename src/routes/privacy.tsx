import { createFileRoute } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — JENVU AI" },
      { name: "description", content: "How JENVU AI collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — JENVU AI" },
      { property: "og:url", content: "https://jenvu.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This page is maintained by the JENVU AI team to explain what data the product handles, how it is used, and the choices available to you."
    >
      <section className="space-y-3">
        <H2>1. Information We Collect</H2>
        <P>
          When you use JENVU AI we may process: account details (email, display name), voice
          transcripts captured while the microphone is active, text prompts you submit, and
          usage telemetry such as routes visited and feature events. We do not record continuous
          background audio — capture only runs while you have explicitly activated the agent.
        </P>
      </section>

      <section className="space-y-3">
        <H2>2. How We Use It</H2>
        <UL>
          <li>To generate market analysis, voice responses, and trade setups you request.</li>
          <li>To maintain authentication, session state, and personal preferences.</li>
          <li>To improve product quality through aggregate, de-identified analytics.</li>
          <li>To detect abuse, fraud, and to comply with applicable legal obligations.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>3. Third-Party Processors</H2>
        <P>
          JENVU AI relies on infrastructure and AI inference providers (including managed
          cloud backends and large-language-model gateways) to deliver core functionality.
          These processors handle data strictly to perform the services we request and are
          bound by their own contractual safeguards.
        </P>
      </section>

      <section className="space-y-3">
        <H2>4. Data Retention</H2>
        <P>
          Account and session data are retained while your account remains active. You may
          request deletion of your account and associated personal data at any time by
          contacting support. Aggregated, non-identifiable analytics may be retained longer.
        </P>
      </section>

      <section className="space-y-3">
        <H2>5. Your Rights</H2>
        <P>
          Depending on your jurisdiction you may have rights to access, correct, export, or
          delete personal data we hold about you, and to object to certain processing. To
          exercise these rights, contact us via the address listed in the footer.
        </P>
      </section>

      <section className="space-y-3">
        <H2>6. Security</H2>
        <P>
          We apply industry-standard transport encryption and access controls. No internet
          service can be guaranteed 100% secure, so we encourage strong, unique passwords and
          immediate reporting of suspected compromise.
        </P>
      </section>

      <section className="space-y-3">
        <H2>7. Changes</H2>
        <P>
          We may update this policy as the product evolves. Material changes will be surfaced
          in-app or via email where appropriate.
        </P>
      </section>
    </PageShell>
  );
}
