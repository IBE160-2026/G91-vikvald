import type { Metadata } from "next";

import { AccountPage } from "@/modules/identity/pages/account-page";

export const metadata: Metadata = {
  title: "Konto – Studiekamerat",
};

export default function Page() {
  return <AccountPage />;
}
