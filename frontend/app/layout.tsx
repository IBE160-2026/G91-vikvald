import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/lib/providers";

// Inter as a variable font, bundled with the app (never fetched from the internet).
import "@fontsource-variable/inter/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studiekamerat",
  description: "Fra forelesningsnotat til eksamen.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
