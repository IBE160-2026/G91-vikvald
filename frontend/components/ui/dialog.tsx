"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { iconProps } from "@/components/icon";
import { cn } from "@/lib/utils";

// shadcn/ui dialog (Radix), adapted to DESIGN.md "dialog": white, rounded.xl, a
// thin border-card edge and the float shadow, over the scrim (scrim at 42 %).
//
// Radix gives the focus trap, Esc, the scroll lock on body and aria-hidden on
// everything outside the dialog. On top of that the rest of the page gets
// `inert`, so it can be neither clicked nor focused while the dialog is open.
//
// The content lies inside the scrim (Radix's pattern for a scrollable scrim),
// so the dialog is centred with flex and the scrim is its parent element.

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 flex items-center justify-center bg-scrim-veil p-4", className)}
      {...props}
    />
  );
}

// Puts `inert` on everything in body outside `target`, like Radix puts
// aria-hidden there: live regions (aria-live) and scripts are left alone, and
// elements that were inert already stay inert afterwards. Returns the undo.
//
// Not `inertOthers` from the aria-hidden package: it shares one counter per
// element with Radix's `hideOthers`, so when both run on the same elements,
// aria-hidden or inert is left on the page after the dialog closes.
export function inertOthers(target: HTMLElement): () => void {
  const body = target.ownerDocument.body;
  const keep = [target, ...body.querySelectorAll<HTMLElement>("[aria-live], script")];
  const ancestors = new Set<Element>();
  for (const element of keep) {
    for (let node = element.parentElement; node && node !== body; node = node.parentElement) {
      ancestors.add(node);
    }
  }
  const made: Element[] = [];
  const walk = (parent: Element) => {
    for (const child of parent.children) {
      if (keep.includes(child as HTMLElement)) continue;
      if (ancestors.has(child)) walk(child);
      else if (!child.hasAttribute("inert")) {
        child.setAttribute("inert", "");
        made.push(child);
      }
    }
  };
  walk(body);
  return () => made.forEach((element) => element.removeAttribute("inert"));
}

// Makes the rest of the page inert while the dialog is shown. It runs after
// Radix has moved focus into the dialog, so the element that opened it is not
// made inert while it still has focus.
function useInertOthers() {
  const [node, setNode] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => (node ? inertOthers(node) : undefined), [node]);
  return setNode;
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const setInertNode = useInertOthers();
  const composedRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      setInertNode(element);
      setRef(ref, element);
    },
    [ref, setInertNode],
  );

  return (
    <DialogPortal>
      <DialogOverlay>
        <DialogPrimitive.Content
          ref={composedRef}
          data-slot="dialog-content"
          // Radix hides the rest with aria-hidden, but does not set aria-modal itself.
          aria-modal="true"
          className={cn(
            "relative max-h-full w-full max-w-full overflow-y-auto rounded-xl border border-border-card bg-surface shadow-float",
            className,
          )}
          {...props}
        >
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              aria-label="Lukk"
              className="absolute top-4 right-4 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover"
            >
              <XIcon {...iconProps} size={20} />
            </DialogPrimitive.Close>
          ) : null}
          {children}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 px-5 pt-5", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex justify-end gap-3 border-t border-divider px-5 py-4", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-dialog-title", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body text-ink-muted", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
