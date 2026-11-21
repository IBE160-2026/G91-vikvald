"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ApiError, isUnauthenticated } from "@/lib/api";
import { UNDOABLE, alsoDeletedSentence, type DeleteCount, type DeleteTarget } from "@/lib/delete-text";
import { FALLBACK_MESSAGE } from "@/lib/messages";

import { Dialog } from "./dialog";
import { iconProps } from "./icon";

type Props = {
  open: boolean;
  // «Slette fila?», «Slette forelesningen?», «Slette emnet?».
  title: string;
  // The danger button: «Slett fila», «Slett forelesningen», «Slett emnet».
  confirmLabel: string;
  // The box naming what is deleted.
  item: { name: string; detail?: string; icon?: ReactNode };
  target: DeleteTarget;
  // Identifies the preview in the cache: ["delete-preview", ...previewKey].
  previewKey: readonly unknown[];
  loadCounts: () => Promise<DeleteCount[]>;
  remove: () => Promise<void>;
  // «Avbryt», the close cross and Esc (and after a successful delete).
  onClose: () => void;
  // Called after a successful delete, before onClose.
  onDeleted: () => void;
  // Where focus goes after a successful delete, when the opener is gone (#75).
  focusAfterDelete?: () => HTMLElement | null;
};

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NOT_FOUND";
}

// The shared delete confirmation (mockup 14, UX-DR21, UX-DR22, FR-12): the
// shared dialog at 560 px with a box naming the item, the sentence «Dette
// sletter også …» (left out when nothing else goes), and «Det kan ikke
// angres.». «Avbryt» has focus first. The danger button is not active until
// the counts are loaded, so she always sees what disappears. The counts are
// fetched fresh every time the dialog opens.
//
// A failed preview or delete (other than a lost login, which the app's handler
// takes) shows the fallback text, and nothing is deleted. A 404 on DELETE
// means it is already gone (e.g. deleted in another tab), so it counts as
// deleted. While the delete runs, both buttons are off, and «Avbryt», the
// cross and Esc do nothing.
export function DeleteConfirmDialog({
  open,
  title,
  confirmLabel,
  item,
  target,
  previewKey,
  loadCounts,
  remove,
  onClose,
  onDeleted,
  focusAfterDelete,
}: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["delete-preview", ...previewKey];
  const preview = useQuery({ queryKey, queryFn: loadCounts, enabled: open, staleTime: 0 });
  const [failed, setFailed] = useState(false);
  // Read when the dialog has closed, to choose where focus goes.
  const deletedRef = useRef(false);
  const keyText = JSON.stringify(queryKey);

  // Reset when the dialog opens; forget the counts when it closes, so the next
  // opening always fetches fresh ones.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFailed(false);
  }
  useEffect(() => {
    if (open) {
      deletedRef.current = false;
      return;
    }
    queryClient.removeQueries({ queryKey: JSON.parse(keyText) as unknown[], exact: true });
  }, [open, keyText, queryClient]);

  function finish() {
    deletedRef.current = true;
    onDeleted();
    onClose();
  }

  // Through useMutation, so a lost login (401) goes to the app's one handler.
  const deletion = useMutation({
    mutationFn: remove,
    onSuccess: finish,
    onError: (error) => {
      if (isNotFound(error)) finish();
      else if (!isUnauthenticated(error)) setFailed(true);
    },
  });

  // A 404 on the preview means it is already gone (deleted in another tab):
  // the same as a 404 on DELETE, so it counts as deleted (once).
  const previewGone = open && isNotFound(preview.error);
  useEffect(() => {
    if (previewGone && !deletedRef.current) finish();
  });

  const counts = preview.data;
  const sentence = counts ? alsoDeletedSentence(counts, target) : null;
  const previewFailed = preview.isError && !isUnauthenticated(preview.error) && !isNotFound(preview.error);
  const busy = deletion.isPending;

  return (
    <Dialog
      open={open}
      title={title}
      width={560}
      onClose={busy ? () => {} : onClose}
      cancelDisabled={busy}
      returnFocus={() => (deletedRef.current ? (focusAfterDelete?.() ?? null) : null)}
      primaryAction={{
        label: confirmLabel,
        variant: "danger",
        icon: <Trash2 {...iconProps} />,
        disabled: !preview.isSuccess || busy,
        onClick: () => {
          setFailed(false);
          deletion.mutate();
        },
      }}
    >
      <div className="flex items-center gap-3 rounded-option border border-border-card bg-paper p-3">
        {item.icon ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand">
            {item.icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-label break-words text-ink">{item.name}</p>
          {item.detail ? <p className="text-meta text-ink-muted">{item.detail}</p> : null}
        </div>
      </div>
      {counts ? (
        <div className="mt-4 flex flex-col gap-2 text-body text-ink">
          {sentence ? <p>{sentence}</p> : null}
          <p className="font-semibold">{UNDOABLE}</p>
        </div>
      ) : null}
      {previewFailed || failed ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{FALLBACK_MESSAGE}</span>
        </p>
      ) : null}
    </Dialog>
  );
}
