// Types for the identity module, mirroring backend/app/modules/identity/schemas.py.

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
