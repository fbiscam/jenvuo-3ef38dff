import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { AtSign, Inbox, Send, PenLine, Mail } from "lucide-react";
import { isAdmin, listContactMessages, updateContactMessageStatus, type ContactMessage } from "@/lib/admin-messages.functions";
import { listSentEmails, sendAdminEmail, type SentEmail } from "@/lib/admin-email.functions";
import { EMAIL_BOXES, type EmailBox } from "@/lib/admin-email";
import { OpsPage, OpsState, OpsTab, OpsBadge, ops } from "@/components/ops/OpsPage";

const search = z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
  box: z.enum(["support", "sales"]).optional(),
  reply: z.string().uuid().optional(),
});


type Tab = "received" | "compose" | "sent";

export function AdminEmailsPage() {
  const params = Route.useSearch();
  const checkAdmin = useServerFn(isAdmin);
  const fetchSent = useServerFn(listSentEmails);
  const send = useServerFn(sendAdminEmail);
  const fetchReceived = useServerFn(listContactMessages);
  const setStatus = useServerFn(updateContactMessageStatus);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  // Opening a reply link lands on Compose; otherwise the inbox comes first.
  const [tab, setTab] = useState<Tab>(params.to || params.reply ? "compose" : "received");
  const [received, setReceived] = useState<ContactMessage[]>([]);
  const [openMsg, setOpenMsg] = useState<ContactMessage | null>(null);
  const [replyId, setReplyId] = useState<string | undefined>(params.reply);
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
      if (admin) {
        const [s, r] = await Promise.all([fetchSent(), fetchReceived().catch(() => [] as ContactMessage[])]);
        setSent(s);
        setReceived(r);
      }
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
      const r = await send({ data: { box, to, subject, body, contactMessageId: replyId } });
      if (r.ok) {
        toast.success(r.message);
        setTo(""); setSubject(""); setBody(""); setReplyId(undefined);
        if (replyId) setReceived((list) => list.map((m) => (m.id === replyId ? { ...m, status: "replied" } : m)));
      } else toast.error(r.message);
      setSent(await fetchSent());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      toast.error(msg.includes("[") ? "Check the address, subject and message." : msg);
    } finally {
      setBusy(false);
    }
  };

  const unread = received.filter((m) => m.status === "new").length;
  const openReceived = (m: ContactMessage) => {
    setOpenMsg(m);
    if (m.status === "new") {
      setReceived((list) => list.map((x) => (x.id === m.id ? { ...x, status: "read" } : x)));
      void setStatus({ data: { id: m.id, status: "read" } }).catch(() => {});
    }
  };
  const replyTo = (m: ContactMessage) => {
    setBox(/sales|plans|partnership/i.test(m.subject) ? "sales" : "support");
    setTo(m.email);
    setSubject(m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`);
    setBody(`Hi ${m.name.split(" ")[0] || "there"},\n\n\n\n---\nOn ${new Date(m.created_at).toLocaleString()}, ${m.name} wrote:\n${m.message}`);
    setReplyId(m.id);
    setOpenMsg(null);
    setTab("compose");
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
        <Link to="/ops-x9k2-7m4n/messages" className={ops.btn}>
          <Inbox className="h-3.5 w-3.5" /> Contact inbox
        </Link>
      }
      tabs={
        <>
          <OpsTab active={tab === "received"} onClick={() => setTab("received")} count={unread}>
            Received <span className="ml-1.5 tabular-nums text-muted-foreground">{received.length}</span>
          </OpsTab>
          <OpsTab active={tab === "compose"} onClick={() => setTab("compose")}>Compose</OpsTab>
          <OpsTab active={tab === "sent"} onClick={() => setTab("sent")}>
            Sent <span className="ml-1.5 tabular-nums text-muted-foreground">{sent.length}</span>
          </OpsTab>
        </>
      }
    >
      {tab === "received" ? (
        received.length === 0 ? (
          <div className="px-6 py-16 text-center text-[13px] text-muted-foreground">No one has contacted you yet.</div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {received.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => openReceived(m)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40 sm:px-6">
                  <Mail className={`mt-0.5 h-4 w-4 shrink-0 ${m.status === "new" ? "text-foreground" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2">
                      <span className={`truncate text-[13px] text-foreground ${m.status === "new" ? "font-semibold" : ""}`}>{m.name} · {m.email}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className={`truncate text-[13px] text-foreground ${m.status === "new" ? "font-semibold" : "font-medium"}`}>{m.subject}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.phone ? `WhatsApp ${m.phone} · ` : ""}{m.message}</div>
                  </div>
                  <OpsBadge tone={m.status === "new" ? "danger" : m.status === "replied" ? "success" : "neutral"}>{m.status}</OpsBadge>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : tab === "compose" ? (
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

      {openMsg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={() => setOpenMsg(null)}>
          <div className="w-full max-w-2xl rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{new Date(openMsg.created_at).toLocaleString()}</div>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{openMsg.subject}</h2>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                From {openMsg.name} · <a href={`mailto:${openMsg.email}`} className="underline">{openMsg.email}</a>
                {openMsg.phone && (
                  <> · WhatsApp <a href={`https://wa.me/${openMsg.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline">{openMsg.phone}</a></>
                )}
              </p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap px-5 py-5 text-sm leading-relaxed text-foreground sm:px-6">{openMsg.message}</div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
              <button type="button" className={ops.btnPrimary} onClick={() => replyTo(openMsg)}>Reply</button>
              <button type="button" className={ops.btn} onClick={() => setOpenMsg(null)}>Close</button>
            </div>
          </div>
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
