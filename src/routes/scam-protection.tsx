import { createFileRoute, redirect } from "@tanstack/react-router";

// Scam Protection page was removed; old links go to the homepage.
export const Route = createFileRoute("/scam-protection")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
  head: () => ({ meta: [{ title: "Moved — Jenvu" }, { name: "robots", content: "noindex" }] }),
});
