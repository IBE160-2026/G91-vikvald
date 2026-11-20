"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { makeQueryClient } from "./query-client";

export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session (useState keeps it across re-renders).
  const [queryClient] = useState(makeQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
