"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";

import { iconProps } from "@/components/icon";
import { cn } from "@/lib/utils";

import { inertOthers } from "./dialog";

// shadcn/ui sheet (Radix Dialog), adapted to DESIGN.md: a panel from the left,
// sidebar-width (288 px) on paper with a hairline on the right, over the scrim
// (scrim at 42 %). Used for the side menu and the session panel on a narrow
// screen (story 3.4).
//
// Radix gives the focus trap, Esc and aria-hidden on the rest; as in the dialog,
// the rest of the page also gets `inert`. The panel lies inside the scrim, and
// a click on the scrim itself calls `onScrimClick` (the side menu closes the
// panel; the dialogs do not close that way). No slide animation. The close
// cross is called «Lukk».

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-section-title", className)} {...props} />;
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

function SheetContent({
  className,
  children,
  ref,
  onScrimClick,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { onScrimClick?: () => void }) {
  const [node, setNode] = React.useState<HTMLElement | null>(null);
  // Runs after Radix has moved focus into the panel (see ui/dialog.tsx).
  React.useEffect(() => (node ? inertOthers(node) : undefined), [node]);
  const composedRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      setNode(element);
      setRef(ref, element);
    },
    [ref],
  );

  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 flex bg-scrim-veil"
        onClick={(event) => {
          if (event.target === event.currentTarget) onScrimClick?.();
        }}
      >
        <SheetPrimitive.Content
          ref={composedRef}
          data-slot="sheet-content"
          aria-modal="true"
          className={cn(
            "relative flex h-full w-sidebar-width max-w-full flex-col overflow-y-auto border-r border-divider bg-paper",
            className,
          )}
          {...props}
        >
          <SheetPrimitive.Close
            data-slot="sheet-close"
            aria-label="Lukk"
            className="absolute top-3 right-3 z-10 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover"
          >
            <XIcon {...iconProps} size={20} />
          </SheetPrimitive.Close>
          {children}
        </SheetPrimitive.Content>
      </SheetPrimitive.Overlay>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetContent, SheetTitle };
