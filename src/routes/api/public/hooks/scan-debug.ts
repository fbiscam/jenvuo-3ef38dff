import { createFileRoute } from "@tanstack/react-router";
import { computeSignalPlan } from "@/lib/gold-analysis.functions";

// Temporary diagnostics endpoint: returns the raw plan verdict for a pair.
// Auth: x-cron-secret only.
export const Route = createFileRoute("/api/public/hooks/scan-debug")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET ?? "";
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        let symbol = "XAUUSD";
        try {
          const body = (await request.json()) as { symbol?: string };
          if (body?.symbol) symbol = body.symbol;
        } catch {
          /* default */
        }
        try {
          const plan = await computeSignalPlan({ symbol }, null);
          const p = plan as Record<string, any>;
          return Response.json({
            ok: true,
            symbol,
            direction: p.trade?.direction,
            confidence: p.trade?.confidence,
            reason: p.trade?.reason ?? p.trade?.invalidation,
            summary: p.trade?.summary,
            htfBias: p.htfBias,
            killzone: p.killzone,
            grade: p.trade?.setupGrade,
            checks: (p.setupChecks ?? []).slice(0, 14),
          });
        } catch (e) {
          return Response.json({ ok: false, error: String((e as Error)?.message ?? e) });
        }
      },
    },
  },
});
