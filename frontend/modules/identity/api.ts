import { apiFetch } from "@/lib/api";

import type { AccountDeletePreview, LoginInput, RegisterInput, User } from "./types";

// POST /api/identity/register. On success the backend sets the login cookie
// (HttpOnly, so this code never sees it) and answers with the new user.
export function registerUser(input: RegisterInput): Promise<User> {
  return apiFetch<User>("/api/identity/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// POST /api/identity/login. On success the backend sets the same login cookie
// as after registration. Wrong e-mail or password gives 401 INVALID_CREDENTIALS.
export function loginUser(input: LoginInput): Promise<User> {
  return apiFetch<User>("/api/identity/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// GET /api/identity/me: the logged-in student, or 401 UNAUTHENTICATED. This is the
// only way the frontend finds out whether she is logged in (it never reads the cookie).
export function fetchMe(): Promise<User> {
  return apiFetch<User>("/api/identity/me");
}

// POST /api/identity/logout: 204, and the backend removes the login cookie.
export function logoutUser(): Promise<void> {
  return apiFetch<void>("/api/identity/logout", { method: "POST" });
}

// POST /api/identity/terms: she accepts the terms. No body; answers with the
// user. Idempotent: a second call keeps the first time of acceptance.
export function acceptTerms(): Promise<User> {
  return apiFetch<User>("/api/identity/terms", { method: "POST" });
}

// GET /api/identity/me/delete-preview: what goes with the account (FR-5).
// counts: subjects, lectures, files, then the content counts, without zeros.
// content_kinds: every registered content type, also those with nothing yet.
export function fetchAccountDeletePreview(): Promise<AccountDeletePreview> {
  return apiFetch<AccountDeletePreview>("/api/identity/me/delete-preview");
}

// DELETE /api/identity/me: 204, the account and everything in it is gone, and
// the backend removes the login cookie.
export function deleteAccount(): Promise<void> {
  return apiFetch<void>("/api/identity/me", { method: "DELETE" });
}
