import Link from "next/link";
import type { ReactNode } from "react";

// top-bar (DESIGN.md "Frame"): the logo on the left, and on the right whatever
// the page puts there (the account links inside the app, nothing on the login
// and register pages). With `logoHref` the logo is a link (to / inside the app).
export function TopBar({ children, logoHref }: { children?: ReactNode; logoHref?: string }) {
  return (
    <header className="flex h-topbar-height items-center justify-between border-b border-divider bg-paper px-4">
      {logoHref ? (
        <Link href={logoHref} className="rounded-sm">
          <Logo />
        </Link>
      ) : (
        <Logo />
      )}
      {children}
    </header>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2 text-item-title text-ink">
      {/* Black stroke with a brand-coloured dot. */}
      <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
        <line x1="1" y1="6" x2="23" y2="6" strokeWidth="2.5" strokeLinecap="round" className="stroke-ink" />
        <circle cx="12" cy="6" r="5" className="fill-brand" />
      </svg>
      Studiekamerat
    </span>
  );
}
