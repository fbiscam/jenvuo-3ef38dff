import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { AtSign, Inbox, Send, PenLine } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import { listSentEmails, sendAdminEmail, type SentEmail } from "@/lib/admin-email.functions";
import { EMAIL_BOXES, type EmailBox } from "@/lib/admin-email";
import { OpsPage, OpsState, OpsTab, OpsBadge, ops } from "@/components/ops/OpsPage";

const search = z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
  box: z.enum(["support", "sales"]).optional(),
  reply: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/admin/emails")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Email box — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEmailsPage,
});

type Tab = "compose" | "sent";

function AdminEmailsPage() {
  const params = Route.useSearch();
  const checkAdmin = useServerFn(isAdmin);
  const fetchSent = useServerFn(listSentEmails);
  const send = useServerFn(sendAdminEmail);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("compose");
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [box, setBox] = useState<EmailBox>(params.box ?? "support");
  const [to, setTo] = useState(params.to ?? "");
  const [subject, setSubject] = useState(params.subject ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<SentEmail | null>(null);
  const [boxFilter, setBoxFilter] = useState<"all" | EmailBox>("all");

  const load = async () => {
    try {
      const { admin } = await checkAdmin();
      setAllowed(admin);
      if (admin) setSent(await fetchSent());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await send({ data: { box, to, subject, body, contactMessageId: params.reply } });
      if (r.ok) {
        toast.success(r.message);
        setTo(""); setSubject(""); setBody("");
      } else toast.error(r.message);
      setSent(await fetchSent());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      toast.error(msg.includes("[") ? "Check the address, subject and message." : msg);
    } finally {
      setBusy(false);
    }
  };

  const shown = useMemo(() => sent.filter((s) => boxFilter === "all" || s.from_box === boxFilter), [sent, boxFilter]);

  if (loading) return <OpsState title="Loading email box…" />;
  if (!allowed) return <OpsState title="Admin access required" description="Only admins can send team emails." />;

  const b = EMAIL_BOXES[box];

  return (
    <OpsPage
      title="Email box"
      description="Write and send emails from support@jenvu.com or sales@jenvu.com"
      icon={<AtSign />}
      actions={
        <Link to="/dashboard/admin/messages" className={ops.btn}>
          <Inbox className="h-3.5 w-3.5" /> Contact inbox
        </Link>
      }
      tabs={
        <>
          <OpsTab active={tab === "compose"} onClick={() => setTab("compose")}>Compose</OpsTab>
          <OpsTab active={tab === "sent"} onClick={() => setTab("sent")}>
            Sent <span className="ml-1.5 tabular-nums text-muted-foreground">{sent.length}</span>
          </OpsTab>
        </>
      }
    >
      {tab === "compose" ? (
        <form onSubmit={onSend} className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
          <div>
            <label className="mb-1.5 block text-[12px] text-muted-foreground">From</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(EMAIL_BOXES) as EmailBox[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setBox(k)}
                  aria-pressed={box === k}
                  className={`rounded-xl border px-4 py-3 text-left transition ${box === k ? "border-foreground bg-muted/50" : "border-border hover:bg-muted/30"}`}
                >
                  <span className="block text-[14px] font-medium text-foreground">{EMAIL_BOXES[k].label}</span>
                  <span className="block text-[13px] text-muted-foreground">{EMAIL_BOXES[k].address}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="em-to" className="mb-1.5 block text-[12px] text-muted-foreground">To (one address)</label>
            <input id="em-to" type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" className={ops.input} />
          </div>
          <div>
            <label htmlFor="em-subject" className="mb-1.5 block text-[12px] text-muted-foreground">Subject</label>
            <input id="em-subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={ops.input} />
          </div>
          <div>
            <label htmlFor="em-body" className="mb-1.5 block text-[12px] text-muted-foreground">Message</label>
            <textarea
              id="em-body"
              required
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hi,\n\n…\n\nBest,\n${b.label}`}
              className={`${ops.input} h-auto min-h-[240px] resize-y py-2.5 leading-relaxed`}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Replies go to <span className="text-foreground">{b.address}</span>. One person per email — not for newsletters or promotions.
            </p>
            <button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition hover:opacity-90 disabled:opacity-50">
              <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send email"}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-6">
            {(["all", "support", "sales"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setBoxFilter(k)} className={`rounded-full px-3 py-1 text-[13px] ${boxFilter === k ? "bg-foreground text-background" : "border border-border text-foreground hover:bg-muted"}`}>
                {k === "all" ? "All" : EMAIL_BOXES[k].address}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="px-6 py-16 text-center text-[13px] text-muted-foreground">No emails sent yet.</div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {shown.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setOpen(m)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40 sm:px-6">
                    <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-2">
                        <span className="truncate text-[13px] text-foreground">To {m.to_email}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <div className="truncate text-[13px] font-medium text-foreground">{m.subject}</div>
                      <div className="truncate text-xs text-muted-foreground">From {EMAIL_BOXES[m.from_box]?.address} · {m.body}</div>
                    </div>
                    <OpsBadge tone={m.status === "sent" ? "success" : m.status === "blocked" ? "warning" : "danger"}>{m.status}</OpsBadge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-2xl rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{new Date(open.created_at).toLocaleString()}</div>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{open.subject}</h2>
              <p className="mt-1 break-all text-sm text-muted-foreground">From {EMAIL_BOXES[open.from_box]?.address} · To {open.to_email}</p>
              {open.error && <p className="mt-2 text-[13px] text-destructive">{open.error}</p>}
            </div>
            <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap px-5 py-5 text-sm leading-relaxed text-foreground sm:px-6">{open.body}</div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
              <button
                type="button"
                className={ops.btn}
                onClick={() => { setBox(open.from_box); setTo(open.to_email); setSubject(open.subject.startsWith("Re:") ? open.subject : `Re: ${open.subject}`); setOpen(null); setTab("compose"); }}
              >
                Write again
              </button>
              <button type="button" className={ops.btn} onClick={() => setOpen(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </OpsPage>
  );
}
