import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Image as ImageIcon, Send, Loader2, RefreshCw } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import { OpsPage, OpsState } from "@/components/ops/OpsPage";
import { Button } from '@/components/ui/button';
import {
  draftInsight,
  assistInsightWriting,
  generateInsightImage,
  listInsightsAdmin,
  publishInsight,
  dailyArticleStatus,
  controlDailyArticle,
  type InsightRow,
} from "@/lib/admin-insights.functions";


const ASSIST_ACTIONS = [
  ["improve", "Improve"],
  ["expand", "Expand"],
  ["shorten", "Shorten"],
  ["proofread", "Proofread"],
  ["continue", "Continue"],
  ["seo", "SEO meta"],
  ["headlines", "Headlines"],
] as const;

export function AdminInsightsPage() {
  const checkAdmin = useServerFn(isAdmin);
  const draft = useServerFn(draftInsight);
  const assist = useServerFn(assistInsightWriting);
  const makeImage = useServerFn(generateInsightImage);
  const listAll = useServerFn(listInsightsAdmin);
  const publish = useServerFn(publishInsight);
  const getDailyStatus = useServerFn(dailyArticleStatus);
  const controlDaily = useServerFn(controlDailyArticle);
  const [daily, setDaily] = useState<Awaited<ReturnType<typeof dailyArticleStatus>> | null>(null);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<InsightRow[]>([]);

  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Market Structure");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [assistOut, setAssistOut] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [articles, status] = await Promise.all([listAll(),getDailyStatus()]);
      setRows(articles);
      setDaily(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { admin } = await checkAdmin();
        setAllowed(admin);
        if (admin) await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onDraft = async () => {
    if (!topic.trim()) return toast.error("Enter a topic first");
    setBusy("draft");
    try {
      const d = await draft({ data: { topic, category } });
      setTitle(d.title);
      setSlug(d.slug);
      setExcerpt(d.excerpt);
      setContent(d.content);
      toast.success("Draft written by the AI assistant");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setBusy(null);
    }
  };

  const changeDaily = async (action: 'pause'|'resume'|'run') => {
    setBusy('daily');
    try {
      const result = await controlDaily({data:{action}});
      if ('error' in result && result.error) toast.error(String(result.error));
      else if ('skipped' in result && result.skipped) toast.info(String(result.skipped));
      else toast.success(action === 'run' ? 'Daily article run finished' : 'Daily publishing updated');
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Daily publishing failed'); }
    finally { setBusy(null); }
  };

  const onAssist = async (action: (typeof ASSIST_ACTIONS)[number][0]) => {
    if (content.trim().length < 20) return toast.error("Write or draft some content first");
    setBusy(action);
    try {
      const { result } = await assist({ data: { action, text: content } });
      if (action === "seo" || action === "headlines") {
        setAssistOut(result);
      } else if (action === "continue") {
        setContent((c) => `${c}\n\n${result}`);
      } else {
        setContent(result);
      }
      toast.success("Assistant finished");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setBusy(null);
    }
  };

  const onImage = async () => {
    if (!title.trim()) return toast.error("A title is needed for the cover image");
    setBusy("image");
    try {
      const { image_url } = await makeImage({
        data: { title, category, slug: slug || title },
      });
      setImageUrl(image_url);
      toast.success("Cover image generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image failed");
    } finally {
      setBusy(null);
    }
  };

  const onPublish = async () => {
    setBusy("publish");
    try {
      const { slug: published } = await publish({
        data: { title, slug: slug || title, excerpt, content, category, image_url: imageUrl || undefined },
      });
      toast.success(`Published /insights/${published}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async (row: InsightRow) => {
    setBusy(`img-${row.id}`);
    try {
      await makeImage({
        data: { title: row.title, category: row.category, slug: row.slug, insightId: row.id },
      });
      toast.success("Cover image regenerated");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <OpsState title="Loading insights…" />;
  if (!allowed) return <OpsState title="Admin access required" description="Sign in with an admin account to view this page." />;

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gc-blue focus:ring-2 focus:ring-gc-blue-soft";
  const btnCls =
    "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50";

  return (
    <OpsPage
      title="Insights writing desk"
      description="AI writing assistant with an AI-generated cover image for every article"
      icon={<Sparkles />}
    >
      <div className="space-y-6 px-4 py-5 sm:px-6">

        <section className="space-y-3 border-b border-border pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Daily articles</h2>
            <span className="text-xs text-muted-foreground">09:00 UTC · 1 article/day · US keyword research</span>
          </div>
          <p className="text-sm">Status: {daily?.status ?? 'Unknown'}{daily?.last_model ? ` · ${daily.last_model}` : ''}</p>
          {daily?.last_completed_at && <p className="text-xs text-muted-foreground">Last published: {new Date(daily.last_completed_at).toUTCString()}</p>}
          {daily?.last_error && <p role="alert" className="text-sm text-destructive">{daily.last_error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy !== null || daily?.status === 'running' || daily?.status === 'paused'} onClick={() => changeDaily('run')}><Sparkles />Run today</Button>
            <Button size="sm" variant="outline" disabled={busy !== null || daily?.status === 'running'} onClick={() => changeDaily(daily?.status === 'paused' ? 'resume' : 'pause')}>{daily?.status === 'paused' ? 'Resume' : 'Pause'}</Button>
            <Button size="sm" variant="ghost" aria-label="Refresh publishing status" onClick={refresh}><RefreshCw /></Button>
          </div>
          {daily?.research && <details><summary className="cursor-pointer text-xs font-medium">Keyword research and outreach candidates</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(daily.research,null,2)}</pre></details>}
        </section>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <input
            className={inputCls}
            placeholder="Topic or keyword — e.g. London killzone gold entries"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <button className={btnCls} disabled={busy !== null} onClick={onDraft}>
          {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Draft full article
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-5">
        <input className={inputCls} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputCls} placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input
          className={inputCls}
          placeholder="Excerpt / meta description"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <textarea
          className={`${inputCls} min-h-[320px] font-mono text-xs`}
          placeholder="Markdown content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {ASSIST_ACTIONS.map(([action, label]) => (
            <button key={action} className={btnCls} disabled={busy !== null} onClick={() => onAssist(action)}>
              {busy === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>

        {assistOut && (
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-xs">{assistOut}</pre>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button className={btnCls} disabled={busy !== null} onClick={onImage}>
            {busy === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Generate cover image
          </button>
          <button className={btnCls} disabled={busy !== null} onClick={onPublish}>
            {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish
          </button>
          {imageUrl && (
            <img src={imageUrl} alt="Generated cover" className="h-16 w-28 rounded-md object-cover" loading="lazy" />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Published insights</h2>
        <div className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 p-3">
              {row.image_url ? (
                <img src={row.image_url} alt={row.title} className="h-12 w-20 rounded object-cover" loading="lazy" />
              ) : (
                <div className="flex h-12 w-20 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                  no image
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /insights/{row.slug} · {row.category}
                </p>
              </div>
              <button className={btnCls} disabled={busy !== null} onClick={() => regenerate(row)}>
                {busy === `img-${row.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Image
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No insights yet.</p>}
        </div>
      </section>
      </div>
    </OpsPage>
  );
}
