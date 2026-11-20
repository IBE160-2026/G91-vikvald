import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { iconProps } from "@/components/icon";

// The one card on the login and register pages (mockup 01): the h1, the subtitle
// «Fra forelesningsnotat til eksamen.», the form, and at the bottom a divider and
// a centred line that links to the other page («Ny her? Opprett konto →»).
export type AuthCardProps = {
  title: string;
  children: ReactNode;
  footer: {
    text: string;
    linkText: string;
    href: string;
  };
};

export function AuthCard({ title, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-auth-card-width rounded-lg border border-border-card bg-surface p-7 shadow-lift">
      <h1 className="text-page-title">{title}</h1>
      <p className="mt-2 text-body-sm text-ink-muted">Fra forelesningsnotat til eksamen.</p>

      {children}

      {/* The divider runs from edge to edge of the card, like in the mockup. */}
      <div className="-mx-7 -mb-7 mt-5 flex flex-wrap items-center justify-center gap-x-2 border-t border-divider px-7 py-5 text-body-sm">
        <span className="text-ink-muted">{footer.text}</span>
        <Link
          href={footer.href}
          className="inline-flex items-center gap-1 rounded-md px-1 font-medium text-brand hover:bg-brand-tint"
        >
          {footer.linkText}
          <ArrowRight {...iconProps} />
        </Link>
      </div>
    </div>
  );
}
