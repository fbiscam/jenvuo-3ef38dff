import { createFileRoute, redirect } from "@tanstack/react-router";

// The Notifications page was removed; old links (emails, WhatsApp, Telegram) open the dashboard home.
export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
});
