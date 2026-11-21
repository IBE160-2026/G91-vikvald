"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// shadcn/ui sonner, adapted to DESIGN.md: a white card with a thin border-card
// edge and rounded.lg corners, ink text in Inter. Always the light theme (the
// app has no dark mode, so no next-themes). Sonner keeps its list in a region
// with aria-live="polite", so a message is read out without moving focus. The
// region is named in Norwegian («Varsler»; Alt+T moves focus to it).
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      containerAriaLabel="Varsler"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-border-card)",
          "--border-radius": "var(--radius-lg)",
          fontFamily: "var(--font-sans)",
        } as CSSProperties
      }
      toastOptions={{ classNames: { toast: "text-body-sm shadow-lift" } }}
      {...props}
    />
  );
}

export { Toaster };
