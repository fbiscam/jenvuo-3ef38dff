export type AnnouncementKind = "update" | "bot" | "issue" | "maintenance";

export type Announcement = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  active: boolean;
  created_at: string;
};

export const ANNOUNCEMENT_KINDS: { value: AnnouncementKind; label: string }[] = [
  { value: "update", label: "New update" },
  { value: "bot", label: "Bot update" },
  { value: "issue", label: "Issue / outage" },
  { value: "maintenance", label: "Maintenance" },
];

const isProblem = (k: AnnouncementKind) => k === "issue" || k === "maintenance";

/**
 * The one site notice a user should see: active and not dismissed by them.
 * Issues/maintenance come before updates; within a group the newest wins.
 */
export function pickAnnouncement(list: Announcement[], dismissed: Iterable<string>): Announcement | null {
  const gone = new Set(dismissed);
  const open = list.filter((a) => a.active && !gone.has(a.id));
  open.sort((a, b) => {
    const p = Number(isProblem(b.kind)) - Number(isProblem(a.kind));
    if (p !== 0) return p;
    return b.created_at.localeCompare(a.created_at);
  });
  return open[0] ?? null;
}
