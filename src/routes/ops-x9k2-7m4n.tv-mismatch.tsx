import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { TvMismatchPage } from "@/components/ops/admin/tv-mismatch";

export const Route = createFileRoute("/ops-x9k2-7m4n/tv-mismatch")({
  head: () => ({
    meta: [
      { title: "Ops Console · TradingView Mismatch Checker" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsTvMismatch,
});

function OpsTvMismatch() {
  return (
    <OpsStandalone>
      <TvMismatchPage />
    </OpsStandalone>
  );
}
