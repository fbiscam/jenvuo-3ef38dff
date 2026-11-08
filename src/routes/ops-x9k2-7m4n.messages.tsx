import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminMessagesPage } from "@/components/ops/admin/messages";

export const Route = createFileRoute("/ops-x9k2-7m4n/messages")({
  head: () => ({
    meta: [
      { title: "Ops Console · Contact Inbox" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsMessages,
});

function OpsMessages() {
  return (
    <OpsStandalone>
      <AdminMessagesPage />
    </OpsStandalone>
  );
}
