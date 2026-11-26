import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Copy, Check, Globe, File, GitPullRequest } from "lucide-react";
import { GitHubBrand, SlackBrand } from "@/components/dashboard/CodeBrandIcons";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { PlatformLogo } from "@/components/brand/ProductLogos";

const BASE = "https://jenvu.com/api/public/v1";

import openaiLogo from "@/assets/platform-logos/openai.svg";
import pythonLogo from "@/assets/platform-logos/python.svg";
import nodeLogo from "@/assets/platform-logos/nodejs.svg";
import curlLogo from "@/assets/platform-logos/curl.svg";
import langchainLogo from "@/assets/platform-logos/langchain.svg";

/** Same logo row as the Platform page. */
const WORKS_WITH = [
  { name: "OpenAI SDK", logo: openaiLogo },
  { name: "Python", logo: pythonLogo },
  { name: "Node.js", logo: nodeLogo },
  { name: "cURL", logo: curlLogo },
  { name: "LangChain", logo: langchainLogo },
];

const MINI = {
  "Code review": { icon: GitHubBrand, file: "review.py", code: `from openai import OpenAI
api = OpenAI(base_url="${BASE}")
r = api.chat.completions.create(model="gpt-5.5",
  messages=[{"role": "user", "content": "Review: " + diff}])
print(r.choices[0].message.content)` },
  "Slack bot": { icon: SlackBrand, file: "slack-bot.py", code: `@app.event("app_mention")
def reply(event, say):
  r = api.chat.completions.create(model="gpt-5.5",
    messages=[{"role": "user", "content": event["text"]}])
  say(r.choices[0].message.content)` },
  "REST API": { icon: Globe, file: "request.sh", code: `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -d '{"model": "gpt-5.5", "messages":
    [{"role": "user", "content": "Explain a sweep."}]}'` },
} as const;
type MiniTab = keyof typeof MINI;

function QuickstartCard({ hasKeys }: { hasKeys: boolean }) {
  const [tab, setTab] = useState<MiniTab>("Code review");
  const [copied, setCopied] = useState(false);
  const ex = MINI[tab];
  const copy = () => {
    void navigator.clipboard?.writeText(ex.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="console-card flex min-h-[184px] min-w-0 flex-col p-3">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Code examples">
        {(Object.keys(MINI) as MiniTab[]).map((t) => { const Icon = MINI[t].icon; return (
          <button key={t} type="button" role="tab" aria-selected={t === tab} onClick={() => { setTab(t); setCopied(false); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition [&_svg]:h-3.5 [&_svg]:w-3.5 ${t === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon />{t}
          </button>); })}
      </div>
      <div className="code-api-workspace mt-2 grid min-w-0 flex-1 grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-[1.4fr_1fr]">
        <div className="code-api-setup min-w-0 p-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5"><File className="h-3 w-3 shrink-0" /><span className="truncate font-code">{ex.file}</span></span>
            <button type="button" onClick={copy} aria-label="Copy code" className="rounded-full p-1 hover:text-foreground">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
          <pre className="code-box mt-1.5 rounded-md p-2 whitespace-pre-wrap break-words font-code text-[11px] leading-[1.6] [overflow-wrap:anywhere]"><code>{highlight(ex.code)}</code></pre>
        </div>
        <div className="min-w-0 p-2.5 text-[12px]">
          <p className="text-[11px] text-muted-foreground">Result · Example</p>
          {tab === "Code review" ? <>
            <p className="mt-2 flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5" />requested changes</p>
            <div className="code-api-diff mt-2 p-2 font-code text-[11px]"><span className="code-api-diff-remove block">- end = start + size - 1</span><span className="code-api-diff-add block">+ end = start + size</span></div>
          </> : <p className="mt-2 leading-relaxed text-muted-foreground">A liquidity sweep moves beyond a prior high or low, then reverses back into the range.</p>}
        </div>
      </div>
      <div className="mt-2 whitespace-nowrap px-1 text-[13px] text-muted-foreground">
        {hasKeys ? <span title="Use one of your active keys as JENVU_API_KEY.">Use JENVU_API_KEY In Your Code.</span> : <Link to="/dashboard/api" className="font-medium text-foreground underline-offset-4 hover:underline">Generate API key →</Link>}
        {" · "}<Link to="/dashboard/code" className="underline-offset-4 hover:underline">More examples</Link>
      </div>
    </div>
  );
}

/** xAI console-style dashboard home: welcome line, two start cards, product grid. */
export default function ConsoleWelcome({ name: profileName, keysCount }: { name?: string; keysCount: number | null }) {
  const { user } = useAuthUser();
  const credits = useCredits();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(profileName?.trim() || meta.full_name || meta.name || user?.email?.split("@")[0] || "trader").split(" ")[0];
  const balance = credits.balance || 0;
  const hasKeys = (keysCount ?? 0) > 0;

  return (
    <section className="console-home mx-auto mb-10 w-full max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">Welcome, {name}</h1>
        <Link to="/dashboard/api" className="console-pill console-pill-white">
          <Plus className="h-4 w-4" aria-hidden="true" /> Create API key
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="console-card flex min-h-[184px] min-w-0 flex-col p-6">
          <div className="flex items-center gap-3">
            <PlatformLogo framed className="h-9 w-9" />
            <div>
              <p className="text-[16px] font-medium text-foreground">API credit</p>
              <p className="text-[13px] text-muted-foreground">Balance</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-[40px] font-medium leading-none tracking-tight tabular-nums text-foreground">
              {credits.isLoading ? "—" : `$${balance.toFixed(2)}`}
            </p>
            <Link to="/dashboard/pay" className="console-pill console-pill-white">Upgrade plan</Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[14px]">
            <span className="text-muted-foreground">{hasKeys ? `You have ${keysCount} API key${keysCount === 1 ? "" : "s"}` : "Create your first API Key"}</span>
            <Link to="/dashboard/api" className="font-medium text-foreground underline-offset-4 hover:underline">{hasKeys ? "Manage API keys →" : "Create API key →"}</Link>
          </div>
          <div className="mt-7 grid grid-cols-5 items-center gap-1 border-t border-border pt-5" aria-label="Compatible developer tools">
            {WORKS_WITH.map((w) => (
              <span key={w.name} className="flex min-w-0 flex-col items-center gap-1.5 whitespace-nowrap text-[9px] font-medium text-foreground sm:text-[11px]">
                <img src={w.logo} alt="" aria-hidden="true" className="h-5 w-5 object-contain sm:h-6 sm:w-6" loading="lazy" />
                {w.name}
              </span>
            ))}
          </div>
        </div>

        <QuickstartCard hasKeys={hasKeys} />
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { t: "Developer quickstart", d: "Generate an active key and run your first request without any delays.", l: "Explore docs", to: "/docs" },
          { t: "Workflow scripts", d: "Need rapid market signals? Run custom trading scripts directly through our fast API .", l: "Open code studio", to: "/dashboard/code" },
          { t: "Market model intelligence", d: "Choose the optimal intelligence engine for accurate analysis, speed and low latency.", l: "Browse model catalog", to: "/models" },
        ].map((c) => (
          <div key={c.t} className="flex min-h-[200px] min-w-0 flex-col rounded-[8px] border border-border bg-background p-6">
            <p className="text-[16px] font-medium text-foreground">{c.t}</p>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted-foreground">{c.d}</p>
            <Link to={c.to} className="mt-5 w-fit text-[14px] font-medium text-foreground underline underline-offset-8">{c.l} ↗</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
