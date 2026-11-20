"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { makeQueryClient } from "./query-client";
import { handleSessionLost } from "./session";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  // The client is made once, so it reads the router through a ref.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // One QueryClient per browser session (useState keeps it across re-renders).
  const [queryClient] = useState(() => {
    const client = makeQueryClient(() => handleSessionLost(client, routerRef.current));
    return client;
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
