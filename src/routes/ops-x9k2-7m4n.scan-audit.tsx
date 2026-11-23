import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { ScanAuditPage } from "@/components/ops/admin/scan-audit";

export const Route = createFileRoute("/ops-x9k2-7m4n/scan-audit")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Scan Charge Audit" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Scan Charge Audit: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Scan Charge Audit" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Scan Charge Audit: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsScanAudit,
});

function OpsScanAudit() {
  return (
    <OpsStandalone>
      <ScanAuditPage />
    </OpsStandalone>
  );
}
