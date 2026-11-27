"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice chat helpers built on the browser's own Web Speech API, so it costs nothing
 * and needs no extra API keys. Speaking a question works in Chrome, Edge and Safari;
 * reading answers aloud works in every modern browser.
 */

export interface VoiceLanguage {
  code: string;
  label: string;
}

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "ur-PK", label: "Urdu" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ar-SA", label: "Arabic" },
  { code: "bn-BD", label: "Bengali" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "tr-TR", label: "Turkish" },
  { code: "id-ID", label: "Indonesian" },
];

/** Best default: the browser's language if we list it, otherwise US English. */
export function defaultVoiceLanguage(): string {
  if (typeof navigator === "undefined") return "en-US";
  const nav = navigator.language || "en-US";
  const exact = VOICE_LANGUAGES.find((l) => l.code.toLowerCase() === nav.toLowerCase());
  if (exact) return exact.code;
  const base = nav.split("-")[0].toLowerCase();
  return VOICE_LANGUAGES.find((l) => l.code.split("-")[0] === base)?.code ?? "en-US";
}

// ---------- Speech to text ----------

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  "service-not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  "audio-capture": "No microphone was found. Plug one in or check your device settings.",
  network: "Voice input needs an internet connection. Please check your connection and try again.",
  "language-not-supported": "Your browser can't listen in this language yet. Pick another language or type your question.",
};

/**
 * Listen to the microphone and turn speech into text. `onText` gets the live transcript
 * while the person talks; `onDone` gets the final text when they stop.
 */
export function useSpeechInput(lang: string, onText: (text: string) => void, onDone: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const textRef = useRef("");
  const handlers = useRef({ onText, onDone });
  handlers.current = { onText, onDone };

  useEffect(() => setSupported(Boolean(recognitionCtor())), []);
  useEffect(() => () => recRef.current?.abort(), []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recRef.current) return;
    setError(null);
    textRef.current = "";
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      textRef.current = text.trim();
      handlers.current.onText(textRef.current);
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError(MIC_ERRORS[e.error] ?? "Voice input stopped. Please try again.");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      handlers.current.onDone(textRef.current);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setError("Couldn't start the microphone. Please try again.");
    }
  }, [lang]);

  return { supported, listening, error, start, stop };
}

// ---------- Text to speech ----------

/** Turn a Markdown answer into plain sentences that sound natural when read aloud. */
export function speakableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, " ") // table divider rows
    .replace(/\s*\|\s*/g, ", ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, "$1.")
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(/^\s*(\d+)[.)]\s+/gm, "$1. ")
    .replace(/(\*\*|__|\*|_|`|~~)/g, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/(\.\s*){2,}/g, ". ")
    .replace(/,\s*(,\s*)+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Short pieces, because some browsers cut off a long utterance after about 15 seconds. */
function chunks(text: string, max = 220): string[] {
  const sentences = text.split(/(?<=[.!?۔।])\s+/).map((x) => x + " ");
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    if (s.length > max) {
      for (const part of s.split(/(?<=[,;:])\s+/)) {
        if ((cur + part).length > max && cur) {
          out.push(cur.trim());
          cur = "";
        }
        cur += part + " ";
      }
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Pick the most natural-sounding installed voice for the language. */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const want = lang.toLowerCase();
  const base = want.split("-")[0];
  const match = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === want);
  const sameBase = voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base);
  const pool = match.length ? match : sameBase;
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** Read text aloud. Tracks which message is speaking so the UI can show a Stop button. */
export function useSpeechOutput(lang: string) {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    // Voices load asynchronously in Chrome.
    window.speechSynthesis.getVoices();
    const onVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id: number, markdown: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const run = ++runRef.current;
      const parts = chunks(speakableText(markdown));
      if (!parts.length) return;
      const voice = pickVoice(lang);
      setSpeakingId(id);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = voice?.lang ?? lang;
        if (voice) u.voice = voice;
        u.rate = 1;
        if (i === parts.length - 1) {
          u.onend = () => runRef.current === run && setSpeakingId(null);
        }
        u.onerror = () => runRef.current === run && setSpeakingId(null);
        synth.speak(u);
      });
    },
    [lang],
  );

  return { supported, speakingId, speak, stop };
}
