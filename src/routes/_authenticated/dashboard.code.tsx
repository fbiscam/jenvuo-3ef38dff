import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { CodeTabs, HELLO_SAMPLES, API_BASE } from "@/components/docs/DocsOverview";

export const Route = createFileRoute("/_authenticated/dashboard/code")({
  head: () => ({
    meta: [
      { title: "Code API · Jenvu Console" },
      { name: "description", content: "Build with Jenvu models from code: JavaScript, Python and cURL examples." },
      { property: "og:title", content: "Code API · Jenvu Console" },
      { property: "og:description", content: "Build with Jenvu models from code: JavaScript, Python and cURL examples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodePage,
});

const POINTS = ["OpenAI-compatible — keep your SDK", "One endpoint for every model", "Streaming and JSON answers"];

function CodePage() {
  return (
    <section className="mx-auto w-full min-w-0 max-w-[1100px] pb-10">
      <h1 className="text-[26px] font-medium text-foreground sm:text-[28px]">Code</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">Call Jenvu models from your own code.</p>

      <div className="console-card mt-6 grid min-w-0 gap-6 p-5 sm:mt-8 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium text-foreground">OpenAI-compatible</span>
          <h2 className="mt-3 text-[22px] font-medium text-foreground sm:text-[26px]">Jenvu Chat API</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Use your existing SDK — change only the base URL and key.</p>
          <code className="mt-3 block break-all rounded-lg border border-border px-3 py-2 font-mono text-[12.5px] text-foreground">{API_BASE}</code>
          <ul className="mt-4 space-y-2 text-[14px] text-foreground">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-muted-foreground" /> {p}</li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/dashboard/api" className="console-pill-solid">Get API key <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            <Link to="/dashboard/models" className="console-pill">View models <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        </div>
        <CodeTabs samples={HELLO_SAMPLES} />
      </div>

      <h2 className="mt-10 text-[18px] font-medium text-foreground">Next steps</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Quickstart", d: "Key, SDK and first request.", href: "/docs#quickstart" },
          { t: "Pricing", d: "Flat rate per 1M tokens.", href: "/docs#api-pricing" },
          { t: "All models", d: "Every model the API serves.", href: "/dashboard/models" },
        ].map((x) => (
          <a key={x.t} href={x.href} className="console-card flex items-start justify-between gap-3 p-4 transition hover:opacity-90">
            <span>
              <span className="block text-[15px] font-medium text-foreground">{x.t}</span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">{x.d}</span>
            </span>
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </div>
    </section>
  );
}
