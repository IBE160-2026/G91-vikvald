// Two small flags in sessionStorage, used only to decide whether to show
// «Du er logget ut. Logg inn igjen.» (UX-DR40). sessionStorage belongs to one
// browser tab, so a new tab never shows the message. The flags only ever hold
// "1": never a token, an e-mail or anything else about the student. The login
// itself is decided by GET /api/identity/me alone.
//
// Storage can be missing or throw (private windows, blocked site data), so
// every access is wrapped; without storage the message is simply not shown.

const SIGNED_IN_KEY = "sk_signed_in";
const EXPIRED_KEY = "sk_session_expired";

function read(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Ignored: see the note at the top.
  }
}

function remove(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignored: see the note at the top.
  }
}

// /me answered 200: this tab has been logged in.
export function markSignedIn(): void {
  write(SIGNED_IN_KEY);
}

// She logged out herself: no message next time.
export function clearSignedIn(): void {
  remove(SIGNED_IN_KEY);
}

// The backend answered 401 UNAUTHENTICATED. If this tab was logged in, the login
// has run out (or the cookie is gone): remember that the login page should say so.
// Returns true when the message will be shown.
export function noteSessionLost(): boolean {
  if (!read(SIGNED_IN_KEY)) return false;
  remove(SIGNED_IN_KEY);
  write(EXPIRED_KEY);
  return true;
}

// Read once by the login page: true means «Du er logget ut» should be shown.
export function takeSessionExpired(): boolean {
  const expired = read(EXPIRED_KEY);
  remove(EXPIRED_KEY);
  return expired;
}

type Clearable = { clear: () => void };
type Navigator = { replace: (href: string) => void };

// The one reaction to 401 UNAUTHENTICATED from any query or mutation: note it,
// empty the query cache (nothing from the old login is left) and go to the login page.
export function handleSessionLost(queryClient: Clearable, router: Navigator): void {
  noteSessionLost();
  queryClient.clear();
  router.replace("/logg-inn");
}
