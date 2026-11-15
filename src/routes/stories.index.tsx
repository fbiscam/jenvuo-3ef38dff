import { createFileRoute, redirect } from "@tanstack/react-router";

// The Stories list page was removed; old links land on the API Platform page.
export const Route = createFileRoute("/stories/")({
  beforeLoad: () => {
    throw redirect({ to: "/platform", statusCode: 301 });
  },
});
