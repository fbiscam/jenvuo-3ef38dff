import { createFileRoute, redirect } from "@tanstack/react-router";

// JX Bot was discontinued; old links go to the homepage.
export const Route = createFileRoute("/jx-bot")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
  head: () => ({ meta: [{ title: "Moved — Jenvu" }, { name: "robots", content: "noindex" }] }),
});
