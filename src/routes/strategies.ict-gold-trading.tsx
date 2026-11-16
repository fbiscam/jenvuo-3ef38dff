import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/strategies/ict-gold-trading")({
  beforeLoad: () => { throw redirect({ to: "/ai-engine", statusCode: 301 }); },
});
