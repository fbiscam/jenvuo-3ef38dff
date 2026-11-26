import { createFileRoute, redirect } from "@tanstack/react-router";

// JX Bot was discontinued; old links go to Scam Protection.
export const Route = createFileRoute("/jx-bot")({
  beforeLoad: () => {
    throw redirect({ to: "/scam-protection", statusCode: 301 });
  },
  head: () => ({ meta: [{ title: "Moved — Jenvu" }, { name: "robots", content: "noindex" }] }),
});
