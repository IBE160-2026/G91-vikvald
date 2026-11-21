"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { ApiError, isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE, messageWithDetails } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { fetchMe } from "@/modules/identity/api";
import { ME_QUERY_KEY } from "@/modules/identity/components/require-login";

import { uploadFile } from "../api";
import { TermsDialog } from "./terms-dialog";

type Props = {
  lectureId: string;
  // The lecture's subject, so its counts on the subject page are refreshed too.
  subjectId: string;
};

type Rejection = { key: number; text: string };

// «<filename>: <message>» for a rejected file (also used when a replacement is rejected).
export function rejectionText(file: File, error: unknown): string {
  const message =
    error instanceof ApiError ? messageWithDetails(error.code, error.details) : FALLBACK_MESSAGE;
  return `${file.name}: ${message}`;
}

// upload-zone (DESIGN.md "Forelesning", mockup 04): a dashed border-control box
// with the upload icon, «Dra og slipp PDF-filer hit», «Bare PDF. Hver fil får sin
// egen kilde med sidetall.» and the outline button «Velg PDF», which opens a
// hidden file input (so it works with the keyboard alone).
//
// Both drag and drop and «Velg PDF» take several files; they are sent one by
// one, each in its own call. While that happens, «Laster opp …» stands in a
// live region and «Velg PDF» is not active. Each rejected file gets its own
// line «<filename>: <message>» in a live region by the box. The lines stay until
// the next upload starts or she leaves the page. Accepted files show up in the
// list without a reload (the lecture's and the subject's queries are invalidated).
//
// Before the first upload (FR-11): if «me» has no terms_accepted_at, the chosen
// files wait and the terms dialog (05) opens. «Godta og last opp» stores the
// terms and then uploads the waiting files as above; «Avbryt», the cross and Esc
// drop them without any call.
export function UploadZone({ lectureId, subjectId }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  // Files waiting for the terms; the terms dialog is open while this is set.
  const [pending, setPending] = useState<File[] | null>(null);
  // The same query as the login guard around the page, so it is already loaded.
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe });
  // Through useMutation, so a lost login (401) goes to the app's one handler.
  const upload = useMutation({ mutationFn: (file: File) => uploadFile(lectureId, file) });

  async function uploadAll(files: File[]) {
    if (uploading || files.length === 0) return;
    setRejections([]);
    setUploading(true);
    const rejected: Rejection[] = [];
    try {
      for (const [index, file] of files.entries()) {
        try {
          await upload.mutateAsync(file);
          // ["lectures", id] covers the lecture and its files; ["subjects", id]
          // covers the subject, its lectures and its file counts.
          void queryClient.invalidateQueries({ queryKey: ["lectures", lectureId] });
          void queryClient.invalidateQueries({ queryKey: ["subjects", subjectId] });
        } catch (error) {
          // Logged out: the app's handler takes her to the login page, so the
          // remaining files are not sent and get no lines.
          if (isUnauthenticated(error)) break;
          rejected.push({ key: index, text: rejectionText(file, error) });
          setRejections([...rejected]);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  // Every pick or drop goes through here: straight to upload once the terms are
  // accepted, otherwise via the terms dialog.
  function requestUpload(files: File[]) {
    if (uploading || files.length === 0) return;
    if (me.data?.terms_accepted_at) {
      void uploadAll(files);
    } else {
      setPending(files);
    }
  }

  function acceptedTerms() {
    const files = pending ?? [];
    setPending(null);
    void uploadAll(files);
  }

  function openPicker() {
    if (!uploading) inputRef.current?.click();
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = uploading ? "none" : "copy";
    setDragging(true);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    requestUpload(Array.from(event.dataTransfer.files));
  }

  return (
    <div>
      <div
        data-slot="upload-zone"
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg border border-dashed border-border-control px-4 pt-5 pb-4 text-center",
          dragging && !uploading && "bg-brand-tint",
        )}
      >
        {/* The upload icon in a white circle (48 px), as in mockup 04. */}
        <span className="mb-3 flex size-7 items-center justify-center rounded-full border border-border-card bg-surface text-ink">
          <Upload {...iconProps} size={20} />
        </span>
        <p className="text-item-title text-ink">Dra og slipp PDF-filer hit</p>
        <p className="text-meta text-ink-muted">Bare PDF. Hver fil får sin egen kilde med sidetall.</p>
        <Button
          variant="outline"
          className="mt-3"
          aria-disabled={uploading || undefined}
          onClick={openPicker}
        >
          Velg PDF
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          data-testid="upload-input"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            // Empty the input, so choosing the same file again also counts.
            event.target.value = "";
            requestUpload(files);
          }}
        />
        <p role="status" className="mt-2 text-meta text-ink-muted empty:mt-0">
          {uploading ? "Laster opp …" : ""}
        </p>
      </div>
      <div aria-live="polite" className="flex flex-col gap-2 not-empty:mt-3">
        {rejections.map((rejection) => (
          <p
            key={rejection.key}
            className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger"
          >
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{rejection.text}</span>
          </p>
        ))}
      </div>
      <TermsDialog
        open={pending !== null}
        fileNames={(pending ?? []).map((file) => file.name)}
        onCancel={() => setPending(null)}
        onAccepted={acceptedTerms}
      />
    </div>
  );
}
