import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminEmailsPage, emailsSearch } from "@/components/ops/admin/emails";

export const Route = createFileRoute("/ops-x9k2-7m4n/emails")({
  validateSearch: (s) => emailsSearch.parse(s),
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Email box" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Email box: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Email box" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Email box: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsEmails,
});

function OpsEmails() {
  const params = Route.useSearch();
  return (
    <OpsStandalone>
      <AdminEmailsPage params={params} />
    </OpsStandalone>
  );
}
