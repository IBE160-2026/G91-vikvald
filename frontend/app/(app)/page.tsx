import type { Metadata } from "next";

import { HomePage } from "@/modules/subjects/pages/home-page";

export const metadata: Metadata = {
  title: "Dine emner – Studiekamerat",
};

export default function Page() {
  return <HomePage />;
}
