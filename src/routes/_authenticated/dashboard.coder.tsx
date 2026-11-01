import { createFileRoute, redirect } from "@tanstack/react-router";

// Jexco was folded into the Chat page; old links land there.
export const Route = createFileRoute("/_authenticated/dashboard/coder")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/chat", replace: true });
  },
});
