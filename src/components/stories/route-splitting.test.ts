import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { ok } from "node:assert/strict";
import { compileCodeSplitVirtualRoute, computeSharedBindings } from "../../../node_modules/@tanstack/router-plugin/dist/esm/core/code-splitter/compilers.js";

test("Stories missing-page chunk defines the component it exports", () => {
  const filename = new URL("../../routes/stories.$slug.tsx", import.meta.url).pathname;
  const code = readFileSync(filename, "utf8");
  const sharedBindings = computeSharedBindings({
    code,
    filename,
    codeSplitGroupings: [["component"], ["errorComponent"], ["notFoundComponent"]],
  });
  const result = compileCodeSplitVirtualRoute({
    code,
    filename,
    sharedBindings,
    splitTargets: ["notFoundComponent"],
  });
  ok(/(?:const|function) SplitNotFoundComponent\b/.test(result.code));
});

test("Every route defines its automatically split screen exports", () => {
  const routes = new URL("../../routes/", import.meta.url);
  const splitKeys = ["component", "errorComponent", "pendingComponent", "notFoundComponent"] as const;
  let checked = 0;
  for (const entry of readdirSync(routes, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || entry.name === "__root.tsx") continue;
    const filename = `${entry.parentPath}/${entry.name}`;
    const code = readFileSync(filename, "utf8");
    const keys = splitKeys.filter(key => new RegExp(`\\b${key}\\s*:`).test(code));
    const sharedBindings = computeSharedBindings({ code, filename, codeSplitGroupings: keys.map(key => [key]) });
    for (const key of keys) {
      const result = compileCodeSplitVirtualRoute({ code, filename, sharedBindings, splitTargets: [key] });
      for (const exported of result.code.matchAll(/export\s*\{\s*(Split\w+)\s+as\s+/g)) {
        ok(new RegExp(`(?:const|function|class)\\s+${exported[1]}\\b`).test(result.code), `${filename}: ${key} exports an undefined ${exported[1]}`);
      }
      checked++;
    }
  }
  ok(checked >= 104, `Expected to check all current split screens, checked ${checked}`);
});