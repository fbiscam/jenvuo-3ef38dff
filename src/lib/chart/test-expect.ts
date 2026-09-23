import assert from "node:assert/strict";

/** Tiny expect() shim over node:assert so tests typecheck without extra test types. */
export function expect<T>(actual: T) {
  return {
    toBe: (v: unknown) => assert.equal(actual, v),
    toEqual: (v: unknown) => assert.deepEqual(actual, v),
    toContain: (v: string) => assert.ok(String(actual).includes(v), `expected "${String(actual)}" to contain "${v}"`),
    toHaveLength: (n: number) => assert.equal((actual as unknown as { length: number }).length, n),
    toBeCloseTo: (v: number, digits = 2) =>
      assert.ok(Math.abs(Number(actual) - v) < 10 ** -digits / 2, `expected ${String(actual)} ≈ ${v}`),
    toBeGreaterThan: (v: number) => assert.ok(Number(actual) > v, `expected ${String(actual)} > ${v}`),
    toBeGreaterThanOrEqual: (v: number) => assert.ok(Number(actual) >= v, `expected ${String(actual)} >= ${v}`),
    toBeLessThanOrEqual: (v: number) => assert.ok(Number(actual) <= v, `expected ${String(actual)} <= ${v}`),
    toBeNull: () => assert.equal(actual, null),
    toThrow: (match?: RegExp | (new (...args: never[]) => Error)) => {
      const fn = actual as unknown as () => unknown;
      if (!match) return assert.throws(fn);
      return assert.throws(fn, match as RegExp);
    },
    not: {
      toThrow: () => assert.doesNotThrow(actual as unknown as () => unknown),
    },
  };
}
