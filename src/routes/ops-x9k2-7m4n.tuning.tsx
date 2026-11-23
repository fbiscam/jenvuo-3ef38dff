import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { TuningPage } from "@/components/ops/admin/tuning";

export const Route = createFileRoute("/ops-x9k2-7m4n/tuning")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Signal Weight Tuning" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Signal Weight Tuning: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Signal Weight Tuning" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Signal Weight Tuning: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsTuning,
});

function OpsTuning() {
  return (
    <OpsStandalone>
      <TuningPage />
    </OpsStandalone>
  );
}
