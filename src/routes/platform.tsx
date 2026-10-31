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
import starsNebula from "@/assets/platform/stars-nebula.jpg";
import starsPlain from "@/assets/platform/stars-plain.jpg";
import avatarUser from "@/assets/platform/avatar-user.jpg";

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
              style={{ transform: ["none", "none", "rotate(180deg)", "scaleX(-1)"][i] }}
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
  { me: false, t: "One moment, I’m pulling that up." },
  { me: true, t: "Oh, and did London sweep it?" },
  { me: false, t: "Yes. London took the Asia high, then closed back below it." },
  { me: true, t: "Great, set an alert for the next retest." },
  { me: false, t: "Done. I’ll ping you when price comes back to it." },
];

const VISION_REPLY = "Higher highs and higher lows, so it’s an uptrend, with one pullback before the last push up.";

const CANDLES = [
  { o: 30, c: 44 }, { o: 44, c: 38 }, { o: 38, c: 52 }, { o: 52, c: 60 }, { o: 60, c: 54 },
  { o: 54, c: 66 }, { o: 66, c: 61 }, { o: 61, c: 74 }, { o: 74, c: 70 }, { o: 70, c: 84 },
];

function useTypewriter(text: string, active: boolean, speed = 22) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    setN(0);
    if (!active) return;
    const id = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => window.clearInterval(id);
  }, [text, active, speed]);
  return text.slice(0, n);
}

const WAVE = [30, 65, 100, 55, 85, 40, 70];

