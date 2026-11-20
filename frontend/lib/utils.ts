import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The token names from app/globals.css (DESIGN.md) that tailwind-merge does not
// know by itself. Without them it reads e.g. `text-label` as a colour and drops
// it when `text-ink` comes later in the same list, or keeps both `h-button-height`
// and `h-button-height-lg`. A test (lib/utils.test.ts) checks that the lists
// match globals.css.
export const themeTokens = {
  text: [
    "page-title",
    "session-counter",
    "result-title",
    "quiz-question",
    "dialog-title",
    "card-answer",
    "card-question",
    "section-title",
    "item-title",
    "body",
    "body-sm",
    "label",
    "meta",
    "meta-strong",
    "caption",
    "overline",
    "kbd",
  ],
  spacing: [
    "topbar-height",
    "sidebar-width",
    "content-inset",
    "content-margin-right",
    "home-margin",
    "card-gap",
    "column-gap",
    "menu-row",
    "table-row",
    "file-row",
    "create-row",
    "button-height",
    "button-height-lg",
    "field-height",
    "grid-cell",
    "grid-gap",
    "flashcard-width",
    "quiz-column",
    "article-width",
    "auth-card-width",
  ],
  radius: ["kbd", "option"],
  shadow: ["lift", "float"],
} as const;

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...themeTokens.text],
      spacing: [...themeTokens.spacing],
      radius: [...themeTokens.radius],
      shadow: [...themeTokens.shadow],
    },
  },
});

// Joins class names (clsx) and lets a later class win over an earlier one of
// the same kind (tailwind-merge), so a component can take extra classes.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
