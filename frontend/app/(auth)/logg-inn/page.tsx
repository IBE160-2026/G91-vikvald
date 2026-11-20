import type { Metadata } from "next";

import { LoginPage } from "@/modules/identity/pages/login-page";

export const metadata: Metadata = {
  title: "Logg inn – Studiekamerat",
};

export default function Page() {
  return <LoginPage />;
}
