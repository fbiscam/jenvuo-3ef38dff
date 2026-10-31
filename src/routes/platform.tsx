import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Globe,
  Headphones,
  Image as ImageIcon,
  LineChart,
  Mail,
  MessageSquare,
  PenTool,
  Plug,
  Sparkles,
  Telescope,
  Terminal,
  UserRound,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import BlogFooter from "@/components/BlogFooter";
import openaiLogo from "@/assets/platform-logos/openai.svg";
import pythonLogo from "@/assets/platform-logos/python.svg";
import nodeLogo from "@/assets/platform-logos/nodejs.svg";
import curlLogo from "@/assets/platform-logos/curl.svg";
import langchainLogo from "@/assets/platform-logos/langchain.svg";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Jenvu API Platform — Build AI products on Jenvu" },
      {
        name: "description",
        content:
          "Build AI products on Jenvu's platform: leading models behind one OpenAI-compatible API key, pay as you go from $3 per million tokens.",
      },
      { property: "og:title", content: "Jenvu API Platform — Build AI products on Jenvu" },
      {
        property: "og:description",
        content: "Leading AI models behind one OpenAI-compatible endpoint. Pay as you go from $3 per million tokens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://jenvu.com/platform" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/platform" }],
  }),
  component: PlatformPage,
});

const SIGN_IN = "https://auth.jenvu.com/sign-in";

/* ---------- shared bits ---------- */

const pillDark =
  "inline-flex items-center gap-1.5 rounded-full bg-gc-ink px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85";
const pillLight =
  "inline-flex items-center gap-1.5 rounded-full bg-gc-surface px-5 py-2.5 text-sm font-medium text-gc-ink ring-1 ring-gc-line/60 transition-colors hover:bg-gc-panel";

function ContactSales({ className = pillDark }: { className?: string }) {
  return (
    <Link to="/contact" className={className}>
      Contact sales
    </Link>
  );
}

function StartBuilding({ className = pillLight }: { className?: string }) {
  return (
    <a href={SIGN_IN} className={className}>
      Start building <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3 text-[15px] leading-snug text-gc-ink">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 1. Hero ---------- */

function StartMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={pillLight} aria-expanded={open}>
        Start building <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 z-20 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-gc-line bg-background p-1.5 text-left shadow-xl">
          <a href={SIGN_IN} className="block rounded-xl px-3 py-2.5 text-sm hover:bg-gc-surface">
            Get an API key
          </a>
          <Link to="/docs" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-gc-surface">
            Read the docs
          </Link>
          <Link to="/pricing" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-gc-surface">
            See pricing
          </Link>
        </div>
      )}
    </div>
  );
}

