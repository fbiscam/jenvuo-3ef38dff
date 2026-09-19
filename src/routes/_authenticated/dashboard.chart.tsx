import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const ChartMarkingStudio = lazy(() => import("@/components/ChartMarkingStudio"));

export const Route = createFileRoute("/_authenticated/dashboard/chart")({
  component: ChartPage,
  head: () => ({
    meta: [
      { title: "AI Chart Marking — Jenvu XAU/USD" },
      {
        name: "description",
        content:
          "Live XAU/USD chart where Jenvu marks liquidity, order blocks, FVG, structure and trade levels on request.",
      },
      { property: "og:title", content: "AI Chart Marking — Jenvu XAU/USD" },
      {
        property: "og:description",
        content:
          "Ask Jenvu to mark liquidity, order blocks, FVG, BOS/CHoCH and entry levels on a live XAU/USD chart.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ChartPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">AI Chart</h1>
        <p className="text-sm text-muted-foreground">
          Live XAU/USD chart. Jo mark karwana ho likhein — Jenvu wahi marking chart par lagayega.
        </p>
      </div>
      {mounted ? (
        <Suspense
          fallback={
            <div className="flex h-[520px] items-center justify-center rounded-xl border text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chart load ho raha hai…
            </div>
          }
        >
          <ChartMarkingStudio />
        </Suspense>
      ) : (
        <div className="h-[520px] rounded-xl border" />
      )}
    </div>
  );
}
