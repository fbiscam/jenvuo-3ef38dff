// TEMPORARY DIAGNOSTIC — probes senior review models on Bluesminds.
// Returns HTTP status + latency per model. No payloads leaked.
import { createFileRoute } from "@tanstack/react-router";

const MODELS = [
  "claude-sonnet-4.5",
  "deepseek-v4-pro",
  "grok-4.5",
  "claude-3.7-sonnet",
  "gpt-5-mini",
  "gpt-4.1-mini",
  "gpt-4o-mini",
  "deepseek-v4-flash",
  "gpt-5.2-chat",
];

export const Route = createFileRoute("/api/public/_probe-senior-x7k2")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.BLUESMINDS_API_KEY;
        if (!key) return new Response("no key", { status: 500 });

        const results = await Promise.all(
          MODELS.map(async (m) => {
            const t0 = Date.now();
            try {
              const ctrl = new AbortController();
              const tid = setTimeout(() => ctrl.abort(), 20000);
              const r = await fetch("https://api.bluesminds.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${key}`,
                },
                body: JSON.stringify({
                  model: m,
                  messages: [{ role: "user", content: "Reply with exactly: OK" }],
                  max_tokens: 8,
                }),
                signal: ctrl.signal,
              });
              clearTimeout(tid);
              const dur = Date.now() - t0;
              let snippet = "";
              try {
                const j: any = await r.json();
                const content = j?.choices?.[0]?.message?.content;
                snippet = content ? String(content).slice(0, 40) : (j?.error?.message ? String(j.error.message).slice(0, 80) : "");
              } catch {
                snippet = "(non-json)";
              }
              return { model: m, status: r.status, ms: dur, reply: snippet };
            } catch (e: any) {
              return { model: m, status: 0, ms: Date.now() - t0, reply: String(e?.message || e).slice(0, 80) };
            }
          }),
        );
        return new Response(JSON.stringify(results, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
