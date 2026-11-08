import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminFoundingPage } from "@/components/ops/admin/founding";

export const Route = createFileRoute("/ops-x9k2-7m4n/founding")({
  head: () => ({
    meta: [
      { title: "Ops Console · Founding Applications" },
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
