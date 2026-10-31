// Browser-only helpers for the Chat page: turn picked files into data the model can read.
// Images are shrunk to JPEG data URLs; documents become plain text (PDF text via unpdf).

export type ChatAttachment =
  | { id: string; kind: "image"; name: string; url: string }
  | { id: string; kind: "doc"; name: string; text: string; truncated: boolean };

export const DOC_MAX_CHARS = 30_000;
const IMAGE_MAX_SIDE = 1568;

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
export const DOC_ACCEPT =
  ".pdf,.txt,.md,.csv,.json,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql,.yaml,.yml,.log,.mq4,.mq5,.mqh";

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function shrinkImage(file: File): Promise<string> {
  const src = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("bad image"));
    el.src = src;
  });
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function readDocText(file: File): Promise<string> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text ?? "");
  }
  return file.text();
}

export async function readAttachment(file: File, kind: "image" | "doc"): Promise<ChatAttachment> {
  const id = crypto.randomUUID();
  if (kind === "image") {
    if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB.`);
    return { id, kind, name: file.name, url: await shrinkImage(file) };
  }
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is larger than 15 MB.`);
  const raw = (await readDocText(file)).trim();
  if (!raw) throw new Error(`No readable text found in ${file.name}.`);
  return { id, kind, name: file.name, text: raw.slice(0, DOC_MAX_CHARS), truncated: raw.length > DOC_MAX_CHARS };
}

/** Message text the model receives: the user's words plus each document's text. */
export function composeMessage(text: string, files: ChatAttachment[]): string {
  const parts = [text.trim()];
  for (const f of files) {
    if (f.kind === "doc") {
      parts.push(`[Attached document: ${f.name}${f.truncated ? " (first part only)" : ""}]\n${f.text}`);
    } else {
      parts.push(`[Attached image: ${f.name}]`);
    }
  }
  return parts.filter(Boolean).join("\n\n");
}
