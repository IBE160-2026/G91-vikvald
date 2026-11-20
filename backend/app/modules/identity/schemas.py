"""Request and response bodies for the identity routes."""

import uuid

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    # Plain strings: the service checks them in a fixed order and answers with
    # INVALID_EMAIL, PASSWORD_TOO_SHORT or PASSWORD_TOO_LONG.
    email: str
    password: str


class LoginRequest(BaseModel):
    # Plain strings: any wrong or odd value gives the same INVALID_CREDENTIALS.
    email: str
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