const WORKS_WITH = [
  { name: "OpenAI SDK", logo: openaiLogo },
  { name: "Python", logo: pythonLogo },
  { name: "Node.js", logo: nodeLogo },
  { name: "cURL", logo: curlLogo },
  { name: "LangChain", logo: langchainLogo },
];

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 text-center sm:pt-28">
      <h1 className="mx-auto max-w-3xl text-[2.6rem] font-medium leading-[1.08] tracking-tight sm:text-6xl">
        Build leading AI products on Jenvu’s platform
      </h1>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <ContactSales />
        <StartMenu />
      </div>
      <p className="mt-24 text-xs uppercase tracking-[0.2em] text-gc-ink-muted">Works with the tools you already use</p>
      <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-12">
        {WORKS_WITH.map((w) => (
          <span key={w.name} className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-gc-ink sm:text-2xl">
            <img src={w.logo} alt="" aria-hidden="true" className="h-7 w-7 object-contain sm:h-8 sm:w-8" loading="lazy" />
            {w.name}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------- 2. Models ---------- */

const MODELS = [
  { id: "claude-opus-5", name: "Claude Opus 5", a: "Deep reasoning and long documents", b: "Code review and refactoring", img: starsNebula },
  { id: "gpt-5.5", name: "GPT-5.5", a: "Fast, all-round chat", b: "Agents and automation", img: starsPlain },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", a: "Text and image understanding", b: "Charts and screenshots", img: starsPlain },
  { id: "deepseek-v4-flash-0731", name: "DeepSeek V4", a: "Quick everyday tasks", b: "High-volume workloads", img: starsPlain },
];

function Models() {
  return (
    <section className="mx-auto max-w-[1340px] px-5 py-16 text-center sm:py-20">
      <h2 className="text-4xl font-medium tracking-tight sm:text-[3.25rem] sm:leading-tight">Powered by frontier models</h2>
      <p className="mt-5 text-[17px]">Leading models from every major lab deliver advanced intelligence behind one Jenvu API key.</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MODELS.map((m, i) => (
          <div
            key={m.id}
            className="relative flex aspect-[5/7] flex-col justify-end overflow-hidden rounded-md bg-gc-night px-7 pb-12 text-left text-gc-on-night"
          >
            <img
              src={m.img}
              alt=""
              width={768}
              height={1056}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              style={i > 0 ? { transform: `scale(${1 + i * 0.08}) rotate(${i * 90}deg)` } : undefined}
            />
            <div className="relative">
              <h3 className="text-[1.75rem] font-medium leading-tight tracking-tight">{m.name}</h3>
              <p className="mt-3 text-sm font-medium">Input: $3.00 per 1M tokens</p>
              <p className="mt-1 text-sm font-medium">Output: $3.00 per 1M tokens</p>
              <p className="mt-4 text-sm font-medium">{m.a}</p>
              <p className="mt-1 text-sm font-medium">{m.b}</p>
              <p className="mt-4 text-sm font-medium">Model ID: {m.id}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm italic">
        Pricing above is one flat rate for every model, paid from your AI credit. Learn more in the{" "}
        <Link to="/docs" className="underline underline-offset-2">
          API docs
        </Link>{" "}
        and{" "}
        <Link to="/pricing" className="underline underline-offset-2">
          Pricing
        </Link>
        .
      </p>
    </section>
  );
}

/* ---------- 3. Start building ---------- */

const GUIDES = [
  { t: "Quickstart guide", b: "Create a key and make your first request in a few minutes.", l: "View quickstart" },
  { t: "Migration support", b: "Already on the OpenAI SDK? Change the base URL and key, and keep your code.", l: "View migration guide" },
  { t: "Model best practices", b: "Pick the right model for speed, cost and quality on each task.", l: "View model guide" },
];

function StartSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 text-center">
      <h2 className="text-3xl font-medium tracking-tight">Start building with frontier models</h2>
      <div className="mt-8 flex justify-center">
        <StartBuilding />
      </div>
      <div className="mt-14 grid gap-6 text-left md:grid-cols-3">
        {GUIDES.map((g) => (
          <div key={g.t} className="flex flex-col rounded-md border border-gc-line p-6">
            <h3 className="text-xl font-medium">{g.t}</h3>
            <p className="mt-6 flex-1 text-sm leading-relaxed text-gc-ink">{g.b}</p>
            <Link
              to="/docs"
              className="mt-8 inline-flex w-fit items-center gap-1 border-b border-gc-ink pb-0.5 text-[15px] hover:opacity-70"
            >
              {g.l} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 4. All-in-one platform ---------- */

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

function AgentsSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 text-center">
      <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">The all-in-one platform for builders</h2>
      <p className="mt-5 text-gc-ink">Build apps and assistants that use your context and tools to get work done.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/docs" className={pillLight}>
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
          <h3 className="mt-5 text-xl font-medium">Build</h3>
          <p className="mt-2 text-[15px] leading-relaxed">
            Create chat apps and workflows with the OpenAI-compatible Chat Completions API you already know.
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
          <h3 className="mt-5 text-xl font-medium">Ground</h3>
          <p className="mt-2 text-[15px] leading-relaxed">
            Give models the right context: send text, documents and chart images with your prompt.
          </p>
        </div>

        <div>
          <div
            className="flex aspect-square items-center justify-center rounded-md"
            style={{ backgroundImage: "var(--platform-aurora-3)" }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Tile><MessageSquare className="h-7 w-7 text-gc-blue" /></Tile>
              <Tile><Mail className="h-7 w-7 text-gc-red" /></Tile>
              <Tile><LineChart className="h-7 w-7 text-gc-green" /></Tile>
              <Tile><Plug className="h-7 w-7" /></Tile>
            </div>
          </div>
          <h3 className="mt-5 text-xl font-medium">Act</h3>
          <p className="mt-2 text-[15px] leading-relaxed">
            Connect assistants to your Jenvu account through our MCP server so they can work with your own data.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. Bring AI experiences to life ---------- */

const CHAT = [
  { me: true, t: "Is gold above the Asia high right now?" },
  { me: false, t: "One moment, checking the session range." },
  { me: true, t: "Oh, and tell me if London swept it." },
  { me: false, t: "Sure — here’s the Asia range and whether London took it out." },
];

function useTypewriter(text: string, active: boolean, speed = 22) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!active) { setN(0); return; }
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => window.clearInterval(id);
  }, [text, active, speed]);
  return text.slice(0, n);
}

/** Chat timeline: each assistant reply shows a typing indicator first. */
const CHAT_STEPS = CHAT.flatMap((c, i) => (c.me ? [{ i, typing: false }] : [{ i, typing: true }, { i, typing: false }]));

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((d) => (
        <span key={d} className="plat-dot h-1.5 w-1.5 rounded-full bg-gc-ink-muted" style={{ animationDelay: `${d * 0.15}s` }} />
      ))}
    </span>
  );
}

function AssistantText({ text }: { text: string }) {
  const typed = useTypewriter(text, true);
  return <>{typed}</>;
}

function ChatDemo() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const last = step >= CHAT_STEPS.length - 1;
    const t = window.setTimeout(() => setStep(last ? 0 : step + 1), last ? 3200 : CHAT_STEPS[step].typing ? 1100 : 1500);
    return () => window.clearTimeout(t);
  }, [step]);
  const cur = CHAT_STEPS[step];
  const visible = CHAT.slice(0, cur.i + 1);
  return (
    <div className="flex min-h-[300px] flex-col justify-end space-y-3 sm:min-h-[340px] sm:space-y-4">
      {visible.map((c, i) => {
        const isCur = i === cur.i;
        return (
          <div key={`${i}-${step === 0 ? "a" : "b"}`} className={`plat-msg-in flex ${c.me ? "justify-start" : "justify-end"}`}>
            <div className="flex max-w-[88%] items-center gap-2.5 rounded-2xl bg-background px-3 py-2.5 text-left shadow-[0_4px_24px_-6px] shadow-gc-ink/15 sm:max-w-[80%] sm:gap-3 sm:px-4 sm:py-3">
              {c.me && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gc-blue-soft text-gc-blue sm:h-8 sm:w-8">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
              <span className="text-[13px] font-medium sm:text-sm">
                {!c.me && isCur && cur.typing ? <TypingDots /> : !c.me && isCur ? <AssistantText text={c.t} /> : c.t}
              </span>
              {!c.me && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gc-blue text-gc-on-blue sm:h-8 sm:w-8">
                  <Sparkles className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CANDLES = [
  { o: 30, c: 44 }, { o: 44, c: 38 }, { o: 38, c: 52 }, { o: 52, c: 60 }, { o: 60, c: 54 },
  { o: 54, c: 66 }, { o: 66, c: 61 }, { o: 61, c: 74 }, { o: 74, c: 70 }, { o: 70, c: 84 },
];
const VISION_REPLY = "Higher highs and higher lows — an uptrend, with one pullback candle before the last push up.";

function VisionDemo() {
  const [phase, setPhase] = React.useState(0); // 0 draw, 1 scan, 2 marks, 3 reply
  const [round, setRound] = React.useState(0);
  React.useEffect(() => {
    const d = [1300, 2600, 900, 4200][phase];
    const t = window.setTimeout(() => {
      if (phase === 3) { setPhase(0); setRound((r) => r + 1); } else setPhase(phase + 1);
    }, d);
    return () => window.clearTimeout(t);
  }, [phase]);
  const typed = useTypewriter(VISION_REPLY, phase === 3, 18);
  return (
    <div key={round} className="grid items-center gap-4 text-left sm:min-h-[340px] sm:grid-cols-[1.2fr_1fr] sm:gap-6">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gc-night p-4">
        <div className="relative flex h-full items-end gap-1.5">
          {CANDLES.map((k, i) => {
            const up = k.c >= k.o;
            const lo = Math.min(k.o, k.c);
            const hi = Math.max(k.o, k.c);
            const isMark = i === 4 || i === 9;
            return (
              <div key={i} className="relative h-full flex-1">
                <span className="absolute left-1/2 w-px -translate-x-1/2 bg-gc-ink-muted/60" style={{ bottom: `${lo - 4}%`, height: `${hi - lo + 8}%` }} />
                <span
                  className={`plat-candle-in absolute inset-x-0 rounded-sm ${up ? "bg-gc-green" : "bg-gc-red"}`}
                  style={{ bottom: `${lo}%`, height: `${Math.max(hi - lo, 3)}%`, animationDelay: `${i * 0.1}s` }}
                />
                {phase >= 2 && isMark && (
                  <span
                    className="plat-box absolute -inset-x-1.5 rounded-md border-2 border-gc-blue"
                    style={{ bottom: `${lo - 6}%`, height: `${hi - lo + 12}%`, animationDelay: i === 9 ? ".2s" : "0s" }}
                  />
                )}
              </div>
            );
          })}
          {phase === 1 && (
            <span className="plat-scan pointer-events-none absolute inset-y-0 w-0.5 bg-gc-blue shadow-[0_0_18px_4px] shadow-gc-blue/60" />
          )}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-background/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gc-on-blue">
          {phase === 0 ? "Uploading image" : phase === 1 ? "Reading chart" : "Analysed"}
        </span>
      </div>
      <div className={`rounded-2xl px-4 py-3 shadow-[0_4px_24px_-6px] shadow-gc-ink/15 transition-opacity ${phase >= 2 ? "opacity-100" : "opacity-40"}`}>
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gc-ink-muted">
          <Sparkles className="h-3 w-3" /> Assistant
        </p>
        <p className="mt-2 min-h-[4.5rem] text-[13px] leading-relaxed sm:text-sm">
          {phase < 3 ? <TypingDots /> : typed}
        </p>
      </div>
    </div>
  );
}

function ExperiencesSection() {
  const [tab, setTab] = React.useState<"chat" | "vision">("chat");
  return (
    <section className="bg-gc-surface py-16 text-center sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-5">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Bring AI experiences to life</h2>
        <div className="mt-6 inline-flex rounded-full bg-background p-1 ring-1 ring-gc-line">
          {(["chat", "vision"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium ${
                tab === k ? "bg-gc-panel text-gc-ink" : "text-gc-ink-muted hover:text-gc-ink"
              }`}
            >
              {k === "chat" ? <MessageSquare className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {k === "chat" ? "Chat" : "Vision"}
            </button>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-md text-[15px] text-gc-ink-muted">
          {tab === "chat"
            ? "Build chat experiences that answer naturally, with streaming responses."
            : "Build experiences that read charts, screenshots and documents from an image."}
        </p>

        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl bg-background text-left shadow-[0_20px_60px_-24px] shadow-gc-ink/30 ring-1 ring-gc-line">
          <div className="flex items-center gap-2 border-b border-gc-line px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gc-red/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-gc-yellow/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-gc-green/70" />
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gc-ink-muted">
              <span className="plat-dot h-1.5 w-1.5 rounded-full bg-gc-red" /> Live demo
            </span>
          </div>
          <div className="px-4 py-6 sm:px-10 sm:py-10" style={{ backgroundImage: "var(--platform-aurora-1)", backgroundSize: "cover" }}>
            <div className="rounded-xl bg-background/85 p-4 backdrop-blur sm:p-6">
              {tab === "chat" ? <ChatDemo key="chat" /> : <VisionDemo key="vision" />}
            </div>
          </div>
          <p className="px-4 py-2 text-right text-[10px] text-gc-ink-muted">Illustrative example</p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Use cases ---------- */

const USE_CASES = [
  { icon: Terminal, t: "Coding", b: "Speed up development with models that write, review, debug and refactor code.", ex: "“Refactor this function and add tests.”", g: 1 },
  { icon: Headphones, t: "Customer support", b: "Answer customer questions faster and route the hard ones to your team.", ex: "“Summarise this ticket and draft a reply.”", g: 2 },
  { icon: UserRound, t: "Personalized recommendations", b: "Suggest the right product or content for each customer.", ex: "“Recommend three plans for this user’s usage.”", g: 3 },
  { icon: Telescope, t: "Research & data analysis", b: "Turn complex data into clear insights and summaries.", ex: "“Find the trend in this CSV and explain it.”", g: 2 },
  { icon: PenTool, t: "Content generation", b: "Write product copy, articles and posts in your brand’s voice.", ex: "“Write a 100-word product description.”", g: 3 },
  { icon: BookOpen, t: "Education", b: "Build tutors and lesson tools that explain ideas step by step.", ex: "“Explain a liquidity sweep to a beginner.”", g: 1 },
];

function UseCaseCard({ u }: { u: (typeof USE_CASES)[number] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col rounded-xl bg-gc-surface p-2 text-left">
      <div
        className="flex aspect-[16/9] items-center justify-center rounded-lg"
        style={{ backgroundImage: `var(--platform-aurora-${u.g})` }}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-background text-gc-ink">
          <u.icon className="h-7 w-7" />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <h3 className="text-xl font-medium">{u.t}</h3>
        <p className="mt-2 flex-1 text-[15px] leading-relaxed text-gc-ink-muted">{u.b}</p>
        {open && <p className="mt-3 rounded-lg bg-background px-4 py-3 text-sm italic text-gc-ink-muted">{u.ex}</p>}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full bg-gc-panel py-2.5 text-sm hover:bg-gc-line/60"
        >
          {open ? "Hide example" : "View example prompt"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}

function UseCases() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 text-center">
      <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">Use cases driven by our platform</h2>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <ContactSales className={pillDark} />
        <StartBuilding className={pillLight} />
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {USE_CASES.map((u) => (
          <UseCaseCard key={u.t} u={u} />
        ))}
      </div>
    </section>
  );
}

/* ---------- 7. Enterprise-grade features ---------- */

const ENTERPRISE = [
  {
    t: "Security and data privacy",
    items: [
      "Secret API keys you can revoke any time",
      "All traffic encrypted in transit (HTTPS/TLS)",
      "Two-factor authentication for your account",
      "New-login alerts on your account",
      "Errors never expose your configuration",
    ],
  },
  {
    t: "Administrative controls",
    items: [
      "Create, name, rotate and delete keys",
      "See tokens, requests and spend per key",
      "Pay-as-you-go credit with no minimums",
    ],
  },
  {
    t: "Access to Jenvu expertise",
    items: [
      "Help center and inbox support",
      "Talk to sales about higher volumes",
      "Ask Jenvu assistant for quick answers",
    ],
  },
];

function Enterprise() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 text-center">
      <h2 className="text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
        Features for running
        <br />
        at scale
      </h2>
      <div className="mt-7 flex justify-center">
        <Link to="/docs" className={pillLight}>
          Learn more
        </Link>
      </div>
      <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
        {ENTERPRISE.map((e) => (
          <div key={e.t} className="rounded-xl border border-gc-line p-7">
            <h3 className="text-xl font-medium">{e.t}</h3>
            <Ticks items={e.items} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 8. Get started ---------- */

function GetStarted() {
  return (
    <section className="bg-gc-surface py-20 text-center">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">Get started</h2>
        <div className="mt-10 grid gap-6 text-left md:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-gc-line bg-background p-7 sm:p-8">
            <h3 className="text-2xl font-medium">Partner with us on your AI plans</h3>
            <div className="flex-1">
              <Ticks
                items={[
                  "Talk to our team about your product",
                  "Get hands-on setup guidance",
                  "Discuss volume and custom needs",
                ]}
              />
            </div>
            <div className="mt-8">
              <ContactSales className={pillDark} />
            </div>
          </div>
          <div className="flex flex-col rounded-xl border border-gc-line bg-background p-7 sm:p-8">
            <h3 className="text-2xl font-medium">Build on your own</h3>
            <div className="flex-1">
              <Ticks
                items={[
                  "Access leading models through one API",
                  "Simple pay-as-you-go pricing",
                  "Works with the OpenAI SDK",
                  "Build with our API docs and examples",
                ]}
              />
            </div>
            <div className="mt-8">
              <StartBuilding className={pillLight} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-gc-ink">
      <SiteHeader />
      <main>
        <Hero />
        <Models />
        <StartSection />
        <AgentsSection />
        <ExperiencesSection />
        <UseCases />
        <Enterprise />
        <GetStarted />
      </main>
      <BlogFooter />
    </div>
  );
}

