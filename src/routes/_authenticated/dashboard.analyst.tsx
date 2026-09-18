import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/analyst")({
  head: () => ({
    meta: [
      { title: "AI Analyst — Jenvu" },
      {
        name: "description",
        content:
          "Run the full Jenvu XAU/USD ICT/SMC analyst inside the dashboard — screen share, chart uploads and trade plans without installing the browser extension.",
      },
      { property: "og:title", content: "AI Analyst — Jenvu" },
      {
        property: "og:description",
        content:
          "The Jenvu gold analyst, available directly on the web dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalystPage,
});

function AnalystPage() {
  const [nonce, setNonce] = useState(0);

  return (
    <div className="w-full bg-white">
      <div className="w-full overflow-hidden bg-white">
        <iframe
          key={nonce}
          title="Jenvu AI Analyst"
          src="/analyst/sidepanel.html"
          allow="display-capture; clipboard-write"
          className="block h-[calc(100vh-120px)] min-h-[620px] w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
