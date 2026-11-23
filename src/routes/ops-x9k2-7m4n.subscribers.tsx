import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminSubscribersPage } from "@/components/ops/admin/subscribers";

export const Route = createFileRoute("/ops-x9k2-7m4n/subscribers")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Newsletter Subscribers" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Newsletter Subscribers: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Newsletter Subscribers" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Newsletter Subscribers: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsSubscribers,
});

function OpsSubscribers() {
  return (
    <OpsStandalone>
      <AdminSubscribersPage />
    </OpsStandalone>
  );
}
