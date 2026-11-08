import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminEmailsPage, emailsSearch } from "@/components/ops/admin/emails";

export const Route = createFileRoute("/ops-x9k2-7m4n/emails")({
  validateSearch: (s) => emailsSearch.parse(s),
  head: () => ({
    meta: [
      { title: "Ops Console · Email box" },
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
