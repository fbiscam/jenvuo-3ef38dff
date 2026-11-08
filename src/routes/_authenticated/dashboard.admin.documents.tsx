import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { opsToolHref } from "@/lib/ops-tools";

// This admin tool opens as its own Ops Console page, not inside the dashboard.
export const Route = createFileRoute("/_authenticated/dashboard/admin/documents")({
  head: () => ({ meta: [{ title: "Identity verification submissions — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForwardToOps,
});

function ForwardToOps() {
  useEffect(() => {
    window.location.replace(opsToolHref("documents", window.location.search));
  }, []);
  return null;
}
