import { createFileRoute, redirect } from "@tanstack/react-router";

// Alerts are no longer offered, so the public alert feed is gone; old links open the homepage.
export const Route = createFileRoute("/broadcasts")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
