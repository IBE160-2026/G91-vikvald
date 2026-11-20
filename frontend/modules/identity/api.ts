import { apiFetch } from "@/lib/api";

import type { LoginInput, RegisterInput, User } from "./types";

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
