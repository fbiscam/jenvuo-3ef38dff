import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadThreads, newThreadId } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/chat/")({
  beforeLoad: () => {
    const existing = typeof window === "undefined" ? [] : loadThreads();
    const threadId = existing[0]?.id ?? newThreadId();
    throw redirect({ to: "/chat/$threadId", params: { threadId } });
  },
});
