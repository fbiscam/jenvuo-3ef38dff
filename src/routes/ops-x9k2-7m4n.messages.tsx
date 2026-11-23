import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminMessagesPage } from "@/components/ops/admin/messages";

export const Route = createFileRoute("/ops-x9k2-7m4n/messages")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Contact Inbox" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Contact Inbox: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Contact Inbox" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Contact Inbox: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
