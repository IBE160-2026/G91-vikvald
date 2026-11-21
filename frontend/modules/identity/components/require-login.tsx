"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { MenuButton, SideMenuProvider } from "@/components/side-menu";
import { TopBar } from "@/components/top-bar";
import { isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { markSignedIn } from "@/lib/session";

import { fetchMe } from "../api";
import { AccountLinks } from "./account-links";

export const ME_QUERY_KEY = ["me"] as const;

// The frame around every page inside the app: it asks GET /api/identity/me and
// shows nothing until the answer comes. Logged in: the top bar with the account
// links and the page. 401: nothing, and she is sent to /logg-inn. The shared 401
// handling (lib/query-client.ts) does that too, but only once per lost login, so
// the guard also redirects itself (e.g. after Back to an app page). It never
// touches the flags. Any other error: «Noe gikk galt».
//
// Logged in, the side-menu frame (components/side-menu.tsx) wraps the top bar
// and main: the menu button «Meny» stands left of the logo on a narrow screen,
// and the one shortcut dialog lives there.
export function RequireLogin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe });
  const unauthenticated = me.isError && isUnauthenticated(me.error);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const user = me.data;

  useEffect(() => {
    if (user) markSignedIn();
  }, [user]);

  useEffect(() => {
    if (unauthenticated) router.replace("/logg-inn");
  }, [unauthenticated, router]);

  if (user) {
    return (
      <SideMenuProvider>
        <TopBar logoHref="/" start={<MenuButton />}>
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
      </SideMenuProvider>
    );
  }

  if (me.isError && !unauthenticated) {
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
