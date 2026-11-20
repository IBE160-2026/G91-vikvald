import type { Metadata } from "next";

import { NotFoundView } from "@/components/not-found-view";

export const metadata: Metadata = {
  title: "Fant ikke siden – Studiekamerat",
};

// «Fant ikke siden» inside the app (from notFoundOnMissing), under the full top bar.
export default function AppNotFound() {
  return <NotFoundView />;
}
