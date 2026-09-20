import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const WAV_PREFIX = "data:audio/wav;base64,";

function decodeWavDataUrl(value: string): Uint8Array {
  if (!value.startsWith(WAV_PREFIX)) {
    throw new Error("Please record a new voice message in WAV format.");
  }
  const encoded = value.slice(WAV_PREFIX.length);
  const estimatedBytes = Math.floor((encoded.length * 3) / 4);
  if (!encoded || estimatedBytes < 2048) throw new Error("That recording was empty. Please try again.");
  if (estimatedBytes > MAX_AUDIO_BYTES) throw new Error("Voice messages must be under 4 MB.");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function safeGatewayError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
    const message = parsed.message || parsed.error?.message;
    if (message) return message;
  } catch {
    // The upstream may return plain text.
  }
  if (status === 402) return "AI credits are unavailable for transcription.";
  if (status === 429) return "Voice transcription is busy. Please wait a moment and try again.";
  return "The voice message could not be transcribed. Please try again.";
}

function parseTranscriptEvents(payload: string): string {
  let transcript = "";
  let completed = "";
  for (const line of payload.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;
    try {
      const event = JSON.parse(raw) as { type?: string; delta?: string; text?: string };
      if (event.type === "transcript.text.delta" && event.delta) transcript += event.delta;
      if (event.type === "transcript.text.done" && event.text) completed = event.text;
    } catch {
      // Ignore malformed keep-alive events.
    }
  }
  return (completed || transcript).trim();
}

export const transcribeVoiceMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audioDataUrl: string }) => ({
    audioDataUrl: String(input?.audioDataUrl || ""),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Voice transcription is not configured.");

    const bytes = decodeWavDataUrl(data.audioDataUrl);
    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("stream", "true");
    form.append("file", new Blob([bytes], { type: "audio/wav" }), "recording.wav");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(safeGatewayError(response.status, body));
    const text = parseTranscriptEvents(body);
    if (!text) throw new Error("No speech was detected. Please record again.");
    return { text };
  });