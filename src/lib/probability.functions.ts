import { createServerFn } from "@tanstack/react-start";

export const getGoldProbability = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const tf = (data as { timeframe?: string } | undefined)?.timeframe;
    const allowed = ["5m", "15m", "1h", "4h"];
    return { timeframe: allowed.includes(String(tf)) ? String(tf) : "5m" };
  })
  .handler(async ({ data }) => {
    const { analyzeGoldProbability } = await import("./probability-engine.server");
    return analyzeGoldProbability(data.timeframe);
  });
