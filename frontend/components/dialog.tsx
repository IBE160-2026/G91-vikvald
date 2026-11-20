"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button, type ButtonVariant } from "./button";
import { iconProps } from "./icon";

// dialog (DESIGN.md "Forms and dialogs", EXPERIENCE.md): white, rounded.xl, thin
// border-card edge and the float shadow, over the scrim. Title and a close cross
// at the top, the content, a divider, and the buttons «Avbryt» then the main
// action at the bottom right. Dialogs are never stacked.
//
// Keyboard: focus moves into the dialog when it opens, Tab and Shift+Tab stay
// inside it, Esc closes it without running the main action, and focus goes
// back to the element that opened it.

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
  // Called by «Avbryt», the close cross and Esc.
  onClose: () => void;
  primaryAction: {
    label: string;
    onClick: () => void;
    variant?: Extract<ButtonVariant, "primary" | "danger">;
  };
  width?: DialogWidth;
};

export function Dialog(props: DialogProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<DialogPanel {...props} />, document.body);
}

function focusableIn(element: HTMLElement | null): HTMLElement[] {
  return element ? [...element.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
}

function DialogPanel({ title, children, onClose, primaryAction, width = 560 }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // First field or button in the content, otherwise «Avbryt» (the safe choice).
    (focusableIn(bodyRef.current)[0] ?? cancelRef.current)?.focus();
    return () => {
      opener?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = focusableIn(panelRef.current);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outside = !panelRef.current?.contains(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim-veil p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className={`${widthClasses[width]} max-h-full max-w-full overflow-y-auto rounded-xl border border-border-card bg-surface shadow-float`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <h2 id={titleId} className="text-dialog-title">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Lukk"
            onClick={onClose}
            className="-mr-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover"
          >
            <X {...iconProps} size={20} />
          </button>
        </div>
        <div ref={bodyRef} className="px-5 pt-4 pb-5">
          {children}
        </div>
        <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
          <Button ref={cancelRef} variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button variant={primaryAction.variant ?? "primary"} onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
