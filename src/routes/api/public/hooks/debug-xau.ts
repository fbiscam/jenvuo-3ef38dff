import { createFileRoute } from "@tanstack/react-router";
import { computeSignalPlan } from "@/lib/gold-analysis.functions";

export const Route = createFileRoute("/api/public/hooks/debug-xau")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const plan = await computeSignalPlan({ symbol: "XAUUSD" }, null);
          return Response.json({
            ok: true,
            direction: plan.trade?.direction,
            confidence: plan.trade?.confidence,
            setupScore: plan.setupScore,
            setupGrade: plan.setupGrade,
            alignmentLabel: plan.alignmentLabel,
            htfBias: plan.htfBias,
            killzone: plan.killzone,
            entry: plan.trade?.entry,
            sl: plan.trade?.sl,
            tp1: plan.trade?.tp1,
            rr: plan.trade?.rr,
            selfCritique: plan.selfCritique,
            seniorReview: plan.seniorReview,
            summary: plan.trade?.summary ?? null,
          });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
