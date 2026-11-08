import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { opsToolHref } from "@/lib/ops-tools";

// This admin tool opens as its own Ops Console page, not inside the dashboard.
export const Route = createFileRoute("/_authenticated/dashboard/admin/tuning")({
  head: () => ({ meta: [{ title: "Signal Weight Tuning — Jenvu Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForwardToOps,
});

function ForwardToOps() {
  useEffect(() => {
    window.location.replace(opsToolHref("tuning", window.location.search));
  }, []);
  return null;
}
