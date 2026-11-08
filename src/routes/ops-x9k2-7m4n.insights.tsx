import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminInsightsPage } from "@/components/ops/admin/insights";

export const Route = createFileRoute("/ops-x9k2-7m4n/insights")({
  head: () => ({
    meta: [
      { title: "Ops Console · Insights Writing Desk" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsInsights,
});

function OpsInsights() {
  return (
    <OpsStandalone>
      <AdminInsightsPage />
    </OpsStandalone>
  );
}
