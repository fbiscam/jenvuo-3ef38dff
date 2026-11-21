import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Braces, Code2, FileText, Globe, Image as ImageIcon, LineChart, Mail, MessageSquare, Plug, Sparkles } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";

/* "The all-in-one platform for builders" — shared by /platform and the homepage. */

const pillLight =
  "inline-flex items-center gap-1.5 rounded-full border border-gc-line bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";

function StartBuilding({ className = pillLight }: { className?: string }) {
  const { user } = useAuthUser();
  if (user) {
    return (
      <Link to="/dashboard/models" className={className}>
        Explore models <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    );
  }
  return (
    <Link to="/auth" search={{ mode: "signup" } as never} className={className}>
      Explore models <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

const CODE_LINES = [
  "from openai import OpenAI",
  "",
  "client = OpenAI(",
  '    base_url="https://jenvu.com/api/public/v1",',
  "    api_key=JENVU_API_KEY,",
  ")",
  "",
  "res = client.chat.completions.create(",
  '    model="gpt-5.5",',
  "    messages=[{",
  '        "role": "user",',
  '        "content": "Summarise today\'s gold sessions",',
  "    }],",
  ")",
  "print(res.choices[0].message.content)",
];

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/85 text-gc-ink shadow-lg backdrop-blur">
      {children}
    </div>
  );
}

export function AllInOnePlatformSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 text-center">
      <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">AI keys, trading code and creative tools</h2>
      <p className="mt-5 text-[18px] text-gc-ink sm:text-[19px]">Use your API key in your own software, or ask Chat for trading scripts, bot code, images, HD graphics and documents.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/docs" hash="ai-assistants" className={pillLight}>
          Learn more <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <StartBuilding className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-gc-surface" />
      </div>

      <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
        <div>
          <div
            className="relative aspect-square overflow-hidden rounded-md"
            style={{ backgroundImage: "var(--platform-aurora-1)" }}
          >
            <div className="absolute bottom-0 left-[12%] right-0 top-[12%] overflow-hidden rounded-tl-xl bg-gc-night text-gc-on-night shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-gc-night-soft px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-gc-red" />
                <span className="h-2 w-2 rounded-full bg-gc-yellow" />
                <span className="h-2 w-2 rounded-full bg-gc-green" />
                <span className="ml-3 font-mono text-[10px] text-gc-on-night-muted">app.py</span>
              </div>
              <pre className="p-3 font-mono text-[9.5px] leading-[1.55] sm:text-[10px]">
                {CODE_LINES.map((l, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-4 shrink-0 text-right text-gc-on-night-muted">{i + 1}</span>
                    <span className="whitespace-pre">{l}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
          <h3 className="mt-5 text-xl font-medium">API access</h3>
          <p className="mt-2 text-[16px] leading-relaxed">
            Call leading AI models from your own code with one OpenAI-compatible API key. Jenvu does not build or host complete apps or automated workflows.
          </p>
        </div>

        <div>
          <div
            className="flex aspect-square items-center justify-center rounded-md"
            style={{ backgroundImage: "var(--platform-aurora-2)" }}
          >
            <div className="grid grid-cols-3 gap-4">
              <Tile><Braces className="h-6 w-6" /></Tile>
              <Tile><Globe className="h-6 w-6" /></Tile>
              <Tile><Sparkles className="h-6 w-6" /></Tile>
              <Tile><FileText className="h-6 w-6" /></Tile>
              <Tile><Code2 className="h-6 w-6" /></Tile>
              <Tile><ImageIcon className="h-6 w-6" /></Tile>
            </div>
          </div>
          <h3 className="mt-5 text-xl font-medium">Chat & creative work</h3>
          <p className="mt-2 text-[16px] leading-relaxed">
            Create TradingView scripts, trading bot source code, images, HD graphics and documents. Review code and share chart images for analysis.
          </p>
        </div>

        <div>
          <div
            className="flex aspect-square items-center justify-center rounded-md"
            style={{ backgroundImage: "var(--platform-aurora-3)" }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Tile><MessageSquare className="h-7 w-7" /></Tile>
              <Tile><Mail className="h-7 w-7 text-gc-red" /></Tile>
              <Tile><LineChart className="h-7 w-7 text-gc-green" /></Tile>
              <Tile><Plug className="h-7 w-7" /></Tile>
            </div>
          </div>
          <h3 className="mt-5 text-xl font-medium">Connect your tools</h3>
          <p className="mt-2 text-[16px] leading-relaxed">
            Connect an external AI assistant to your Jenvu account through MCP for access to your own account data.
          </p>
        </div>
      </div>
    </section>
  );
}
