import type { ReactNode } from "react";

import { JobWatcher } from "@/modules/generation/components/job-watcher";
import { RequireLogin } from "@/modules/identity/components/require-login";

// Layout for every page inside the app: only shown to a logged-in student,
// with the full top bar (logo, «Konto», «Logg ut») and one main. The job
// watcher follows her generation jobs on every page, and only while she is
// logged in (it lives inside RequireLogin).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireLogin>
      <JobWatcher>{children}</JobWatcher>
    </RequireLogin>
  );
}
