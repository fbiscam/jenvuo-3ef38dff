import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminFoundingPage } from "@/components/ops/admin/founding";

export const Route = createFileRoute("/ops-x9k2-7m4n/founding")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Founding Applications" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Founding Applications: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Founding Applications" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Founding Applications: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsFounding,
});

function OpsFounding() {
  return (
    <OpsStandalone>
      <AdminFoundingPage />
    </OpsStandalone>
  );
}
