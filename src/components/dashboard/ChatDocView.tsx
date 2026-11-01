import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ChevronDown, Download, FileDown, FileText, Maximize2, Minimize2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReplyDocument } from "@/lib/chat-files";

/** Markdown → safe HTML for the document page and its PDF export. */
export function documentHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false, gfm: true }) as string;
  return typeof window === "undefined" ? "" : DOMPurify.sanitize(raw);
}

// Print styles: the same page look, on paper.
const PRINT_CSS = `
*{box-sizing:border-box}body{margin:0;font-family:'Google Sans Flex','Google Sans',system-ui,sans-serif;color:#111;background:#fff}
.doc{max-width:760px;margin:0 auto;padding:40px 36px;font-size:13.5px;line-height:1.65}
.doc>p:first-child{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#555;font-weight:600}
.doc h1{font-size:26px;margin:6px 0 18px;padding-bottom:14px;border-bottom:2px solid #2563eb}
.doc h2{font-size:17px;margin:26px 0 10px;padding-left:10px;border-left:3px solid #2563eb}
.doc h3{font-size:15px;margin:18px 0 8px}
.doc blockquote{margin:14px 0;padding:10px 14px;border-left:3px solid #2563eb;background:#eff4ff;border-radius:6px}
.doc blockquote p{margin:4px 0}
.doc table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12.5px}
.doc th,.doc td{border:1px solid #d9dee8;padding:8px 10px;text-align:left;vertical-align:top}
.doc th{background:#f3f5f9;font-weight:600}
.doc code{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#f3f5f9;padding:1px 4px;border-radius:4px}
@page{margin:14mm}`;

function safeName(title: string) {
  return title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "Jenvu_document";
}

/** Opens the print dialog, where "Save as PDF" writes the file. */
export function exportDocumentPdf(doc: ReplyDocument) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  const title = doc.title.replace(/[<>&"]/g, "");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body><article class="doc">${documentHtml(doc.markdown)}</article></body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

function downloadMarkdown(doc: ReplyDocument) {
  const url = URL.createObjectURL(new Blob([doc.markdown], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(doc.title)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = { doc: ReplyDocument; busy: boolean; menuTheme: string; onClose: () => void };

/** Formatted document page (PDF-style) shown beside the chat. */
export function ChatDocView({ doc, busy, menuTheme, onClose }: Props) {
  const [full, setFull] = useState(false);
  const html = useMemo(() => documentHtml(doc.markdown), [doc.markdown]);

  return (
    <div className={`chat-docview flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl ${full ? "fixed inset-3 z-50" : ""}`}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <FileText className="h-4 w-4 shrink-0 opacity-60" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{doc.title}</span>
        {busy && <span className="text-[12px] opacity-60">Updating…</span>}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ring-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              <FileDown className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`${menuTheme} w-[220px] rounded-xl border-border bg-background p-1.5 text-foreground`}>
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-[14px]" onSelect={() => exportDocumentPdf(doc)}>
              <Download className="h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-[14px]" onSelect={() => downloadMarkdown(doc)}>
              <FileText className="h-4 w-4" /> Download Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" onClick={() => setFull((v) => !v)} aria-label={full ? "Exit full screen" : "Full screen"} className="rounded-md p-1.5 opacity-70 hover:opacity-100">
          {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onClose} aria-label="Close document" className="rounded-md p-1.5 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-6">
        <article className="chat-doc mx-auto max-w-[760px] rounded-lg px-6 py-8 sm:px-12 sm:py-10" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
