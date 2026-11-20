import type { Metadata } from "next";

import { NotFoundView } from "@/components/not-found-view";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = {
  title: "Fant ikke siden – Studiekamerat",
};

// Unknown addresses (HTTP 404). The top bar has only the logo, because this page
// does not know whether she is logged in.
export default function NotFound() {
  return (
    <>
      <TopBar />
      <main>
        <NotFoundView />
      </main>
    </>
  );
}
