"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Info, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Dialog } from "@/components/dialog";
import { iconProps } from "@/components/icon";
import { TermsText } from "@/components/terms-text";
import { Button } from "@/components/ui/button";
import { isUnauthenticated } from "@/lib/api";
import { useAppConfig } from "@/lib/config";
import { UNDOABLE, accountCountsSentence, accountDeletedText } from "@/lib/delete-text";
import { useFocusHeadingOnArrival } from "@/lib/focus-heading";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { clearSignedIn } from "@/lib/session";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn } from "@/lib/utils";
import { SubjectSidebar } from "@/modules/subjects/components/subject-sidebar";

import { deleteAccount, fetchAccountDeletePreview, fetchMe } from "../api";
import { ME_QUERY_KEY } from "../components/require-login";
import { useLogout } from "../use-logout";

export const ACCOUNT_PREVIEW_QUERY_KEY = ["account", "delete-preview"] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// An ISO time in UTC -> the student's local date, "11.09.2026".
export function formatLocalDate(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

// The account page (mockup 15, FR-5, UX-DR39): the sidebar without a selected
// subject or lecture; h1 «Konto», the line under it and, in demo mode, the
// demo badge. Three sections, each an h2 and a white account-card with rows
// like the file card: Innlogging (e-mail, password, «Logg ut»), Vilkår og
// personvern (when the terms were accepted, «Les vilkårene», the language model)
// and Slett kontoen (what goes, how much she has, «Slett kontoen …»).
//
// «Les vilkårene» shows the shared terms text without a checkbox, in a dialog
// with only «Lukk». «Slett kontoen …» opens the shared delete confirmation;
// after the delete she is logged out and taken to the login page with no message.
export function AccountPage() {
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe });
  const preview = useQuery({ queryKey: ACCOUNT_PREVIEW_QUERY_KEY, queryFn: fetchAccountDeletePreview });
  const config = useAppConfig();
  const demo = config.data?.demo_mode === true;
  const [termsOpen, setTermsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const logout = useLogout({ onStart: () => setLogoutFailed(false), onError: () => setLogoutFailed(true) });
  const queryClient = useQueryClient();
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const user = me.data;
  useFocusHeadingOnArrival(headingRef, Boolean(user));
  useDocumentTitle("Konto – Studiekamerat");

  function accountDeleted() {
    // She deleted it herself: no «Du er logget ut» on the login page.
    clearSignedIn();
    queryClient.clear();
    router.push("/logg-inn");
  }

  const countsSentence = preview.data ? accountCountsSentence(preview.data.counts) : null;
  const previewFailed = preview.isError && !isUnauthenticated(preview.error);

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SubjectSidebar />
      <div className="min-w-0 flex-1 pt-7 pr-content-margin-right pb-7 pl-content-inset">
        {user ? (
          <div className="max-w-[760px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 ref={headingRef} tabIndex={-1} className="text-page-title">
                  Konto
                </h1>
                <p className="mt-1 text-body-sm text-ink-muted">Innlogging, vilkår og sletting av kontoen</p>
              </div>
              {demo ? (
                <p
                  data-slot="demo-badge"
                  className="flex items-center gap-2 rounded-full bg-surface-note px-3 py-1 text-caption text-ink-muted"
                >
                  <Info {...iconProps} className="shrink-0" />
                  Demomodus: innholdet lages av en testmodell
                </p>
              ) : null}
            </div>

            <AccountSection id="account-login" title="Innlogging">
              <AccountRow label="E-post">
                <span className="break-all">{user.email}</span>
              </AccountRow>
              <AccountRow label="Passord">Lagret kryptert, aldri i klartekst</AccountRow>
              <div className="flex flex-col items-end gap-3 px-4 py-3">
                {logoutFailed ? <ErrorAlert className="self-stretch" /> : null}
                <Button variant="outline" onClick={logout}>
                  <LogOut {...iconProps} />
                  Logg ut
                </Button>
              </div>
            </AccountSection>

            <AccountSection id="account-terms" title="Vilkår og personvern">
              <AccountRow
                label="Vilkår"
                action={
                  <Button variant="text" onClick={() => setTermsOpen(true)}>
                    Les vilkårene
                  </Button>
                }
              >
                {user.terms_accepted_at
                  ? `Godtatt ${formatLocalDate(user.terms_accepted_at)}, før første opplasting`
                  : "Ikke godtatt ennå. Du får se dem før første opplasting."}
              </AccountRow>
              <AccountRow label="Språkmodell">
                {demo ? "Testmodell i demomodus (ellers Google, i EU)" : "Google, i EU"}
              </AccountRow>
            </AccountSection>

            <AccountSection id="account-delete" title="Slett kontoen">
              <div className="flex flex-wrap items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1 basis-[320px]">
                  <p className="text-body-sm text-ink">
                    {accountDeletedText(preview.data?.content_kinds ?? [])} {UNDOABLE}
                  </p>
                  {countsSentence ? <p className="mt-1 text-meta text-ink-muted">{countsSentence}</p> : null}
                  {previewFailed ? <ErrorAlert className="mt-3" /> : null}
                </div>
                <Button variant="outline" className="shrink-0 text-danger" onClick={() => setDeleteOpen(true)}>
                  <Trash2 {...iconProps} />
                  Slett kontoen …
                </Button>
              </div>
            </AccountSection>

            <Dialog open={termsOpen} title="Vilkår og personvern" width={640} onClose={() => setTermsOpen(false)}>
              <TermsText />
            </Dialog>
            <DeleteConfirmDialog
              open={deleteOpen}
              title="Slette kontoen?"
              confirmLabel="Slett kontoen"
              item={{ name: user.email }}
              note={accountDeletedText(preview.data?.content_kinds ?? [])}
              target="account"
              previewKey={["account"]}
              loadCounts={async () => (await fetchAccountDeletePreview()).counts}
              remove={deleteAccount}
              onClose={() => setDeleteOpen(false)}
              onDeleted={accountDeleted}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AccountSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-6">
      <h2 id={id} className="text-section-title">
        {title}
      </h2>
      <div
        data-slot="account-card"
        className="mt-3 divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift"
      >
        {children}
      </div>
    </section>
  );
}

// A row: the label in muted grey, the value, and at most one action on the right.
function AccountRow({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
      <p className="w-[160px] shrink-0 text-body-sm text-ink-muted">{label}</p>
      <p className="min-w-0 flex-1 basis-[240px] text-body-sm font-medium text-ink">{children}</p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ErrorAlert({ className }: { className?: string }) {
  return (
    <p role="alert" className={cn("flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger", className)}>
      <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
      <span>{FALLBACK_MESSAGE}</span>
    </p>
  );
}
