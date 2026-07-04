// ============= Full file contents =============
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// Dev-only: restart the Vite server whenever a *.functions.ts(x) file changes so the
// TanStack Start server-fn manifest is regenerated. Without this, HMR can leave the
// client bundle referencing a stale server-fn ID and calls (e.g. getLiveTick) throw
// "Invalid server function ID" 500s until a manual restart.
function serverFnManifestRegen(): Plugin {
  const isServerFnFile = (file: string) => /\.functions\.tsx?$/.test(file);
  let restarting = false;
  return {
    name: "lovable:serverfn-manifest-regen",
    apply: "serve",
    configureServer(server) {
      const trigger = (file: string, kind: string) => {
        if (!isServerFnFile(file) || restarting) return;
        restarting = true;
        server.config.logger.info(
          `[serverfn-manifest-regen] ${kind} ${file} — restarting dev server to refresh manifest`,
        );
        server.restart().finally(() => {
          restarting = false;
        });
      };
      server.watcher.on("add", (f) => trigger(f, "added"));
      server.watcher.on("unlink", (f) => trigger(f, "removed"));
      // Note: plain edits to an existing *.functions.ts file don't change the manifest
      // (same set of exported server fns), so we only restart on add/unlink to avoid
      // reload churn during normal editing.
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
