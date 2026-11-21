"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { ApiError, isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE, messageWithDetails } from "@/lib/messages";
import { cn } from "@/lib/utils";

import { uploadFile } from "../api";

type Props = {
  lectureId: string;
  // The lecture's subject, so its counts on the subject page are refreshed too.
  subjectId: string;
};

type Rejection = { key: number; text: string };

function rejectionText(file: File, error: unknown): string {
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
export function UploadZone({ lectureId, subjectId }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<Rejection[]>([]);
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
    void uploadAll(Array.from(event.dataTransfer.files));
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
          "flex flex-col items-center gap-1 rounded-lg border border-dashed border-border-control px-4 py-6 text-center",
          dragging && !uploading && "bg-brand-tint",
        )}
      >
        <Upload {...iconProps} size={24} className="mb-2 text-ink-muted" />
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
            void uploadAll(files);
          }}
        />
        <p role="status" className="mt-2 min-h-[1.5em] text-meta text-ink-muted">
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
    </div>
  );
}
