import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/extension")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/api" });
  },
});
