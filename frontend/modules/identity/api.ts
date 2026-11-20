import { apiFetch } from "@/lib/api";

import type { RegisterInput, User } from "./types";

// POST /api/identity/register. On success the backend sets the login cookie
// (HttpOnly, so this code never sees it) and answers with the new user.
export function registerUser(input: RegisterInput): Promise<User> {
  return apiFetch<User>("/api/identity/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
