import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ModelsExplorer from "@/components/models/ModelsExplorer";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Jenvu Models — Claude, GPT, Gemini, Grok and more" },
      { name: "description", content: "Browse every AI model on Jenvu: Claude, GPT, Gemini, DeepSeek, Qwen, Grok and more, with context, capabilities and one flat price per million tokens." },
      { property: "og:title", content: "Discover models on Jenvu" },
      { property: "og:description", content: "Every model you can call with one Jenvu API key, with specs, capabilities and flat pricing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://jenvu.com/models" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/models" }],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <ModelsExplorer apiHref="/dashboard/api" />
      </main>
      <SiteFooter />
    </div>
  );
}
