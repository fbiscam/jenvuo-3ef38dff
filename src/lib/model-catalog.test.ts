import { describe, expect, test } from "bun:test";
import { MODEL_CATALOG, PRICE_PER_MILLION, missingCatalogIds } from "./model-catalog";
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
});
