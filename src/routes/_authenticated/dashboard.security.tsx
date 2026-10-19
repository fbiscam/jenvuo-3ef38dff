import { createFileRoute, redirect } from "@tanstack/react-router";

// Security now lives inside Settings; old links land on its Security section.
export const Route = createFileRoute("/_authenticated/dashboard/security")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/profile", hash: "security" });
  },
});
