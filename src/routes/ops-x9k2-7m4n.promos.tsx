import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminPromosPage } from "@/components/ops/admin/promos";

export const Route = createFileRoute("/ops-x9k2-7m4n/promos")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Promo codes" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Promo codes: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Promo codes" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Promo codes: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsPromos,
});

function OpsPromos() {
  return (
    <OpsStandalone>
      <AdminPromosPage />
    </OpsStandalone>
  );
}
