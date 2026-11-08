import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AccuracyPage } from "@/components/ops/admin/accuracy";

export const Route = createFileRoute("/ops-x9k2-7m4n/accuracy")({
  head: () => ({
    meta: [
      { title: "Ops Console · Signal Accuracy" },
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
