import { useState, type ReactNode } from "react";
import { Check, Copy, X, Terminal, FileText } from "lucide-react";

const API_BASE = "https://jenvu.com/api/public/v1";
const SAMPLE_MODEL = "claude-opus-5";
const LISTED_MODELS = ["claude-opus-5", "gpt-5.5", "deepseek-v3.2", "glm-5"];

const k = (t: string) => <span className="tok-keyword">{t}</span>;
const f = (t: string) => <span className="tok-func">{t}</span>;
const s = (t: string) => <span className="tok-string">{t}</span>;
const v = (t: string) => <span className="tok-var">{t}</span>;
const c = (t: string) => <span className="tok-const">{t}</span>;
const cm = (t: string) => <span className="tok-comment">{t}</span>;

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1500);
    } catch { /* clipboard blocked */ }
  };
  return { copied, copy };
}

function CopyButton({ text, id, copied, onCopy }: { text: string; id: string; copied: string | null; onCopy: (t: string, id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(text, id)}
      className="code-box-copy inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] transition-colors"
      aria-label="Copy"
    >
      {copied === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied === id ? "Copied" : "Copy"}
    </button>
  );
}

function CodeCard({ label, text, id, children, copied, onCopy }: { label: string; text: string; id: string; children: ReactNode; copied: string | null; onCopy: (t: string, id: string) => void }) {
  return (
    <div className="code-box overflow-hidden rounded-xl">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="code-box-copy text-[12.5px] font-medium uppercase tracking-wide">{label}</span>
        <CopyButton text={text} id={id} copied={copied} onCopy={onCopy} />
      </div>
      <pre className="overflow-x-auto px-4 pb-4 pt-2 font-mono text-[13.5px] leading-[1.75]">{children}</pre>
    </div>
  );
}

function PanelShell({ icon, title, badge, onClose, children }: { icon: ReactNode; title: string; badge?: string; onClose: () => void; children: ReactNode }) {
  return (
    <section className="console-card mt-6 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="console-icon-chip">{icon}</span>
          <h2 className="text-[17px] font-medium text-foreground">{title}</h2>
          {badge && <span className="console-badge">{badge}</span>}
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  );
}

export function EndpointPanel({ onClose }: { onClose: () => void }) {
  const { copied, copy } = useCopy();
  const url = `${API_BASE}/chat/completions`;
  const curlText = `curl ${url} \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${SAMPLE_MODEL}",
    "messages": [
      { "role": "user", "content": "XAU/USD bias today?" }
    ]
  }'`;
  return (
    <PanelShell icon={<Terminal className="h-4 w-4" />} title="API endpoint" badge="OpenAI-compatible" onClose={onClose}>
      <p className="mt-4 max-w-[760px] text-[15px] leading-relaxed text-muted-foreground">
        Use your key anywhere — Claude Desktop, scripts, or any OpenAI-compatible client. Usage counts against your
        plan&apos;s daily token limit and shows on the Usage page.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-background px-3 py-2.5">
        <span className="rounded-md bg-foreground px-2 py-0.5 font-mono text-[12.5px] font-semibold text-background">POST</span>
        <code className="min-w-0 flex-1 truncate font-mono text-[14px] text-foreground">{url}</code>
        <button
          type="button"
          onClick={() => copy(url, "endpoint")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied === "endpoint" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === "endpoint" ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4">
        <CodeCard label="cURL" text={curlText} id="curl" copied={copied} onCopy={copy}>
          {f("curl")} {s(url)} {"\\"}{"\n"}
          {"  "}{k("-H")} {s('"Authorization: Bearer ')}{v("$JENVU_API_KEY")}{s('"')} {"\\"}{"\n"}
          {"  "}{k("-H")} {s('"Content-Type: application/json"')} {"\\"}{"\n"}
          {"  "}{k("-d")} {s("'{")}{"\n"}
          {"    "}{c('"model"')}: {s(`"${SAMPLE_MODEL}"`)},{"\n"}
          {"    "}{c('"messages"')}: [{"\n"}
          {"      "}{"{ "}{c('"role"')}: {s('"user"')}, {c('"content"')}: {s('"XAU/USD bias today?"')}{" }"}{"\n"}
          {"    "}]{"\n"}
          {"  "}{s("}'")}
        </CodeCard>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
        Models include{" "}
        {LISTED_MODELS.map((m, i) => (
          <span key={m}>
            <code className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[13px] text-foreground">{m}</code>
            {i < LISTED_MODELS.length - 1 ? " " : ""}
          </span>
        ))}
        {" "}— see the full list at{" "}
        <code className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[13px] text-foreground">{API_BASE}/models</code>.
      </p>
    </PanelShell>
  );
}

export function QuickstartPanel({ origin, onClose }: { origin: string; onClose: () => void }) {
  const { copied, copy } = useCopy();
  const verify = `${origin}/api/public/extension/verify`;
  const analyze = `${origin}/api/public/extension/analyze`;
  const text = `# Check your key
curl -X POST ${verify} \\
  -H "Authorization: Bearer $JENVU_API_KEY"

# Run a market analysis
curl -X POST ${analyze} \\
  -H "Authorization: Bearer $JENVU_API_KEY"`;
  const steps = [
    "Create an API key above and copy it — it is shown only once.",
    <>Send it in every request as <code className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[13px] text-foreground">Authorization: Bearer &lt;your key&gt;</code>.</>,
    "Call the endpoints below from your own tools or scripts.",
  ];
  return (
    <PanelShell icon={<FileText className="h-4 w-4" />} title="API quickstart" onClose={onClose}>
      <p className="mt-4 max-w-[760px] text-[15px] leading-relaxed text-muted-foreground">
        You pay only for the tokens actually processed, at $3 per 1,000,000 tokens. Your wallet balance and your
        plan&apos;s daily limit apply to chat and market analysis.
      </p>
      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[12.5px] font-semibold text-background">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5">
        <CodeCard label="Endpoints" text={text} id="quickstart" copied={copied} onCopy={copy}>
          {cm("# Check your key")}{"\n"}
          {f("curl")} {k("-X")} {c("POST")} {s(verify)} {"\\"}{"\n"}
          {"  "}{k("-H")} {s('"Authorization: Bearer ')}{v("$JENVU_API_KEY")}{s('"')}{"\n"}
          {"\n"}
          {cm("# Run a market analysis")}{"\n"}
          {f("curl")} {k("-X")} {c("POST")} {s(analyze)} {"\\"}{"\n"}
          {"  "}{k("-H")} {s('"Authorization: Bearer ')}{v("$JENVU_API_KEY")}{s('"')}
        </CodeCard>
      </div>
    </PanelShell>
  );
}
