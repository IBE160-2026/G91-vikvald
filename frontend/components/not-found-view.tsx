import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { iconProps } from "./icon";

// «Fant ikke siden» (UX-DR21): used both for unknown addresses and for things
// that do not exist (or belong to someone else) inside the app.
export function NotFoundView() {
  return (
    <div className="px-home-margin pt-7 pb-7">
      <h1 className="text-page-title">Fant ikke siden</h1>
      <p className="mt-4">
        <Link
          href="/"
          className="-mx-2 inline-flex h-button-height items-center gap-2 rounded-md px-2 text-label text-brand hover:bg-brand-tint"
        >
          Gå til forsiden
          <ArrowRight {...iconProps} />
        </Link>
      </p>
    </div>
  );
}
