import type { ReactNode } from "react";

import { SemesterLine } from "@/components/semester-line";
import { TopBar } from "@/components/top-bar";

// Layout for the pages you see before logging in (/registrer now, /logg-inn in
// story 1.5): the top bar with only the logo, the card, and under it the grey
// semester line and one sentence about the app (mockup 01).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="flex flex-col items-center px-4 pt-8 pb-7">
        {children}
        <div className="mt-9 flex w-full flex-col items-center gap-4">
          <SemesterLine />
          <p className="text-center text-meta text-ink-muted">
            Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt.
          </p>
        </div>
      </main>
    </>
  );
}
