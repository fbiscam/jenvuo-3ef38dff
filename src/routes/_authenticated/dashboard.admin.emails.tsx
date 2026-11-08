import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { emailsSearch } from "@/components/ops/admin/emails";
import { opsToolHref } from "@/lib/ops-tools";

// The Email box opens as its own Ops Console page, not inside the dashboard.
export const Route = createFileRoute("/_authenticated/dashboard/admin/emails")({
  validateSearch: (s) => emailsSearch.parse(s),
  head: () => ({ meta: [{ title: "Email box — Jenvu Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForwardToOps,
});

function ForwardToOps() {
  useEffect(() => {
    window.location.replace(opsToolHref("emails", window.location.search));
  }, []);
  return null;
}
