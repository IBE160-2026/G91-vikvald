"""The one error format for the whole API.

Every error response looks like {"error": {"code": "<SNAKE_CASE>", "details": {...}}}.
The backend never sends user-facing text: the frontend maps each code to a
Norwegian message in frontend/lib/messages.ts. Every code listed here must have
an entry there (a test checks it).
"""

import logging
from enum import StrEnum
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    NOT_FOUND = "NOT_FOUND"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    BAD_REQUEST = "BAD_REQUEST"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    FEATURE_DISABLED = "FEATURE_DISABLED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE"
    EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
    INVALID_EMAIL = "INVALID_EMAIL"
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    PASSWORD_TOO_LONG = "PASSWORD_TOO_LONG"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    NAME_REQUIRED = "NAME_REQUIRED"
    NOT_PDF = "NOT_PDF"
    NO_READABLE_TEXT = "NO_READABLE_TEXT"
    TOO_MANY_PAGES = "TOO_MANY_PAGES"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    PDF_UNREADABLE = "PDF_UNREADABLE"
    TERMS_NOT_ACCEPTED = "TERMS_NOT_ACCEPTED"


# HTTP status for each code.
ERROR_STATUS: dict[ErrorCode, int] = {
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.METHOD_NOT_ALLOWED: 405,
    ErrorCode.BAD_REQUEST: 400,
    ErrorCode.VALIDATION_ERROR: 422,
    ErrorCode.FEATURE_DISABLED: 404,
    ErrorCode.INTERNAL_ERROR: 500,
    ErrorCode.DATABASE_UNAVAILABLE: 503,
    ErrorCode.EMAIL_ALREADY_REGISTERED: 409,
    ErrorCode.INVALID_EMAIL: 422,
    ErrorCode.PASSWORD_TOO_SHORT: 422,
    ErrorCode.PASSWORD_TOO_LONG: 422,
    ErrorCode.INVALID_CREDENTIALS: 401,
    ErrorCode.UNAUTHENTICATED: 401,
    ErrorCode.NAME_REQUIRED: 422,
    ErrorCode.NOT_PDF: 422,
    ErrorCode.NO_READABLE_TEXT: 422,
    ErrorCode.TOO_MANY_PAGES: 422,
    ErrorCode.FILE_TOO_LARGE: 422,
    ErrorCode.PDF_UNREADABLE: 422,
    # Logged in, but a precondition is missing (404 is for other people's data).
    ErrorCode.TERMS_NOT_ACCEPTED: 403,
}


class AppError(Exception):
    """Raise this from a route or service to answer with an error code."""

    def __init__(self, code: ErrorCode, details: dict[str, Any] | None = None) -> None:
        super().__init__(code.value)
        self.code = code
        self.status_code = ERROR_STATUS[code]
        self.details = details or {}


def error_response(
    code: ErrorCode,
    details: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    status_code: int | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code or ERROR_STATUS[code],
        content={"error": {"code": code.value, "details": details or {}}},
        headers=headers,
    )


def _code_for_http_status(status_code: int) -> ErrorCode:
    if status_code == 404:
        return ErrorCode.NOT_FOUND
    if status_code == 405:
        return ErrorCode.METHOD_NOT_ALLOWED
    if status_code >= 500:
        return ErrorCode.INTERNAL_ERROR
    return ErrorCode.BAD_REQUEST


async def _handle_app_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return error_response(exc.code, exc.details)


async def _handle_http_exception(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    # Keep the original status (e.g. 401, 503) and headers (e.g. Allow on 405,
    # WWW-Authenticate on 401); only the body is rewritten to the shared format.
    return error_response(
        _code_for_http_status(exc.status_code), headers=exc.headers, status_code=exc.status_code
    )


async def _handle_validation_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    # Field name = location without its first part ("body", "query", ...), joined with dots.
    fields: dict[str, str] = {}
    for error in exc.errors():
        loc = [str(part) for part in error.get("loc", ())[1:]]
        name = ".".join(loc) if loc else str(error.get("loc", ("request",))[0])
        # Keep the first error per field.
        fields.setdefault(name, str(error.get("type", "invalid")))
    return error_response(ErrorCode.VALIDATION_ERROR, {"fields": fields})


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Logged with stack trace to stdout; the client only gets the code.
    logger.error(
        "Unexpected error on %s %s", request.method, request.url.path, exc_info=exc
    )
    return error_response(ErrorCode.INTERNAL_ERROR)


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)
