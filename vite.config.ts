// ============= Full file contents =============
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin, ViteDevServer } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";

// Dev-only fix for "Invalid server function ID" 500s.
//
// TanStack Start's server-fn plugin only registers a fn's ID when the *server
// environment* transforms the module that defines it. If the SSR runtime lazy-
// loads that module (which it does — server fns are resolved on demand via
// `getServerFnById`) and the module hasn't been transformed yet, the very
// first call throws. HMR makes this worse: after a restart the manifest is
// empty until each `*.functions.ts` file is re-transformed on demand.
//
// Fix: warm-load every `*.functions.ts(x)` file on server start and after
// restarts by walking `src/` and calling `ssrLoadModule` on each match. That
// forces the server-fn plugin to see every ID before the first client call.
function serverFnManifestRegen(): Plugin {
  const isServerFnFile = (file: string) => /\.functions\.tsx?$/.test(file);
  let restarting = false;
  let pending: NodeJS.Timeout | null = null;

  async function findServerFnFiles(root: string): Promise<string[]> {
    const out: string[] = [];
    async function walk(dir: string) {
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); }
      catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name.startsWith(".")) continue;
          await walk(full);
        } else if (e.isFile() && isServerFnFile(full)) {
          out.push(full);
        }
      }
    }
    await walk(root);
    return out;
  }

  async function warmLoad(server: ViteDevServer) {
    const srcRoot = path.join(server.config.root, "src");
    const files = await findServerFnFiles(srcRoot);
    await Promise.allSettled(
      files.map((f) => server.ssrLoadModule(f).catch(() => undefined)),
    );
    server.config.logger.info(
      `[serverfn-manifest-regen] warm-loaded ${files.length} server-fn module(s)`,
    );
  }

  return {
    name: "lovable:serverfn-manifest-regen",
    apply: "serve",
    configureServer(server) {
      // Warm-load once the server is ready (and again after each restart —
      // configureServer runs fresh on restart).
      server.httpServer?.once("listening", () => { void warmLoad(server); });

      const trigger = (file: string, kind: string) => {
        if (!isServerFnFile(file)) return;
        server.config.logger.info(
          `[serverfn-manifest-regen] ${kind} event for ${file} (restarting=${restarting})`,
        );
        if (restarting) return;
        if (pending) clearTimeout(pending);
        pending = setTimeout(() => {
          pending = null;
          restarting = true;
          server.config.logger.info(
            `[serverfn-manifest-regen] restarting dev server (trigger: ${kind} ${file})`,
          );
          server.restart().finally(() => { restarting = false; });
        }, 400);
      };
      server.watcher.on("add", (f) => trigger(f, "added"));
      server.watcher.on("unlink", (f) => trigger(f, "removed"));
      server.watcher.on("change", (f) => trigger(f, "changed"));
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [serverFnManifestRegen()],
  },
});
