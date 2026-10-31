import { describe, it as test } from "node:test";
import { expect } from "./chart/test-expect";
import { MIXED_CATALOG, MODEL_CATALOG, PRICE_PER_MILLION, missingCatalogIds, mixByProvider } from "./model-catalog";
import { PUBLIC_API_MODEL_IDS } from "./public-api-models";

describe("Models page catalogue", () => {
  test("shows exactly the models the Jenvu API offers", () => {
    expect(missingCatalogIds()).toEqual([]);
    expect(MODEL_CATALOG.length).toBe(PUBLIC_API_MODEL_IDS.length);
    expect(new Set(MODEL_CATALOG.map((m) => m.id)).size).toBe(MODEL_CATALOG.length);
  });
  test("price matches the $3 per million token rate", () => {
    expect(PRICE_PER_MILLION).toBe(3);
  });
  test("all-models list mixes companies: no two from the same company in a row", () => {
    expect(MIXED_CATALOG.length).toBe(MODEL_CATALOG.length);
    expect(new Set(MIXED_CATALOG.map((m) => m.id)).size).toBe(MODEL_CATALOG.length);
    const repeats = MIXED_CATALOG.filter((m, i) => i > 0 && MIXED_CATALOG[i - 1].provider === m.provider);
    expect(repeats.length).toBe(0);
  });
  test("mixing keeps each company's own model order", () => {
    const claude = MIXED_CATALOG.filter((m) => m.provider === "anthropic").map((m) => m.id);
    expect(claude).toEqual(MODEL_CATALOG.filter((m) => m.provider === "anthropic").map((m) => m.id));
  });
  test("a single-company list stays intact", () => {
    const only = MODEL_CATALOG.filter((m) => m.provider === "google");
    expect(mixByProvider(only).map((m) => m.id)).toEqual(only.map((m) => m.id));
  });
});
