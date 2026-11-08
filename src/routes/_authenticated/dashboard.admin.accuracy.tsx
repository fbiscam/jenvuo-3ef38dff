import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { opsToolHref } from "@/lib/ops-tools";

// This admin tool opens as its own Ops Console page, not inside the dashboard.
export const Route = createFileRoute("/_authenticated/dashboard/admin/accuracy")({
  head: () => ({ meta: [{ title: "Signal Accuracy — Jenvu Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForwardToOps,
});

function ForwardToOps() {
  useEffect(() => {
    window.location.replace(opsToolHref("accuracy", window.location.search));
  }, []);
  return null;
}
