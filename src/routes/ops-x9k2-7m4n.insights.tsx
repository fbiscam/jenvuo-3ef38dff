import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminInsightsPage } from "@/components/ops/admin/insights";

export const Route = createFileRoute("/ops-x9k2-7m4n/insights")({
  head: () => ({
    meta: [
      { title: "Ops Console · Insights Writing Desk" },
      { name: 'description', content: 'Manage Jenvu daily articles, Semrush research and publishing status.' },
      { property: 'og:title', content: 'Jenvu Insights Writing Desk' },
      { property: 'og:description', content: 'Manage researched articles and daily publishing.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
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
