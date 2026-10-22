import { createFileRoute, redirect } from "@tanstack/react-router";

// Typed/bookmarked /dashboard/payment addresses land on the real Payment page.
export const Route = createFileRoute("/_authenticated/dashboard/payment")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/pay", replace: true });
  },
});
