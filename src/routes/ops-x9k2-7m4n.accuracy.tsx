import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AccuracyPage } from "@/components/ops/admin/accuracy";

export const Route = createFileRoute("/ops-x9k2-7m4n/accuracy")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Signal Accuracy" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Signal Accuracy: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Signal Accuracy" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Signal Accuracy: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsAccuracy,
});

function OpsAccuracy() {
  return (
    <OpsStandalone>
      <AccuracyPage />
    </OpsStandalone>
  );
}
