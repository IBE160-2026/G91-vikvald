"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { iconProps } from "./icon";
import { Button, type ButtonVariant } from "./ui/button";
import {
  Dialog as DialogRoot,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "./ui/dialog";

// dialog (DESIGN.md "Forms and dialogs", EXPERIENCE.md): white, rounded.xl, thin
// border-card edge and the float shadow, over the scrim. Title and a close cross
// at the top, the content, a divider, and the buttons «Avbryt» then the main
// action at the bottom right. A dialog that only shows something (no main
// action, e.g. the terms on the account page) has one outline button «Lukk»
// instead, and it gets focus first. Dialogs are never stacked.
//
// Built on the shadcn/ui Dialog (Radix). Keyboard: focus moves into the dialog
// when it opens, Tab and Shift+Tab stay inside it, Esc closes it without
// running the main action, and focus goes back to the element that opened it.
// The rest of the page is inert and cannot scroll. A click on the scrim does
// not close the dialog (EXPERIENCE.md: Esc, the cross or «Avbryt»).

export type DialogWidth = 560 | 640 | 720;

const widthClasses: Record<DialogWidth, string> = {
  560: "w-[560px]",
  640: "w-[640px]",
  720: "w-[720px]",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  // Called by «Avbryt» (or «Lukk»), the close cross and Esc.
  onClose: () => void;
  // Left out for a dialog that only shows something: the footer then has the
  // single button «Lukk».
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: Extract<ButtonVariant, "primary" | "danger">;
    // Not active until the dialog's content allows it (e.g. a checkbox is ticked).
    disabled?: boolean;
    // An icon before the label (e.g. the upload icon in «Godta og last opp»).
    icon?: ReactNode;
  };
  width?: DialogWidth;
  // Where focus goes when the dialog closes. When it gives an element, that
  // element gets focus; otherwise the opener does (as before). Used when the
  // opener is gone, e.g. a deleted file's row (#75).
  returnFocus?: () => HTMLElement | null;
  // «Avbryt» is not active (e.g. while a delete runs and cannot be taken back).
  cancelDisabled?: boolean;
};

function focusableIn(element: HTMLElement | null): HTMLElement[] {
  return element ? [...element.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  primaryAction,
  width = 560,
  returnFocus,
  cancelDisabled = false,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The element that had focus when the dialog opened. Focus goes back to it.
  const openerRef = useRef<HTMLElement | null>(null);

  // When «Avbryt» is active again (e.g. after a failed delete), the button that
  // had focus may have been disabled meanwhile, leaving focus on body. Then
  // focus goes to «Avbryt», so the keyboard stays in the dialog.
  const wasCancelDisabled = useRef(cancelDisabled);
  useEffect(() => {
    const was = wasCancelDisabled.current;
    wasCancelDisabled.current = cancelDisabled;
    if (!open || !was || cancelDisabled) return;
    if (!contentRef.current?.contains(document.activeElement)) cancelRef.current?.focus();
  }, [open, cancelDisabled]);

  // After a click on the scrim, focus is on body. Radix still closes on Esc
  // (it listens on the document), but its focus trap only sees Tab inside the
  // dialog, so Tab and Shift+Tab from outside are sent into the dialog here.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      const content = contentRef.current;
      if (event.key !== "Tab" || !content || content.contains(document.activeElement)) return;
      const focusable = focusableIn(content);
      if (focusable.length === 0) return;
      event.preventDefault();
      (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <DialogRoot open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent
        ref={contentRef}
        showCloseButton={false}
        // The dialogs have no separate description; the content says it all.
        aria-describedby={undefined}
        className={widthClasses[width]}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          // A delete confirmation always starts on «Avbryt», never on the danger
          // button (UX-DR21), and a dialog without a main action on «Lukk».
          // Otherwise the first field or button in the content, and without
          // one «Avbryt» (the safe choice).
          const first =
            !primaryAction || primaryAction.variant === "danger" ? null : focusableIn(bodyRef.current)[0];
          (first ?? cancelRef.current)?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (returnFocus?.() ?? openerRef.current)?.focus();
          openerRef.current = null;
        }}
        // A click on the scrim does not close the dialog.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose
            aria-label="Lukk"
            disabled={cancelDisabled}
            className="-mr-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X {...iconProps} size={20} />
          </DialogClose>
        </div>
        <div ref={bodyRef} className="px-5 pt-4 pb-5">
          {children}
        </div>
        <DialogFooter>
          <Button ref={cancelRef} variant="outline" disabled={cancelDisabled} onClick={onClose}>
            {primaryAction ? "Avbryt" : "Lukk"}
          </Button>
          {primaryAction ? (
            <Button
              variant={primaryAction.variant ?? "primary"}
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
