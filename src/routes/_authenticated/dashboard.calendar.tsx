import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/calendar")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/news", replace: true }); },
  head: () => ({ meta: [
    { title: "Economic Calendar — Jenvu News" },
    { name: "description", content: "The Jenvu economic calendar is now part of News Impact." },
    { property: "og:title", content: "Economic Calendar — Jenvu News" },
    { property: "og:description", content: "Weekly economic releases for Gold, EUR/USD and Bitcoin on Jenvu News." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});
