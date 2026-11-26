import { createFileRoute, redirect } from "@tanstack/react-router";

// JX Bot was discontinued; old dashboard links go to Overview.
export const Route = createFileRoute("/_authenticated/dashboard/bot-usage")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
