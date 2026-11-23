import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ops-x9k2-7m4n")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console" },
      { name: "description", content: "Jenvu Ops Console: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console" },
      { property: "og:description", content: "Jenvu Ops Console: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <Outlet />,
});