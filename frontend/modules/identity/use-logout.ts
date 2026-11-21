"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { clearSignedIn } from "@/lib/session";

import { logoutUser } from "./api";

// Logging out (FR-3, UX-DR39), shared by «Logg ut» in the top bar and on the
// account page: POST /api/identity/logout, then the signed-in flag and every
// cached answer are cleared and she is taken to /logg-inn, with no
// confirmation and no message. Only one click at a time: a second click while
// the request runs (or while the page navigates) does nothing. onStart runs
// when a logout starts, onError when it fails (the caller shows the fallback text).
export function useLogout({ onStart, onError }: { onStart?: () => void; onError?: () => void } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      clearSignedIn();
      queryClient.clear();
      router.push("/logg-inn");
    },
    onError: () => {
      pendingRef.current = false;
      onError?.();
    },
  });

  return function logout() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    onStart?.();
    mutation.mutate();
  };
}
