import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminPromosPage } from "@/components/ops/admin/promos";

export const Route = createFileRoute("/ops-x9k2-7m4n/promos")({
  head: () => ({
    meta: [
      { title: "Ops Console · Promo codes" },
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
