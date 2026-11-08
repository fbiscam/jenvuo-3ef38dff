import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { ScanAuditPage } from "@/components/ops/admin/scan-audit";

export const Route = createFileRoute("/ops-x9k2-7m4n/scan-audit")({
  head: () => ({
    meta: [
      { title: "Ops Console · Scan Charge Audit" },
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
