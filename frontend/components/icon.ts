import type { LucideProps } from "lucide-react";

// Shared settings for lucide-react icons (DESIGN.md "Shapes"): drawn on a 16 px
// grid with a 1.5 px line. absoluteStrokeWidth keeps the line at 1.5 px at any size.
// Icons are decoration next to text, so screen readers skip them.
export const iconProps = {
  size: 16,
  strokeWidth: 1.5,
  absoluteStrokeWidth: true,
  "aria-hidden": true,
  focusable: false,
} as const satisfies LucideProps;
