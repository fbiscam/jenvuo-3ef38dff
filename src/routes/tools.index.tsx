import { createFileRoute, Link } from "@tanstack/react-router";
import { ToolsShell, ToolCard } from "@/components/ToolsShell";
import { MapPin, ShieldAlert, Wand2 } from "lucide-react";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "Free Business Tools — Leads, Scam Check, Image Enhancer | Jenvu" },
      {
        name: "description",
        content:
          "Jenvu Tools: extract business leads from Google Maps, detect scam links, texts and images with AI, and enhance images — free to use.",
      },
      { property: "og:title", content: "Jenvu Tools — Leads, Scam Detection & Image Enhancer" },
      { property: "og:description", content: "Three practical tools: Google Maps lead extraction, AI scam detection, and image enhancement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolsIndex,
});

const TOOLS = [
  {
    to: "/tools/leads",
    icon: MapPin,
    title: "Leads Generation",
    desc: "Pull business leads from Google Maps — name, phone, email, address, rating and map link. Apollo enrichment included.",
    tag: "Account required",
  },
  {
    to: "/tools/scam-detector",
    icon: ShieldAlert,
    title: "Scam Detector",
    desc: "Check any link, message or screenshot for fraud and phishing risk with an AI risk score and red-flag breakdown.",
    tag: "Free",
  },
  {
    to: "/tools/image-enhancer",
    icon: Wand2,
    title: "Image Enhancer",
    desc: "Upscale, sharpen and clean up images right in your browser. Before/after preview and instant download.",
    tag: "Free",
  },
] as const;

function ToolsIndex() {
  return (
    <ToolsShell
      eyebrow="Jenvu Tools"
      title="Practical tools, built for operators"
      intro="Three focused utilities — lead extraction, scam detection and image enhancement."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="group">
            <ToolCard className="h-full transition-shadow group-hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_20px_40px_-16px_rgba(16,24,40,0.16)]">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white">
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600">{t.tag}</span>
              </div>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight">{t.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">{t.desc}</p>
              <span className="mt-4 inline-block text-[13px] text-zinc-900 underline underline-offset-4">Open tool</span>
            </ToolCard>
          </Link>
        ))}
      </div>
    </ToolsShell>
  );
}
