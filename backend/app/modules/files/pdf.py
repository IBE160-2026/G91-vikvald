"""Read the text of a PDF with PyMuPDF (pure function: bytes in, pages out).

The checks run in a fixed order, and the first one that fails decides the error:
not a PDF, cannot be opened, too many pages, no readable text.

Each page also gets needs_image (FR-40, AR-6): whether the page probably has
something the text misses, such as a formula drawn as vector graphics, so the
generation pipeline sends a picture of the page with its text.
"""

from dataclasses import dataclass

import pymupdf

from app.core.errors import AppError, ErrorCode

# The most pages one PDF may have (exactly this many is allowed).
MAX_PAGES = 50
# A PDF must start with this marker somewhere in its first 1024 bytes.
PDF_MARKER = b"%PDF-"
MARKER_WINDOW = 1024

# The rule for needs_image (issue #9). Measured 2026-11-23 on OpenStax
# *Principles of Economics 3e* (995 pages, outside the repo), pages 120-135:
#
# - Every page has five simple frames in its layout, and tables have many
#   simple lines, so "number of drawings" alone tells little.
# - A drawing is *complex* when it has at least COMPLEX_DRAWING_MIN_ITEMS line
#   or curve pieces, or at least one curve. Glyphs drawn as vector graphics
#   (formulas) are complex; underlines, frames and table lines are not.
# - The formula pages 127 and 128 have 263 and 155 complex drawings; ordinary
#   text pages (121, 124, 126) have 0. MIN_COMPLEX_DRAWINGS = 3 also catches a
#   small formula with a few signs.
# - An embedded image covering at least MIN_IMAGE_AREA_SHARE of the page also
#   counts. 0.5 % of an A4 page is about 70 x 35 pt: a small logo stays out,
#   but a small inline formula image may be taken. Better one page too many.
MIN_COMPLEX_DRAWINGS = 3
COMPLEX_DRAWING_MIN_ITEMS = 5
MIN_IMAGE_AREA_SHARE = 0.005
# The resolution of the page image sent to the model. A text page at 150 dpi
# is about 100-400 kB as PNG.
PAGE_IMAGE_DPI = 150
# The longest side of a page image. A page with a huge MediaBox (a 14 400 pt
# poster) would give a picture of several GB at 150 dpi; 2000 px is more than
# an A4 page needs (about 1754 px at 150 dpi), so ordinary pages are not shrunk.
MAX_PAGE_IMAGE_SIDE_PX = 2000


@dataclass(frozen=True)
class PdfPage:
    text: str
    # True when the page should also be sent as an image (FR-40).
    needs_image: bool


def looks_like_pdf(data: bytes) -> bool:
    """True if the bytes start like a PDF. The filename's extension is never used."""
    return PDF_MARKER in data[:MARKER_WINDOW]


def _is_complex_drawing(drawing: dict) -> bool:
    items = drawing.get("items") or []
    return len(items) >= COMPLEX_DRAWING_MIN_ITEMS or any(item[0] == "c" for item in items)


def page_needs_image(page: pymupdf.Page) -> bool:
    """The rule above: at least MIN_COMPLEX_DRAWINGS complex vector drawings, or
    an embedded image covering at least MIN_IMAGE_AREA_SHARE of the page."""
    complex_drawings = 0
    for drawing in page.get_drawings():
        if _is_complex_drawing(drawing):
            complex_drawings += 1
            if complex_drawings >= MIN_COMPLEX_DRAWINGS:
                return True
    page_rect = page.rect
    page_area = page_rect.width * page_rect.height
    if page_area <= 0:
        return False
    for image in page.get_image_info():
        shown = pymupdf.Rect(image["bbox"]) & page_rect
        if not shown.is_empty and shown.width * shown.height >= MIN_IMAGE_AREA_SHARE * page_area:
            return True
    return False


def _needs_image_or_true(page: pymupdf.Page) -> bool:
    """page_needs_image, but a page PyMuPDF cannot inspect counts as needing
    the image (better one too many). Its text was readable, so the upload
    must not fail because of this."""
    try:
        return page_needs_image(page)
    except Exception:
        return True


def read_pages(data: bytes) -> list[PdfPage]:
    """The text of every page with its needs_image, page 1 first, or AppError
    with the reason.

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
        pages = [
            PdfPage(text=text, needs_image=_needs_image_or_true(page))
            for text, page in zip(texts, document, strict=True)
        ]
    if not any("".join(page.text.split()) for page in pages):
        raise AppError(ErrorCode.NO_READABLE_TEXT)
    return pages


def _page_png(page: pymupdf.Page) -> bytes:
    scale = PAGE_IMAGE_DPI / 72
    longest = max(page.rect.width, page.rect.height) * scale
    if longest > MAX_PAGE_IMAGE_SIDE_PX:
        scale *= MAX_PAGE_IMAGE_SIDE_PX / longest
    return page.get_pixmap(matrix=pymupdf.Matrix(scale, scale)).tobytes("png")


def render_pages_png(data: bytes, page_nos: list[int]) -> dict[int, bytes]:
    """PNG pictures (PAGE_IMAGE_DPI, longest side at most MAX_PAGE_IMAGE_SIDE_PX)
    of the pages `page_nos` (from 1) of the PDF, opened once. A page that
    cannot be rendered is left out. Kept in memory only; the caller never
    writes them anywhere. Slow, so callers run it in a thread."""
    images: dict[int, bytes] = {}
    with pymupdf.open(stream=data, filetype="pdf") as document:
        for page_no in page_nos:
            try:
                images[page_no] = _page_png(document[page_no - 1])
            except Exception:  # PyMuPDF raises several kinds of errors.
                continue
    return images
