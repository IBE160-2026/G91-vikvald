"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { TopBar } from "@/components/top-bar";
import { isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { markSignedIn } from "@/lib/session";

import { fetchMe } from "../api";
import { AccountLinks } from "./account-links";

export const ME_QUERY_KEY = ["me"] as const;

// The frame around every page inside the app: it asks GET /api/identity/me and
// shows nothing until the answer comes. Logged in: the top bar with the account
// links and the page. 401: nothing here, because the shared 401 handling
// (lib/query-client.ts) sends her to /logg-inn. Any other error: «Noe gikk galt».
export function RequireLogin({ children }: { children: ReactNode }) {
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe });
  const [logoutFailed, setLogoutFailed] = useState(false);
  const user = me.data;

  useEffect(() => {
    if (user) markSignedIn();
  }, [user]);

  if (user) {
    return (
      <>
        <TopBar logoHref="/">
          <AccountLinks
            email={user.email}
            onLogoutStart={() => setLogoutFailed(false)}
            onLogoutError={() => setLogoutFailed(true)}
          />
        </TopBar>
        <main>
          {logoutFailed ? <ErrorAlert /> : null}
          {children}
        </main>
      </>
    );
  }

  if (me.isError && !isUnauthenticated(me.error)) {
    return (
      <>
        <TopBar logoHref="/" />
        <main>
          <ErrorAlert />
        </main>
      </>
    );
  }

  return null;
}

function ErrorAlert() {
  return (
    <p
      role="alert"
      className="mx-home-margin mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger"
    >
      <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
      <span>{FALLBACK_MESSAGE}</span>
    </p>
  );
}
