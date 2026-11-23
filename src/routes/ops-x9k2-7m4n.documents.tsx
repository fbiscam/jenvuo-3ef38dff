import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminDocumentsPage } from "@/components/ops/admin/documents";

export const Route = createFileRoute("/ops-x9k2-7m4n/documents")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Identity verification submissions" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Identity verification submissions: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Identity verification submissions" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Identity verification submissions: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsDocuments,
});

function OpsDocuments() {
  return (
    <OpsStandalone>
      <AdminDocumentsPage />
    </OpsStandalone>
  );
}
