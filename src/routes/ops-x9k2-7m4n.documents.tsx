import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminDocumentsPage } from "@/components/ops/admin/documents";

export const Route = createFileRoute("/ops-x9k2-7m4n/documents")({
  head: () => ({
    meta: [
      { title: "Ops Console · Identity verification submissions" },
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
