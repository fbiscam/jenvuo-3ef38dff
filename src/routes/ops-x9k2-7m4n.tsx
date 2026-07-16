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
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily:
          "'Google Sans','Google Sans Normal',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#111",
          border: "1px solid #262626",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#a1a1aa" }}>
          Restricted
        </div>
        <h1 style={{ fontSize: 22, margin: "6px 0 18px", fontWeight: 600 }}>Ops Console</h1>

        <label style={{ fontSize: 12, color: "#a1a1aa" }}>ID</label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          style={inputStyle}
        />

        <label style={{ fontSize: 12, color: "#a1a1aa", marginTop: 12, display: "block" }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={inputStyle}
        />

        {err && (
          <div style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{err}</div>
        )}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Verifying…" : "Enter"}
        </button>
        <p style={{ fontSize: 11, color: "#71717a", marginTop: 14, textAlign: "center" }}>
          Authorized personnel only. All access is logged.
        </p>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  background: "#0a0a0a",
  color: "#fafafa",
  border: "1px solid #262626",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  marginTop: 18,
  width: "100%",
  padding: "11px 14px",
  background: "#fafafa",
  color: "#0a0a0a",
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
