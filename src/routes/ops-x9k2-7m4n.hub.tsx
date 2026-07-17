import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { opsLock, opsStatus } from "@/lib/ops-gate.functions";

export const Route = createFileRoute("/ops-x9k2-7m4n/hub")({
  head: () => ({
    meta: [
      { title: "Ops Console · Hub" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsHub,
});

type Tile = {
  title: string;
  desc: string;
  to: string;
};

const TILES: Tile[] = [
  { title: "Support Inbox", desc: "Contact & live-chat messages", to: "/jenvu-ops-x9k2/inbox" },
  { title: "Contact Messages", desc: "Legacy contact form entries", to: "/dashboard/admin/messages" },
  { title: "Newsletter Subscribers", desc: "Email list & signal opt-ins", to: "/dashboard/admin/subscribers" },
  { title: "Founding Applications", desc: "Review & approve applicants", to: "/dashboard/admin/founding" },
  { title: "Document Submissions", desc: "Earning-proof review", to: "/dashboard/admin/documents" },
  { title: "Auto-Scan Monitor", desc: "Auto-scanner state & history", to: "/dashboard/admin/auto-scan" },
  { title: "Scan Audit", desc: "AI cost & scan ledger", to: "/dashboard/admin/scan-audit" },
];

function OpsHub() {
  const router = useRouter();
  const lock = useServerFn(opsLock);
  const status = useServerFn(opsStatus);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const token = window.sessionStorage.getItem("jenvu_ops_token") ?? undefined;
    status({ data: { token } })
      .then((s) => {
        if (!alive) return;
        if (s.unlocked) setReady(true);
        else router.navigate({ to: "/ops-x9k2-7m4n", replace: true });
      })
      .catch(() => {
        if (alive) router.navigate({ to: "/ops-x9k2-7m4n", replace: true });
      });
    return () => {
      alive = false;
    };
  }, [router, status]);

  async function onLock() {
    window.sessionStorage.removeItem("jenvu_ops_token");
    await lock({});
    await router.navigate({ to: "/ops-x9k2-7m4n" });
  }

  if (!ready) {
    return <div style={{ minHeight: "100vh", background: "#0a0a0a" }} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily:
          "'Google Sans','Google Sans Normal',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#a1a1aa" }}>
              Jenvu · Restricted
            </div>
            <h1 style={{ fontSize: 26, margin: "6px 0 0", fontWeight: 600 }}>Ops Console</h1>
          </div>
          <button
            onClick={onLock}
            style={{
              background: "transparent",
              color: "#e4e4e7",
              border: "1px solid #3f3f46",
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Lock
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              style={{
                display: "block",
                background: "#111",
                border: "1px solid #262626",
                borderRadius: 14,
                padding: 18,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fafafa" }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>{t.desc}</div>
            </Link>
          ))}
        </div>

        <p style={{ marginTop: 28, fontSize: 12, color: "#71717a" }}>
          Note: opening a tile still requires an admin-signed dashboard session.
        </p>
      </div>
    </div>
  );
}
