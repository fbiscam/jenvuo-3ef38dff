import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export type VoicePresetKey = "aria" | "orion" | "nova" | "atlas";

export const VOICE_PRESETS: {
  key: VoicePresetKey;
  label: string;
  desc: string;
  match: RegExp;
  lang: RegExp;
  pitch: number;
  rate: number;
}[] = [
  { key: "aria",  label: "Aria",  desc: "Warm female · US",   match: /samantha|google us english|aria|jenny|zira|female/i, lang: /en-US/i, pitch: 1.05, rate: 1.0 },
  { key: "nova",  label: "Nova",  desc: "Soft female · UK",   match: /karen|serena|kate|google uk english female|female/i, lang: /en-GB/i, pitch: 1.1,  rate: 0.98 },
  { key: "orion", label: "Orion", desc: "Deep male · UK",     match: /daniel|google uk english male|oliver|male/i,         lang: /en-GB/i, pitch: 0.9,  rate: 1.0 },
  { key: "atlas", label: "Atlas", desc: "Confident male · US",match: /alex|david|fred|google us english male|male/i,        lang: /en-US/i, pitch: 0.95, rate: 1.04 },
];

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcriptId, setTranscriptId] = useState(0);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [wordPulse, setWordPulse] = useState(0);
  const [voicePreset, setVoicePresetState] = useState<VoicePresetKey>("orion");
  const recognitionRef = useRef<SR | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicePresetRef = useRef<VoicePresetKey>("orion");
  const wantListeningRef = useRef(false);
  const startingRef = useRef(false);
  const pausedRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  const safeStart = useCallback((deferred = false) => {
    if (startingRef.current) return;
    startingRef.current = true;
    const run = () => {
      try {
        recognitionRef.current?.start();
        setNeedsGesture(false);
        setListening(true);
      } catch (error: any) {
        const name = String(error?.name || error?.message || "").toLowerCase();
        if (name.includes("notallowed") || name.includes("permission")) {
          wantListeningRef.current = false;
          setNeedsGesture(true);
          setListening(false);
        }
        // InvalidStateError means it is already running — keep the UI active.
        if (name.includes("invalidstate")) setListening(true);
      } finally {
        startingRef.current = false;
      }
    };
    if (deferred) {
      restartTimerRef.current = window.setTimeout(run, 220);
    } else {
      // Initial start must happen inside the direct click/tap handler.
      run();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    // en-US recognizes English + Hinglish reliably across Chrome/Edge.
    // ur-PK silently returns no results for most accents.
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        setTranscript(finalText.trim());
        setTranscriptId((id) => id + 1);
      }
    };
    rec.onstart = () => setListening(true);
    rec.onend = () => {
      // auto-restart if user still wants to listen (continuous mode)
      if (wantListeningRef.current && !pausedRef.current) {
        // keep UI in "listening" — don't flicker to Standby between restarts
        safeStart(true);
      } else {
        setListening(false);
      }
    };
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        wantListeningRef.current = false;
        setNeedsGesture(true);
        setListening(false);
      } else if (e?.error === "no-speech" || e?.error === "aborted" || e?.error === "network") {
        // transient — let onend handle restart
      } else {
        setListening(false);
      }
    };
    recognitionRef.current = rec;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => /en/i.test(v.lang) && /male|david|daniel|google uk english male/i.test(v.name)) ||
        voices.find((v) => /en-GB/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0] ||
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    return () => {
      wantListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { rec.stop(); } catch { /* ignore */ }
    };
  }, [safeStart]);

  const startListening = useCallback(() => {
    wantListeningRef.current = true;
    pausedRef.current = false;
    setNeedsGesture(false);
    setTranscript("");
    setInterim("");
    safeStart(false);
  }, [safeStart]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    pausedRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  // Pause listening during TTS, then resume if continuous mode was on
  const pauseListening = useCallback(() => {
    pausedRef.current = true;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const resumeIfWanted = useCallback(() => {
    if (wantListeningRef.current) {
      pausedRef.current = false;
      safeStart(true);
    }
  }, [safeStart]);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1.02;
    u.pitch = 0.95;
    u.volume = 1;
    u.onstart = () => { setSpeaking(true); setWordPulse((n) => n + 1); };
    u.onboundary = (ev: any) => {
      if (!ev || ev.name === undefined || ev.name === "word") setWordPulse((n) => n + 1);
    };
    u.onend = () => { setSpeaking(false); onDone?.(); };
    u.onerror = () => { setSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return {
    listening, speaking, transcript, transcriptId, interim, supported, needsGesture, wordPulse,
    startListening, stopListening, pauseListening, resumeIfWanted,
    speak, stopSpeaking, setTranscript,
    isContinuous: () => wantListeningRef.current,
  };
}
