import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadThreads, newThreadId } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/dashboard/chat/")({
  beforeLoad: () => {
    const existing = typeof window === "undefined" ? [] : loadThreads();
    const threadId = existing[0]?.id ?? newThreadId();
    throw redirect({ to: "/dashboard/chat/$threadId", params: { threadId } });
  },
});
