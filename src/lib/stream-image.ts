// Browser helper: reads the image SSE stream and reports each preview frame.
import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type ImagePayload = { type?: string; b64_json?: string; error?: { message?: string } };

/** Error with the HTTP status, so the page can show a clear message. */
export class ImageStreamError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

async function failure(res: Response): Promise<ImageStreamError> {
  const text = await res.text().catch(() => "");
  let msg = "";
  try {
    const j = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    msg = (typeof j.error === "string" ? j.error : j.error?.message) ?? j.message ?? "";
  } catch {
    msg = "";
  }
  return new ImageStreamError(msg || `Image generation failed (${res.status}).`, res.status);
}

export async function streamImage(
  endpoint: string,
  input: Record<string, unknown>,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
  signal?: AbortSignal,
  headers?: HeadersInit,
): Promise<void> {
  const send = (stream: boolean) => {
    signal?.throwIfAborted();
    const requestHeaders = new Headers(headers);
    const payload: Record<string, unknown> = { ...input, stream };
    if (!stream) delete payload["partial_images"];
    requestHeaders.set("Content-Type", "application/json");
    return fetch(endpoint, { method: "POST", headers: requestHeaders, body: JSON.stringify(payload), signal: signal ?? null });
  };
  const res = await send(true);
  if (!res.ok || !res.body) throw await failure(res);

  let sawCompleted = false;
  let sawAnyEvent = false;
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: ImagePayload | undefined;
      try {
        payload = JSON.parse(event.data) as ImagePayload;
      } catch {
        payload = undefined;
      }
      if (event.event === "error" || payload?.type === "error") {
        sawAnyEvent = true;
        streamError = payload?.error?.message ?? "Image generation failed";
        return;
      }
      const type = event.event || payload?.type;
      if (type !== "image_generation.partial_image" && type !== "image_generation.completed") return;
      sawAnyEvent = true;
      if (!payload?.b64_json) {
        streamError = "Image event contained no image";
        return;
      }
      const b64 = payload.b64_json;
      const isFinal = type === "image_generation.completed";
      flushSync(() => onFrame(`data:image/png;base64,${b64}`, isFinal));
      if (isFinal) sawCompleted = true;
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<string>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal?.aborted || sawAnyEvent || (error instanceof Error && error.name === "AbortError")) throw error;
        break;
      }
      if (chunk.done) break;
      parser.feed(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  signal?.throwIfAborted();
  if (streamError) throw new ImageStreamError(streamError);
  if (!sawAnyEvent) {
    const replay = await send(false);
    if (!replay.ok) throw await failure(replay);
    const json = (await replay.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new ImageStreamError("Image generation returned no image");
    onFrame(`data:image/png;base64,${b64}`, true);
    return;
  }
  if (!sawCompleted) throw new ImageStreamError("Image stream ended without a completed event");
}
