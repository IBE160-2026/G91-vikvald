"""Read the text of a PDF with PyMuPDF (pure function: bytes in, pages out).

The checks run in a fixed order, and the first one that fails decides the error:
not a PDF, cannot be opened, too many pages, no readable text.
"""

import pymupdf

from app.core.errors import AppError, ErrorCode

# The most pages one PDF may have (exactly this many is allowed).
MAX_PAGES = 50
# A PDF must start with this marker somewhere in its first 1024 bytes.
PDF_MARKER = b"%PDF-"
MARKER_WINDOW = 1024


def looks_like_pdf(data: bytes) -> bool:
    """True if the bytes start like a PDF. The filename's extension is never used."""
    return PDF_MARKER in data[:MARKER_WINDOW]


def read_pages(data: bytes) -> list[str]:
    """The text of every page, page 1 first, or AppError with the reason.

    Slow for large files, so callers run it in a thread (asyncio.to_thread).
    """
    if not looks_like_pdf(data):
        raise AppError(ErrorCode.NOT_PDF)
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception:  # PyMuPDF raises several kinds of errors for broken files.
        raise AppError(ErrorCode.PDF_UNREADABLE) from None
    with document:
        if document.needs_pass or document.page_count == 0:
            raise AppError(ErrorCode.PDF_UNREADABLE)
        if document.page_count > MAX_PAGES:
            raise AppError(ErrorCode.TOO_MANY_PAGES, {"page_count": document.page_count})
        try:
            # NUL characters cannot be stored in a Postgres text column.
            texts = [page.get_text().replace("\x00", "") for page in document]
        except Exception:
            raise AppError(ErrorCode.PDF_UNREADABLE) from None
    if not any("".join(text.split()) for text in texts):
        raise AppError(ErrorCode.NO_READABLE_TEXT)
    return texts
