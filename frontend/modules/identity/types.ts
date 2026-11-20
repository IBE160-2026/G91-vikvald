// Types for the identity module, mirroring backend/app/modules/identity/schemas.py.

export type RegisterInput = {
  email: string;
  password: string;
};

export type User = {
  id: string;
  email: string;
};
