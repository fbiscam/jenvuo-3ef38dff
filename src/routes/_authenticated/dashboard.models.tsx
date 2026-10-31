import { createFileRoute } from "@tanstack/react-router";
import ModelsExplorer from "@/components/models/ModelsExplorer";

export const Route = createFileRoute("/_authenticated/dashboard/models")({
  head: () => ({
    meta: [
      { title: "Models — Jenvu" },
      { name: "description", content: "Every model available with your Jenvu API key, with specs, capabilities and pricing." },
      { property: "og:title", content: "Models — Jenvu" },
      { property: "og:description", content: "Every model available with your Jenvu API key." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ModelsExplorer apiHref="/dashboard/api" />,
});
