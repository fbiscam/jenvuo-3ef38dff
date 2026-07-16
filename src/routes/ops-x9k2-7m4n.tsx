import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { opsUnlock, opsStatus } from "@/lib/ops-gate.functions";

export const Route = createFileRoute("/ops-x9k2-7m4n")({
  head: () => ({
    meta: [
      { title: "Ops Console" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  loader: async () => {
    const s = await opsStatus();
    if (s.unlocked) throw redirect({ to: "/ops-x9k2-7m4n/hub" });
    return null;
  },
  component: OpsLogin,
});

function OpsLogin() {
  const router = useRouter();
  const unlock = useServerFn(opsUnlock);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await unlock({ data: { id: id.trim(), password } });
      if (res.ok) {
        await router.navigate({ to: "/ops-x9k2-7m4n/hub" });
      } else {
        setErr("Invalid credentials");
      }
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1200px 600px at 20% -10%, #eef2ff 0%, transparent 60%), radial-gradient(900px 500px at 110% 110%, #f5f3ff 0%, transparent 55%), #ffffff",
        color: "#0a0a0a",
        fontFamily:
          "'Google Sans','Google Sans Normal',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 28,
          boxShadow:
            "0 1px 2px rgba(15,23,42,.04), 0 12px 32px -12px rgba(15,23,42,.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <img
            src="/favicon.png"
            alt="Jenvu"
            width={32}
            height={32}
            style={{ borderRadius: 8, objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0a0a0a" }}>Jenvu</span>
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "#64748b",
                marginTop: 2,
              }}
            >
              Ops Console
            </span>
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "#64748b",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              padding: "4px 8px",
              borderRadius: 999,
            }}
          >
            Restricted
          </span>
        </div>

        <h1 style={{ fontSize: 22, margin: "6px 0 4px", fontWeight: 600, letterSpacing: "-0.01em" }}>
          Sign in to continue
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
          Internal tools for the Jenvu operations team.
        </p>

        <label style={labelStyle}>ID</label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 14 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={inputStyle}
        />

        {err && (
          <div
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              fontSize: 13,
              marginTop: 14,
              padding: "8px 12px",
              borderRadius: 10,
            }}
          >
            {err}
          </div>
        )}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Verifying…" : "Enter console"}
        </button>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16, textAlign: "center" }}>
          Authorized personnel only · All access is logged
        </p>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#334155",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "11px 13px",
  background: "#ffffff",
  color: "#0a0a0a",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s ease, box-shadow .15s ease",
};

const btnStyle: React.CSSProperties = {
  marginTop: 20,
  width: "100%",
  padding: "12px 14px",
  background: "#0a0a0a",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: "0.01em",
};
