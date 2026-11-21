"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";

import { iconProps } from "@/components/icon";

import { useLogout } from "../use-logout";

// The right side of the top bar inside the app (mockup 02): the initial circle and
// «Konto» as one link, a short hairline, and «Logg ut» with the exit icon.
// Logging out (useLogout) has no confirmation and no message.
export function AccountLinks({
  email,
  onLogoutStart,
  onLogoutError,
}: {
  email: string;
  onLogoutStart?: () => void;
  onLogoutError?: () => void;
}) {
  const handleLogout = useLogout({ onStart: onLogoutStart, onError: onLogoutError });

  return (
    // px-1 gives the focus ring room around the text; the smaller gap and -mr-1
    // keep the positions from mockup 02.
    <div className="-mr-1 flex items-center gap-3">
      <Link href="/konto" className="flex items-center gap-2 rounded-md px-1 text-meta-strong text-ink">
        <span
          aria-hidden="true"
          className="flex size-4 items-center justify-center rounded-full bg-brand-tint text-kbd font-semibold text-brand"
        >
          {initialOf(email)}
        </span>
        Konto
      </Link>
      <span aria-hidden="true" className="h-[20px] w-px bg-divider" />
      <button
        type="button"
        onClick={handleLogout}
        className="flex cursor-pointer items-center gap-2 rounded-md px-1 text-meta-strong text-ink-muted"
      >
        <LogOut {...iconProps} />
        Logg ut
      </button>
    </div>
  );
}

// The first character of the e-mail address, as a capital letter. Array.from
// splits by code point, so a character outside the BMP is not cut in half.
export function initialOf(email: string): string {
  return (Array.from(email)[0] ?? "").toLocaleUpperCase("nb");
}
