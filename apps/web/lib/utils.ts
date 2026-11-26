import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Categorical chart colors in fixed order (CSS variables switch with the theme). */
export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);
