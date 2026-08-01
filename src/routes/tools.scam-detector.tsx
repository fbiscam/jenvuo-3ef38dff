import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ToolsShell, ToolCard } from "@/components/ToolsShell";
import { analyzeScam, type ScamVerdict } from "@/lib/scam-detect.functions";
import { Loader2, Link2, FileText, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/tools/scam-detector")({
  head: () => ({
    meta: [
      { title: "Free Scam Detector — Check Links, Texts & Screenshots | Jenvu" },
      {
        name: "description",
        content:
          "Paste a link, message or screenshot and get an instant AI scam risk score with the exact red flags and what to do next. Free to use.",
      },
      { property: "og:title", content: "Scam Detector — Check any link, text or image" },
      { property: "og:description", content: "Instant AI fraud and phishing risk analysis for links, messages and screenshots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScamTool,
});

const TABS = [
  { key: "link", label: "Link", icon: Link2 },
  { key: "text", label: "Text", icon: FileText },
  { key: "image", label: "Image", icon: ImageIcon },
] as const;

const VERDICT_STYLE: Record<ScamVerdict["verdict"], string> = {
  safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspicious: "bg-amber-50 text-amber-700 border-amber-200",
  scam: "bg-red-50 text-red-700 border-red-200",
};

function ScamTool() {
  const analyze = useServerFn(analyzeScam);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("link");
  const [value, setValue] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScamVerdict | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File) {
    if (file.size > 4_000_000) {
      setErr("Image must be under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function run() {
    const payload = tab === "image" ? imageData : value;
    if (!payload) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await analyze({ data: { kind: tab, value: payload } });
      if (res.ok) setResult(res.result);
      else setErr((res as { message?: string }).message ?? "Analysis failed. Try again.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolsShell
      eyebrow="Free tool"
      title="Scam Detector"
      intro="Check a suspicious link, message or screenshot. You get a risk score, the exact red flags, and what to do next."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <ToolCard>
          <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setResult(null);
                  setErr(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] ${
                  tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "link" && (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://example-offer.co/claim"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-zinc-400"
            />
          )}
          {tab === "text" && (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={8}
              placeholder="Paste the email, SMS or WhatsApp message here…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-zinc-400"
            />
          )}
          {tab === "image" && (
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
                className="block w-full text-[13px] text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-white"
              />
              {imageData && <img src={imageData} alt="Uploaded preview" className="max-h-56 rounded-xl border border-zinc-200" />}
            </div>
          )}

          <button
            type="button"
            onClick={run}
            disabled={busy || (tab === "image" ? !imageData : !value.trim())}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-[15px] text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Analyze
          </button>
          {err && <p className="mt-3 text-[13px] text-red-600">{err}</p>}
        </ToolCard>

        <ToolCard>
          {!result && !busy && <p className="text-[14px] text-zinc-500">Results will appear here.</p>}
          {busy && (
            <div className="flex items-center gap-2 text-[14px] text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-3 py-1 text-[12px] font-medium uppercase tracking-wide ${VERDICT_STYLE[result.verdict]}`}>
                  {result.verdict}
                </span>
                <span className="text-[13px] text-zinc-500">Risk {result.score}/100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${result.score >= 70 ? "bg-red-500" : result.score >= 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <p className="text-[14px] leading-relaxed text-zinc-800">{result.summary}</p>
              {result.reasons.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-zinc-900">Red flags</p>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-zinc-700">
                    {result.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.advice.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-zinc-900">What to do</p>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-zinc-700">
                    {result.advice.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </ToolCard>
      </div>
    </ToolsShell>
  );
}
