import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { BugTriagePage } from "@/components/ops/admin/bugs";

export const Route = createFileRoute("/ops-x9k2-7m4n/bugs")({
  head: () => ({
    meta: [
      { title: "Ops Console · Bug Triage" },
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
