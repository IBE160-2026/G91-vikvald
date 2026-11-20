import type { Metadata } from "next";

import { RegisterPage } from "@/modules/identity/pages/register-page";

export const metadata: Metadata = {
  title: "Opprett konto – Studiekamerat",
};

export default function Page() {
  return <RegisterPage />;
}
