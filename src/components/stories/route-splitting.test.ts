import { readFileSync } from "node:fs";
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