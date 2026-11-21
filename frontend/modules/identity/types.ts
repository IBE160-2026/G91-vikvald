// Types for the identity module, mirroring backend/app/modules/identity/schemas.py.

import type { DeleteCount } from "@/lib/delete-text";

export type RegisterInput = {
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type User = {
  id: string;
  email: string;
  // ISO time in UTC; null until she has accepted the terms (FR-11).
  terms_accepted_at: string | null;
};

// GET /api/identity/me/delete-preview (backend AccountDeletePreview).
export type AccountDeletePreview = {
  counts: DeleteCount[];
  content_kinds: string[];
};
