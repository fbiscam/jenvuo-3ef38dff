import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/strategies/ict-gold-trading")({
  beforeLoad: () => { throw redirect({ to: "/products", statusCode: 301 }); },
});
