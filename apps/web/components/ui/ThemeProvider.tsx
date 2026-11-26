"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The print version is always light, whatever the viewer's theme.
  const forcedTheme = usePathname()?.endsWith("/print") ? "light" : undefined;
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange forcedTheme={forcedTheme}>
      {children}
    </NextThemes>
  );
}
