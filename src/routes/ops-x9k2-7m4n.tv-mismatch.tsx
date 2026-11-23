import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { TvMismatchPage } from "@/components/ops/admin/tv-mismatch";

export const Route = createFileRoute("/ops-x9k2-7m4n/tv-mismatch")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · TradingView Mismatch Checker" },
      { name: "description", content: "Jenvu Ops Console \u00b7 TradingView Mismatch Checker: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 TradingView Mismatch Checker" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 TradingView Mismatch Checker: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