/** Small voice-style waveform; bars move only while that bubble is "speaking". */
function Wave({ live, tone }: { live: boolean; tone: "user" | "ai" }) {
  return (
    <span className={`flex h-6 shrink-0 items-center gap-[2px] ${live ? "" : "opacity-40"}`} aria-hidden>
      {WAVE.map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full ${tone === "user" ? "bg-gc-blue/50" : "bg-gc-red/45"} ${live ? "plat-wave" : ""}`}
          style={{ height: `${h}%`, animationDelay: `${i * 0.09}s` }}
        />
      ))}
    </span>
  );
}

function Avatar() {
  return <img src={avatarUser} alt="" width={64} height={64} loading="lazy" className="h-8 w-8 shrink-0 rounded-md object-cover sm:h-9 sm:w-9" />;
}

function AiBadge() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gc-blue text-gc-on-blue sm:h-9 sm:w-9">
      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
    </span>
  );
}

function Bubble({ me, live, children }: { me: boolean; live: boolean; children: React.ReactNode }) {
  return (
    <div className={`plat-msg-in flex ${me ? "justify-start sm:pl-[10%]" : "justify-end sm:pr-[10%]"}`}>
      <div className="flex max-w-[86%] items-center gap-2.5 rounded-xl bg-background px-3 py-2.5 shadow-[0_6px_28px_-8px] shadow-gc-ink/20 sm:max-w-[62%] sm:gap-3 sm:px-3.5 sm:py-3">
        {me && <Avatar />}
        {me && <Wave live={live} tone="user" />}
        <span className="text-left text-[12px] font-semibold leading-snug sm:text-[13px]">{children}</span>
        {!me && <Wave live={live} tone="ai" />}
        {!me && <AiBadge />}
      </div>
    </div>
  );
}

function TypedLine({ text }: { text: string }) {
  return <>{useTypewriter(text, true, 28)}</>;
}

function ChatDemo() {
  const [n, setN] = React.useState(1);
  React.useEffect(() => {
    const done = n >= CHAT.length;
    const t = window.setTimeout(() => setN(done ? 1 : n + 1), done ? 3500 : 2300);
    return () => window.clearTimeout(t);
  }, [n]);
  return (
    <div className="flex h-full flex-col justify-end gap-4 sm:gap-5">
      {CHAT.slice(0, n).map((c, i) => {
        const live = i === n - 1;
        return (
          <Bubble key={`${i}-${n === 1 ? "x" : "y"}`} me={c.me} live={live}>
            {live && !c.me ? <TypedLine text={c.t} /> : c.t}
          </Bubble>
        );
      })}
    </div>
  );
}

function MiniChart({ scanning, marked }: { scanning: boolean; marked: boolean }) {
  return (
    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gc-night p-1.5 sm:h-20 sm:w-32">
      <div className="relative flex h-full items-end gap-[3px]">
        {CANDLES.map((k, i) => {
          const lo = Math.min(k.o, k.c);
          const hi = Math.max(k.o, k.c);
          return (
            <div key={i} className="relative h-full flex-1">
              <span
                className={`plat-candle-in absolute inset-x-0 rounded-[1px] ${k.c >= k.o ? "bg-gc-green" : "bg-gc-red"}`}
                style={{ bottom: `${lo}%`, height: `${Math.max(hi - lo, 4)}%`, animationDelay: `${i * 0.06}s` }}
              />
              {marked && (i === 4 || i === 9) && (
                <span className="plat-box absolute -inset-x-[3px] rounded-sm border border-gc-blue" style={{ bottom: `${lo - 6}%`, height: `${hi - lo + 12}%` }} />
              )}
            </div>
          );
        })}
        {scanning && <span className="plat-scan pointer-events-none absolute inset-y-0 w-0.5 bg-gc-blue shadow-[0_0_12px_3px] shadow-gc-blue/60" />}
      </div>
    </div>
  );
}

function VisionDemo() {
  const [phase, setPhase] = React.useState(0); // 0 ask, 1 scan, 2 thinking, 3 reply, 4 follow-up
  const [round, setRound] = React.useState(0);
  React.useEffect(() => {
    const d = [1400, 2600, 1100, 4200, 3200][phase];
    const t = window.setTimeout(() => {
      if (phase === 4) { setPhase(0); setRound((r) => r + 1); } else setPhase(phase + 1);
    }, d);
    return () => window.clearTimeout(t);
  }, [phase]);
  return (
    <div key={round} className="flex h-full flex-col justify-end gap-4 sm:gap-5">
      <div className="plat-msg-in flex justify-start sm:pl-[10%]">
        <div className="flex max-w-[92%] items-center gap-2.5 rounded-xl bg-background px-3 py-2.5 shadow-[0_6px_28px_-8px] shadow-gc-ink/20 sm:max-w-[70%] sm:gap-3 sm:px-3.5 sm:py-3">
          <Avatar />
          <MiniChart scanning={phase === 1} marked={phase >= 2} />
          <span className="text-left text-[12px] font-semibold leading-snug sm:text-[13px]">What’s the trend on this chart?</span>
        </div>
      </div>
      {phase >= 2 && (
        <Bubble me={false} live={phase === 3}>
          {phase === 2 ? "Reading the chart…" : phase === 3 ? <TypedLine text={VISION_REPLY} /> : VISION_REPLY}
        </Bubble>
      )}
      {phase >= 4 && (
        <Bubble me live>
          Perfect, mark the swing lows for me.
        </Bubble>
      )}
    </div>
  );
}

function ExperiencesSection() {
  const [tab, setTab] = React.useState<"chat" | "vision">("chat");
  return (
    <section className="bg-gc-surface py-16 text-center sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-5">
        <h2 className="text-3xl font-medium tracking-tight sm:text-[2.6rem]">Bring AI experiences to life</h2>
        <div className="mt-6 inline-flex rounded-full bg-background p-1 ring-1 ring-gc-line">
          {(["chat", "vision"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${tab === k ? "bg-gc-panel text-gc-ink" : "text-gc-ink-muted hover:text-gc-ink"}`}
            >
              {k === "chat" ? "Chat" : "Vision"}
            </button>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-lg text-sm">
          Build{" "}
          <Link to="/docs" className="underline underline-offset-2">
            {tab === "chat" ? "chat experiences" : "vision experiences"}
          </Link>{" "}
          {tab === "chat"
            ? "that listen and respond naturally, with streaming replies."
            : "that read charts, screenshots and documents from a single image."}
        </p>

        <div className="relative mx-auto mt-10 h-[380px] max-w-[760px] overflow-hidden bg-background sm:h-[420px]">
          {/* soft background swoosh, like the reference */}
          <svg viewBox="0 0 760 420" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-gc-surface" aria-hidden>
            <path
              d="M330 20 C 470 0, 520 90, 430 150 C 360 200, 300 230, 380 290 C 450 340, 560 330, 600 420 L 420 420 C 380 360, 260 340, 250 280 C 240 210, 330 180, 360 130 C 390 80, 300 50, 330 20 Z"
              fill="currentColor"
            />
          </svg>
          <div className="absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-background to-transparent" />
          <div className="relative h-full px-3 pb-16 pt-6 sm:px-6">
            {tab === "chat" ? <ChatDemo key="chat" /> : <VisionDemo key="vision" />}
          </div>
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5">
            <img src="/favicon.png" alt="" width={20} height={20} className="h-5 w-5 rounded" />
            <span className="text-base font-semibold tracking-tight">Jenvu</span>
          </div>
          <p className="absolute bottom-2 right-3 text-[9px] text-gc-ink-muted">Illustrative example. Results may vary.</p>
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
    <div className="flex flex-col rounded-md bg-gc-surface p-2 text-left">
      <div
        className="flex aspect-[16/9] items-center justify-center rounded-sm"
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
          <div key={e.t} className="rounded-md border border-gc-line p-7">
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
          <div className="flex flex-col rounded-md border border-gc-line bg-background p-7 sm:p-8">
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
          <div className="flex flex-col rounded-md border border-gc-line bg-background p-7 sm:p-8">
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

