import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { BugTriagePage } from "@/components/ops/admin/bugs";

export const Route = createFileRoute("/ops-x9k2-7m4n/bugs")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Bug Triage" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Bug Triage: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Bug Triage" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Bug Triage: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsBugs,
});

function OpsBugs() {
  return (
    <OpsStandalone>
      <BugTriagePage />
    </OpsStandalone>
  );
}
