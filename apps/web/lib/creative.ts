/**
 * Browser-side preparation of ad creatives. Images are downscaled, and videos are
 * turned into a few still frames (the first 3 seconds plus the rest of the video),
 * so even a large video stays far below Vercel's ~4.5 MB request limit and never
 * leaves the user's device in full.
 */

export interface CreativeFrame {
  time?: number;
  dataUrl: string;
}

export interface PreparedCreative {
  kind: "image" | "video";
  frames: CreativeFrame[];
  meta: { fileName: string; width: number; height: number; durationSec?: number; sizeBytes: number };
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_IMAGE_MB = 30;
export const MAX_VIDEO_MB = 500;

function draw(source: CanvasImageSource, srcW: number, srcH: number, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this file.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

async function prepareImage(file: File): Promise<PreparedCreative> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode().catch(() => {
      throw new Error("This image couldn't be opened. Use a JPG, PNG or WebP file.");
    });
    return {
      kind: "image",
      frames: [{ dataUrl: draw(img, img.naturalWidth, img.naturalHeight, 1280, 0.85) }],
      meta: { fileName: file.name, width: img.naturalWidth, height: img.naturalHeight, sizeBytes: file.size },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function once(target: HTMLVideoElement, event: string, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    const ok = () => {
      clearTimeout(timer);
      target.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      clearTimeout(timer);
      target.removeEventListener(event, ok);
      reject(new Error("error"));
    };
    target.addEventListener(event, ok, { once: true });
    target.addEventListener("error", fail, { once: true });
  });
}

/** Frame times: 0, 1, 2, 3 s (the hook), then evenly spread over the rest, up to 8 frames. */
export function frameTimes(duration: number): number[] {
  const end = Math.max(0, duration - 0.1);
  const hook = [0, 1, 2, 3].filter((t) => t < end);
  const rest = duration > 4 ? [0.3, 0.5, 0.7, 0.95].map((p) => Math.max(3.5, p * duration)).filter((t) => t < end) : [];
  return [...new Set([...hook, ...rest].map((t) => Math.round(t * 10) / 10))].slice(0, 8);
}

async function prepareVideo(file: File): Promise<PreparedCreative> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await once(video, "loadeddata").catch(() => {
      throw new Error("Your browser can't read this video. Export it as an MP4 (H.264) and try again.");
    });
    const { videoWidth: width, videoHeight: height, duration } = video;
    if (!width || !height || !Number.isFinite(duration)) throw new Error("This video couldn't be read. Try an MP4 (H.264) file.");
    const frames: CreativeFrame[] = [];
    for (const time of frameTimes(duration)) {
      video.currentTime = time;
      await once(video, "seeked").catch(() => {
        throw new Error("Reading the video took too long. Try a shorter or smaller MP4 file.");
      });
      frames.push({ time, dataUrl: draw(video, width, height, 768, 0.8) });
    }
    if (!frames.length) throw new Error("No frames could be read from this video.");
    return { kind: "video", frames, meta: { fileName: file.name, width, height, durationSec: duration, sizeBytes: file.size } };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function validateCreative(file: File): string | null {
  const isImage = IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  const isVideo = VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  if (!isImage && !isVideo) return "Upload a JPG, PNG or WebP image, or an MP4, MOV or WebM video.";
  if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) return `Images must be under ${MAX_IMAGE_MB} MB.`;
  if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) return `Videos must be under ${MAX_VIDEO_MB} MB.`;
  return null;
}

export function prepareCreative(file: File): Promise<PreparedCreative> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  return isVideo ? prepareVideo(file) : prepareImage(file);
}
