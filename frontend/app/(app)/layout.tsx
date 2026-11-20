import type { ReactNode } from "react";

import { RequireLogin } from "@/modules/identity/components/require-login";

// Layout for every page inside the app: only shown to a logged-in student,
// with the full top bar (logo, «Konto», «Logg ut») and one main.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <RequireLogin>{children}</RequireLogin>;
}
