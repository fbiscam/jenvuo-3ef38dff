import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, ArrowUpRight, Globe, Clock, File, Terminal, GitPullRequest } from "lucide-react";
import { GitHubBrand, SlackBrand } from "@/components/dashboard/CodeBrandIcons";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/code")({
  head: () => ({ meta: [
    { title: "Code API · Jenvu Console" },
    { name: "description", content: "Explore Jenvu API code review, Slack bot, REST and scheduled-task examples." },
    { property: "og:title", content: "Code API · Jenvu Console" },
    { property: "og:description", content: "Explore Jenvu API code review, Slack bot, REST and scheduled-task examples." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CodePage,
});

const EXAMPLES = {
  "Code review": {
    icon: GitHubBrand,
    file: "scripts/review.py",
    code: `import os, subprocess
from openai import OpenAI
api = OpenAI(api_key=os.environ["JENVU_API_KEY"],
    base_url="https://jenvu.com/api/public/v1")
diff = subprocess.check_output(["git", "diff", "HEAD~1"], text=True)
r = api.chat.completions.create(model="gpt-5.5", messages=[{"role": "user", "content": "Review: " + diff}])
print(r.choices[0].message.content)`,
    result: "Off-by-one in pagination: the last row is dropped on every page. Suggested fix below.",
    output: "",
  },
  "Slack bot": {
    icon: SlackBrand,
    file: "slack-bot.py",
    code: `import os; from slack_bolt import App; from openai import OpenAI
app = App(token=os.environ["SLACK_BOT_TOKEN"], signing_secret=os.environ["SLACK_SIGNING_SECRET"])
api = OpenAI(api_key=os.environ["JENVU_API_KEY"], base_url="https://jenvu.com/api/public/v1")
@app.event("app_mention")
def reply(event, say):
    say(api.chat.completions.create(model="gpt-5.5", messages=[{"role": "user", "content": event["text"]}]).choices[0].message.content)
app.start(port=3000)`,
    result: "Example Slack reply", output: "jenvu-bot\nA liquidity sweep is a move beyond a prior high or low that reverses back into the range.",
  },
  "REST API": {
    icon: Globe,
    file: "request.sh",
    code: `curl https://jenvu.com/api/public/v1/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [{"role": "user", "content": "Explain a sweep."}]
  }'`,
    result: "Example response", output: `{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "A liquidity sweep moves beyond a prior high or low before reversing."
    }
  }]
}`,
  },
  "Scheduled tasks": {
    icon: Clock,
    file: "scripts/daily-summary.py",
    code: `import os
from openai import OpenAI
api = OpenAI(api_key=os.environ["JENVU_API_KEY"],
    base_url="https://jenvu.com/api/public/v1")
notes = open("market-notes.txt").read()
r = api.chat.completions.create(model="gpt-5.5", messages=[{"role": "user", "content": "Summarize: " + notes}])
print(r.choices[0].message.content)`,
    result: "Example summary", output: "Daily market notes\n• Review the prior session's highs and lows.\n• Confirm structure from the supplied notes.\n• Check upcoming high-impact releases.",
  },
} as const;
type Tab = keyof typeof EXAMPLES;
const TABS: Tab[] = ["Code review", "Slack bot", "REST API", "Scheduled tasks"];

function CodePage() {
  const [tab, setTab] = useState<Tab>("Code review");
  const [copied, setCopied] = useState(false);
  const ex = EXAMPLES[tab];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ex.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Could not copy code"); }
  };
  return (
    <section className="code-api-page mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <h1 className="text-[28px] font-normal">Code API</h1>
      <div className="code-api-banner mt-10 flex flex-col justify-between gap-6 p-7 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-3"><h2 className="text-xl font-medium">GPT-5.5</h2><span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Coding</span></div>
          <p className="mt-5 max-w-[600px] text-sm leading-relaxed">Code review, trading scripts and real-world knowledge work with the Jenvu API.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full text-xs font-normal"><Link to="/dashboard/chat">Try Playground</Link></Button>
          <Button asChild className="rounded-full text-xs"><Link to="/dashboard/api">Get API Key</Link></Button>
        </div>
      </div>
      <h2 className="mt-14 text-base font-medium">API Usage Examples</h2>
      <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="API usage examples">
        {TABS.map((t) => {
          const Icon = EXAMPLES[t].icon;
          return <Button key={t} type="button" role="tab" id={`tab-${t.replaceAll(' ', '-')}`} aria-controls="code-example" aria-selected={t === tab} variant={t === tab ? "secondary" : "ghost"} className={`rounded-full text-sm font-normal ${t === tab ? "text-foreground" : "text-muted-foreground"}`} onClick={() => { setTab(t); setCopied(false); }}><Icon />{t}</Button>;
        })}
      </div>
      <div id="code-example" role="tabpanel" aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`} className="code-api-workspace mt-4 grid min-w-0 gap-2 p-2 lg:grid-cols-2">
        <div className="code-api-setup min-w-0 p-3">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Setup</span><Button variant="ghost" size="icon-sm" aria-label={copied ? "Code copied" : "Copy code"} title={copied ? "Copied" : "Copy code"} onClick={() => void copy()}>{copied ? <Check /> : <Copy />}</Button></div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><File className="h-3.5 w-3.5 shrink-0" /><span className="break-all font-code">{ex.file}</span></div>
          <div className="code-box mt-4 max-h-[150px] overflow-y-auto overflow-x-hidden"><pre className="whitespace-pre-wrap break-words font-code text-[11px] leading-[1.7] [overflow-wrap:anywhere]"><code>{highlight(ex.code)}</code></pre></div>
          <Button asChild variant="link" className="mt-3 h-auto p-0 text-xs font-normal text-muted-foreground"><Link to="/docs"><Terminal />Read API docs<ArrowUpRight /></Link></Button>
        </div>
        <div className="min-w-0 p-4">
          <div className="text-xs text-muted-foreground">Result <span className="ml-1">· Example</span></div>
          {tab === "Code review" ? <>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm"><GitPullRequest className="h-4 w-4" />jenvu-review-bot <span className="text-muted-foreground">requested changes</span></p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{ex.result}</p>
            <div className="code-api-diff mt-5 p-3 font-code text-xs"><p className="mb-2 break-all">Edit <span className="text-muted-foreground">src/api/pagination.ts:41</span></p><pre className="whitespace-pre-wrap break-words leading-relaxed"><code><span className="code-api-diff-remove block">- const end = start + pageSize - 1;</span><span className="code-api-diff-add block">+ const end = start + pageSize;</span></code></pre></div>
          </> : <><p className="mt-4 text-sm font-medium">{ex.result}</p><pre className="mt-5 whitespace-pre-wrap break-words font-code text-xs leading-relaxed text-muted-foreground">{ex.output}</pre></>}
        </div>
      </div>
    </section>
  );
}
