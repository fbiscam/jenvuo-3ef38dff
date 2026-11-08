import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminAnnouncementsPage } from "@/components/ops/admin/announcements";

export const Route = createFileRoute("/ops-x9k2-7m4n/announcements")({
  head: () => ({
    meta: [
      { title: "Ops Console · Site Notices" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsAnnouncements,
});

function OpsAnnouncements() {
  return (
    <OpsStandalone>
      <AdminAnnouncementsPage />
    </OpsStandalone>
  );
}
