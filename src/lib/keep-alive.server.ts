// Lets server code keep working after the visitor leaves the page (Cloudflare `waitUntil`).
// src/server.ts runs every request inside `runWithRequestCtx`, so `keepAlive` finds that request's ctx.
import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { waitUntil?: (p: Promise<unknown>) => void };
const KEY = "__jenvuRequestCtx";
const g = globalThis as unknown as Record<string, AsyncLocalStorage<Ctx> | undefined>;
const store: AsyncLocalStorage<Ctx> = (g[KEY] ??= new AsyncLocalStorage<Ctx>());

export function runWithRequestCtx<T>(ctx: unknown, fn: () => T): T {
  return store.run((ctx ?? {}) as Ctx, fn);
}

/** Keeps `p` running even if the browser disconnects; errors are logged, never thrown. */
export function keepAlive<T>(p: Promise<T>): Promise<T> {
  const ctx = store.getStore();
  try {
    ctx?.waitUntil?.(p.catch((e) => console.error("[keepAlive]", e)));
  } catch {
    /* not on Workers (dev server): the promise simply keeps running */
  }
  return p;
}
