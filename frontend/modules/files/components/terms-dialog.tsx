"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Upload } from "lucide-react";
import { useId, useState } from "react";

import { Dialog } from "@/components/dialog";
import { iconProps } from "@/components/icon";
import { TermsText } from "@/components/terms-text";
import { Checkbox } from "@/components/ui/checkbox";
import { isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { acceptTerms } from "@/modules/identity/api";
import { ME_QUERY_KEY } from "@/modules/identity/components/require-login";

type Props = {
  open: boolean;
  // The names of the files she chose; the intro names the file or the count.
  fileNames: string[];
  // «Avbryt», the close cross and Esc: nothing is sent.
  onCancel: () => void;
  // The terms are stored (and «me» in the cache is updated); upload the files now.
  onAccepted: () => void;
};

function intro(fileNames: string[]): string {
  const chosen = fileNames.length === 1 ? fileNames[0] : `${fileNames.length} filer`;
  return `Du har valgt ${chosen}. Vi viser dette bare før den første opplastingen.`;
}

// The terms dialog (05, FR-11, UX-DR21, UX-DR23): the shared dialog at 640 px,
// «Før du laster opp», a line naming the chosen file (or the number of files),
// the shared terms text, and a checkbox with a visible label. «Godta og last
// opp» is not active until the box is ticked. It sends POST /api/identity/terms
// and puts the answer in the «me» cache, so the dialog is not shown again. If
// the call fails (other than a lost login, which the app's handler takes), the
// dialog stays open with the fallback text and nothing is uploaded.
export function TermsDialog({ open, fileNames, onCancel, onAccepted }: Props) {
  const queryClient = useQueryClient();
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);
  // Reset the tick and the error every time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChecked(false);
      setFailed(false);
    }
  }

  // Through useMutation, so a lost login (401) goes to the app's one handler.
  const accept = useMutation({
    mutationFn: acceptTerms,
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
      onAccepted();
    },
    onError: (error) => {
      if (!isUnauthenticated(error)) setFailed(true);
    },
  });

  return (
    <Dialog
      open={open}
      title="Før du laster opp"
      width={640}
      onClose={onCancel}
      primaryAction={{
        label: "Godta og last opp",
        icon: <Upload {...iconProps} />,
        disabled: !checked || accept.isPending,
        onClick: () => {
          setFailed(false);
          accept.mutate();
        },
      }}
    >
      <p className="text-body-sm text-ink-muted">{intro(fileNames)}</p>
      <div className="-mx-5 my-4 border-t border-divider" />
      <TermsText />
      <div className="mt-5 flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          className="mt-[2px]"
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
        />
        <label htmlFor={checkboxId} className="cursor-pointer text-body text-ink">
          Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke.
        </label>
      </div>
      {failed ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{FALLBACK_MESSAGE}</span>
        </p>
      ) : null}
    </Dialog>
  );
}
