import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { TuningPage } from "@/components/ops/admin/tuning";

export const Route = createFileRoute("/ops-x9k2-7m4n/tuning")({
  head: () => ({
    meta: [
      { title: "Ops Console · Signal Weight Tuning" },
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
