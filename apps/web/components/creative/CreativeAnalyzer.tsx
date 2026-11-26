"use client";

import { AlertCircle, Film, ImageIcon, Loader2, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import type { CreativeAnalysisOutput } from "@maa/server";
import { useAuth } from "@/components/auth/AuthProvider";
import { analyzeCreative, type CreativeContext } from "@/lib/api";
import { MAX_IMAGE_MB, MAX_VIDEO_MB, prepareCreative, validateCreative, type PreparedCreative } from "@/lib/creative";
import { cn } from "@/lib/utils";
import { CreativeReport } from "./CreativeReport";

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.m4v";
const OBJECTIVES = ["Sales", "Leads", "Traffic", "Engagement", "Awareness", "Messages", "App installs"];

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-slate-900 dark:text-white";

export function CreativeAnalyzer() {
  const { refreshAccount } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [prepared, setPrepared] = useState<PreparedCreative | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<CreativeAnalysisOutput | null>(null);
  const [context, setContext] = useState<CreativeContext>({ objective: "Sales" });

  useEffect(() => {
    if (output) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [output]);

  const pick = async (file: File) => {
    const problem = validateCreative(file);
    setOutput(null);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPrepared(null);
    setPreparing(true);
    try {
      setPrepared(await prepareCreative(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "This file couldn't be read.");
    } finally {
      setPreparing(false);
    }
  };

  const run = async () => {
    if (!prepared) return;
    setError(null);
    setAnalyzing(true);
    try {
      setOutput(await analyzeCreative(prepared, context));
      void refreshAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setPrepared(null);
    setOutput(null);
    setError(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void pick(f);
  };

  const set = (key: keyof CreativeContext) => (e: { target: { value: string } }) => setContext((c) => ({ ...c, [key]: e.target.value }));

  return (
    <div className="space-y-8">
      {!prepared ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload an ad image or video"
          aria-busy={preparing}
          onClick={() => !preparing && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !preparing && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-16 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            dragging
              ? "scale-[1.01] border-brand-500 bg-brand-50/70 dark:bg-brand-500/10"
              : "border-slate-300 hover:border-brand-400 dark:border-white/15",
            preparing && "cursor-wait",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            data-testid="creative-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pick(f);
              e.target.value = "";
            }}
          />
          {preparing ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-brand-600" />
              <p className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">Reading your creative…</p>
              <p className="mt-1 text-sm text-slate-500">Videos are turned into key frames on your device</p>
            </>
          ) : (
            <>
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
                <UploadCloud className="h-8 w-8" />
              </span>
              <p className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">Drop your ad image or video</p>
              <p className="mt-1 text-sm text-slate-500">
                or <span className="font-semibold text-brand-600 dark:text-brand-400">browse files</span>
              </p>
              <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> JPG, PNG, WebP up to {MAX_IMAGE_MB} MB
                </span>
                <span className="inline-flex items-center gap-1">
                  <Film className="h-3.5 w-3.5" /> MP4, MOV, WebM up to {MAX_VIDEO_MB} MB
                </span>
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">{prepared.meta.fileName}</p>
              <p className="text-sm text-slate-500">
                {prepared.kind === "video" ? "Video" : "Image"} · {prepared.meta.width}×{prepared.meta.height}
                {prepared.meta.durationSec ? ` · ${prepared.meta.durationSec.toFixed(1)}s` : ""}
                {prepared.kind === "video" ? ` · ${prepared.frames.length} frames` : ""}
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={reset} disabled={analyzing}>
              <RotateCcw className="h-4 w-4" /> Choose another file
            </button>
          </div>
          <div className={cn("mt-4 flex gap-3 overflow-x-auto pb-2", prepared.kind === "image" && "justify-center")}>
            {prepared.frames.map((f, i) => (
              <figure key={i} className="shrink-0">
                <img
                  src={f.dataUrl}
                  alt={prepared.kind === "video" ? `Frame at ${(f.time ?? 0).toFixed(1)} seconds` : "Your ad image"}
                  className={cn(
                    "rounded-lg border border-slate-200 object-contain dark:border-white/10",
                    prepared.kind === "video" ? "h-36 w-auto" : "max-h-80 w-auto",
                  )}
                />
                {prepared.kind === "video" && (
                  <figcaption className="mt-1 text-center text-xs text-slate-500">{(f.time ?? 0).toFixed(1)}s</figcaption>
                )}
              </figure>
            ))}
          </div>

          <fieldset className="mt-6 grid gap-4 sm:grid-cols-2" disabled={analyzing}>
            <legend className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
              Optional details <span className="font-normal text-slate-500">(better answers)</span>
            </legend>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Product or offer
              <input
                className={inputClass}
                maxLength={300}
                placeholder="e.g. Organic face serum, 20% off"
                value={context.product ?? ""}
                onChange={set("product")}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Campaign objective
              <select className={inputClass} value={context.objective ?? ""} onChange={set("objective")}>
                {OBJECTIVES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">
              Target audience
              <input
                className={inputClass}
                maxLength={300}
                placeholder="e.g. Women 25-40 in Pakistan interested in skincare"
                value={context.audience ?? ""}
                onChange={set("audience")}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Current headline
              <input className={inputClass} maxLength={200} value={context.headline ?? ""} onChange={set("headline")} />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Current primary text
              <textarea
                className={cn(inputClass, "min-h-[42px]")}
                rows={2}
                maxLength={2000}
                value={context.primaryText ?? ""}
                onChange={set("primaryText")}
              />
            </label>
          </fieldset>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={run} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? "Analyzing your creative…" : output ? "Analyze again" : "Analyze creative"}
            </button>
            {analyzing && <p className="text-xs text-slate-500">This usually takes 20 to 60 seconds.</p>}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {output && (
        <div ref={resultRef} className="scroll-mt-24">
          <CreativeReport output={output} />
          <p className="mt-4 text-center text-xs text-slate-500">
            {prepared?.kind === "video" ? "Videos are reviewed from key frames, so sound and voiceover are not judged. " : ""}
            Your file is processed on your device and never stored.
          </p>
        </div>
      )}
    </div>
  );
}
