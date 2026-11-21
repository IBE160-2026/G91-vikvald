// The six subject colours (DESIGN.md "Emnefarger"), in the order new subjects
// get them. The backend stores the position as color_index (0-5).
// Subject colours are only for the dot and the timeline, never for buttons,
// surfaces or text, and the name always stands next to the colour.

export const SUBJECT_COLORS = ["#B83E0C", "#0B6585", "#2D6A3B", "#A8326E", "#8A6A00", "#00766E"] as const;

// Written out in full so Tailwind finds the class names in the source.
const DOT_CLASSES = [
  "bg-subject-1",
  "bg-subject-2",
  "bg-subject-3",
  "bg-subject-4",
  "bg-subject-5",
  "bg-subject-6",
] as const;

// The background class for a subject's colour. Any number is mapped into 0-5.
export function subjectColorClass(colorIndex: number): string {
  const count = DOT_CLASSES.length;
  const index = ((Math.trunc(colorIndex) % count) + count) % count;
  return DOT_CLASSES[Number.isNaN(index) ? 0 : index];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

// WCAG contrast ratio between two #RRGGBB colours (1 to 21).
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
