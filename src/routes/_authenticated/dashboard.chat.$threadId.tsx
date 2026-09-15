import { createFileRoute } from "@tanstack/react-router";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/dashboard/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Jenvu Chat — AI assistant" },
      {
        name: "description",
        content:
          "Chat with Jenvu AI, pick a model, attach charts or share your screen for XAU/USD analysis.",
      },
      { property: "og:title", content: "Jenvu Chat — AI assistant" },
      {
        property: "og:description",
        content:
          "Chat with Jenvu AI, pick a model, attach charts or share your screen for XAU/USD analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  return <ChatWorkspace key={threadId} threadId={threadId} />;
}
