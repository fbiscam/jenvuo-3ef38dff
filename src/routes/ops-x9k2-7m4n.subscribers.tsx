import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminSubscribersPage } from "@/components/ops/admin/subscribers";

export const Route = createFileRoute("/ops-x9k2-7m4n/subscribers")({
  head: () => ({
    meta: [
      { title: "Ops Console · Newsletter Subscribers" },
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
