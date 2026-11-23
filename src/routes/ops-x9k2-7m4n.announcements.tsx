import { createFileRoute } from "@tanstack/react-router";
import { OpsStandalone } from "@/components/ops/OpsStandalone";
import { AdminAnnouncementsPage } from "@/components/ops/admin/announcements";

export const Route = createFileRoute("/ops-x9k2-7m4n/announcements")({
  head: () => ({
    meta: [
      { title: "Jenvu Ops Console · Site Notices" },
      { name: "description", content: "Jenvu Ops Console \u00b7 Site Notices: restricted operations and account management." },
      { property: "og:title", content: "Jenvu Ops Console \u00b7 Site Notices" },
      { property: "og:description", content: "Jenvu Ops Console \u00b7 Site Notices: restricted operations and account management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
