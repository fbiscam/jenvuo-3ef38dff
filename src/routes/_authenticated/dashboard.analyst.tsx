import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, ExternalLink, RefreshCw } from "lucide-react";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white">
            <Bot className="h-5 w-5 text-zinc-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">AI Analyst</h1>
            <p className="text-sm text-zinc-500">
              Same experience as the browser extension — chat, share your screen and get
              ICT/SMC trade plans right here.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className="h-4 w-4" /> Restart
          </button>
          <a
            href="/analyst/sidepanel.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ExternalLink className="h-4 w-4" /> Open full screen
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <iframe
          key={nonce}
          title="Jenvu AI Analyst"
          src="/analyst/sidepanel.html"
          allow="display-capture; clipboard-write"
          className="block h-[calc(100vh-230px)] min-h-[560px] w-full border-0"
        />
      </div>
    </div>
  );
}
