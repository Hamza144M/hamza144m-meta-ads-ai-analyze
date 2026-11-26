"use client";

import { ArrowUp, Bot, Loader2, RotateCcw, Square, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { askReport, type ChatTurn } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";

const SUGGESTIONS = [
  "Why is my CPM high?",
  "Why is my CTR low?",
  "How can I reduce CPA?",
  "Why isn't my campaign getting results?",
  "Should I duplicate this campaign?",
  "Which campaign should I scale?",
];

export function ChatPanel({ reportId }: { reportId: string }) {
  const storageKey = `maa-chat-${reportId}`;
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Per-viewer convenience: keep the conversation across reloads.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* storage unavailable */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, storageKey]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setInput("");
    const history: ChatTurn[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await askReport(
        reportId,
        history,
        (delta) =>
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + delta };
            return copy;
          }),
        controller.signal,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <div className="card flex h-[calc(100vh-14rem)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Ask your Meta Ads consultant</p>
            <p className="text-xs text-slate-500">Answers use the numbers in this report</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setMessages([])} disabled={busy}>
            <RotateCcw className="h-3.5 w-3.5" /> New chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl pt-6 text-center">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">What would you like to know?</p>
            <p className="mt-1 text-sm text-slate-500">Pick a question or ask your own.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                m.role === "user" ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200" : "bg-brand-600 text-white",
              )}
            >
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </span>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-tr-sm bg-brand-600 text-white"
                  : "rounded-tl-sm bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-200",
              )}
            >
              {m.role === "assistant" && !m.content ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Thinking" />
              ) : m.role === "assistant" ? (
                <Markdown text={m.content} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {error && (
          <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-100 p-3 dark:border-white/5">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-white/10 dark:bg-white/5">
          <label htmlFor="chat-input" className="sr-only">
            Ask a question about this report
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="e.g. Which ad should I turn off first?"
            className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="btn-secondary h-9 w-9 p-0" aria-label="Stop">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="btn-primary h-9 w-9 p-0" aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
