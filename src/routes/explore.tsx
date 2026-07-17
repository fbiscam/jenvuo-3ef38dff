import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  LineChart,
  Brain,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Play,
  ArrowRight,
  Clock,
  BarChart3,
  Radio,
  Quote,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import heroAsset from "@/assets/explore/hero-trading.jpg.asset.json";
import mindsetAsset from "@/assets/explore/mindset.jpg.asset.json";
import aiAsset from "@/assets/explore/ai-engine.jpg.asset.json";
import disciplineAsset from "@/assets/explore/discipline.jpg.asset.json";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Jenvu — The Institutional-Grade XAU Desk" },
      {
        name: "description",
        content:
          "Discover Jenvu — the AI-powered ICT/SMC trading intelligence desk built for serious XAU/USD traders. Tools, mindset, and the edge that separates pros from noise.",
      },
      { property: "og:title", content: "Explore Jenvu — The Institutional-Grade XAU Desk" },
      { property: "og:description", content: "AI-powered signals, ICT/SMC intelligence, and trader mindset — all in one desk." },
      { property: "og:image", content: `https://jenvu.com${heroAsset.url}` },
      { property: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/explore" }],
  }),
  component: ExplorePage,
});

const FONT = { fontFamily: "'Google Sans','Product Sans','Urbanist',system-ui,sans-serif" };

function ExplorePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900" style={FONT}>
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded-md object-contain" />
            Jenvu
          </Link>
          <HeaderAuthButtons />
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#0a0a0f] text-white">
        <img
          src={heroAsset.url}
          alt="Jenvu trading intelligence"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          width={1600}
          height={900}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/70 to-[#0a0a0f]" />
        <div className="relative mx-auto max-w-5xl px-5 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] backdrop-blur">
            <Sparkles className="h-3 w-3 text-amber-300" />
            Welcome to the Desk
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
            The edge <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">institutions have</span>.
            <br />Now in your pocket.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-zinc-300 sm:text-[17px]">
            Jenvu is not another signal group. It's a full trading desk — ICT/SMC engine, dual AI review, killzone timing, and the discipline framework that turns retail chaos into a professional workflow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/signal"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              <Play className="h-4 w-4" /> Run your first scan
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* stats */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["<25s", "Full scan"],
              ["ICT+SMC", "Native engine"],
              ["Dual AI", "GPT + DeepSeek"],
              ["$0.20", "Per scan"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-2xl font-semibold tracking-tight text-amber-200">{v}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-zinc-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS JENVU */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">What is Jenvu</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built by traders. Priced like a tool. Behaves like a partner.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
            Every scan is a full institutional review — bias, structure, liquidity, killzone, macro sentiment — condensed into one number you can act on.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: LineChart,
              title: "ICT / SMC Engine",
              body: "Order blocks, FVGs, liquidity sweeps, breakers, killzones — coded natively, not bolted on. No LLM hallucinations about market structure.",
              tone: "from-amber-50 to-white",
            },
            {
              icon: Brain,
              title: "Dual-AI Review",
              body: "GPT-5.6 and DeepSeek V4 review every A/B setup independently. If both agree, you get an alert. If they disagree, we tell you.",
              tone: "from-blue-50 to-white",
            },
            {
              icon: Target,
              title: "One Number. Full Truth.",
              body: "Blended confidence: 60% rules + 40% AI. Below 62% you see nothing. Above? Entry, SL, TP, and the reasoning behind every level.",
              tone: "from-emerald-50 to-white",
            },
            {
              icon: Radio,
              title: "Live Alerts",
              body: "Every A+ setup pings your account, email, and phone the moment it prints. No lag, no group chats, no FOMO.",
              tone: "from-rose-50 to-white",
            },
            {
              icon: BarChart3,
              title: "Auto Journal",
              body: "Every trade you take is auto-logged. Win rate, R-multiple, killzone performance — the data your broker will never give you.",
              tone: "from-violet-50 to-white",
            },
            {
              icon: Shield,
              title: "Aligned Incentives",
              body: "$0.20 per scan. No subscription trap. No upsell pressure. We win when you keep coming back — and you only come back when we work.",
              tone: "from-zinc-50 to-white",
            },
          ].map((c) => (
            <div
              key={c.title}
              className={`group rounded-3xl border border-zinc-200 bg-gradient-to-b ${c.tone} p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW TO TRADE — WORKFLOW */}
      <section className="border-y border-zinc-100 bg-[#fafafa] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">The Workflow</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                A daily routine that pros actually run.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
                Stop staring at charts for 8 hours. This is the exact 4-step loop we've backtested across 2 years of XAU data — and the one the desk runs live every session.
              </p>
              <ol className="mt-8 space-y-5">
                {[
                  ["Bias", "Check HTF bias — daily / 4H. Jenvu locks it for you every morning."],
                  ["Killzone", "Wait for London or NY killzone. No trading outside of it. Period."],
                  ["Scan", "Run one scan. Blended confidence ≥ 62 → setup exists. Below → close the app."],
                  ["Execute", "Take the entry, honor the SL, log the result. Repeat 20x. Compound."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900">{t}</div>
                      <div className="mt-0.5 text-[13.5px] text-zinc-600">{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-zinc-200 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]">
                <img
                  src={mindsetAsset.url}
                  alt="Focused trader running the Jenvu workflow"
                  className="w-full object-cover"
                  loading="lazy"
                  width={1200}
                  height={800}
                />
              </div>
              <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg sm:block">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
                  <Clock className="h-3 w-3" /> London Killzone
                </div>
                <div className="mt-1 text-lg font-semibold">Live · Setup B ready</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI ENGINE SHOWCASE */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="relative order-2 md:order-1">
            <div className="overflow-hidden rounded-3xl border border-zinc-200 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]">
              <img
                src={aiAsset.url}
                alt="Jenvu AI engine analyzing the market"
                className="w-full object-cover"
                loading="lazy"
                width={1200}
                height={800}
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">The AI Engine</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Two AI models. One truth.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
              GPT-5.6 Luna handles narrative, macro, and structure. DeepSeek V4 handles rules, math, and confluence. They review each other. Only setups both agree on reach your alerts.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                ["Macro context layer", "News, DXY, yields, and central-bank sentiment scored automatically."],
                ["Chain-of-thought self-critique", "The AI questions its own logic before it prints an alert."],
                ["Deterministic output", "Temperature 0, seeded — same market, same answer. No random confidence."],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <div className="text-sm font-semibold">{t}</div>
                    <div className="mt-0.5 text-[13px] text-zinc-600">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MINDSET / MOTIVATION */}
      <section className="relative overflow-hidden bg-[#0a0a0f] text-white">
        <img
          src={disciplineAsset.url}
          alt="Gold and discipline"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="lazy"
          width={1200}
          height={800}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/80 via-[#0a0a0f]/85 to-[#0a0a0f]" />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">The Trader's Code</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Discipline is the strategy.
            <br />
            <span className="text-zinc-400">Everything else is just tools.</span>
          </h2>

          <div className="mt-14 grid gap-5 sm:grid-cols-3 text-left">
            {[
              {
                q: "The market pays the patient. It punishes the impatient. Nothing else matters.",
                a: "— Institutional desk lead, 20+ yrs",
              },
              {
                q: "One A+ setup a week beats twenty B setups a day. Every time. Guaranteed.",
                a: "— The Jenvu rule",
              },
              {
                q: "You don't need more signals. You need to actually follow the one in front of you.",
                a: "— Every profitable trader, ever",
              },
            ].map((t) => (
              <div key={t.a} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <Quote className="h-6 w-6 text-amber-300/70" />
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-100">{t.q}</p>
                <div className="mt-4 text-[11px] uppercase tracking-widest text-zinc-400">{t.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-5 py-24 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">
          Your first scan is 30 seconds away.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600">
          The desk is open. Bias is locked. Killzone is live. All that's missing is you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/signal"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Run a scan now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-400"
          >
            Go to dashboard
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
