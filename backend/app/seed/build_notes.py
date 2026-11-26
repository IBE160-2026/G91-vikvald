"""Makes the sample notes' PDFs (app/seed/notater/*.pdf) from their source
text (*.md next to them), so the PDF never says anything the source does not.

The source is plain text with two Markdown features: a line starting with "# "
is a heading, and a line of only "---" starts a new page. Every other
non-empty line is a paragraph of its own (bullet lines start with "• "). The
PDF has the same text without the "# " and the "---" lines.

Run from backend/ after changing a note:  uv run python -m app.seed.build_notes
"""

from pathlib import Path

import pymupdf

NOTES_DIR = Path(__file__).resolve().parent / "notater"
HEADING = "# "
# A line of only this starts a new page in the PDF (a summary needs pages, story 9.1).
PAGE_BREAK = "---"
# The first line of every note while the notes are placeholders (issue #13),
# printed in bold.
PLACEHOLDER_MARK = "PLASSHOLDER – skrives av Silje"
# A4 with 72 pt (2.5 cm) margins.
PAGE = pymupdf.paper_rect("a4")
MARGIN = 72
BODY_SIZE = 11
HEADING_SIZE = 15
# Space above a heading and below every paragraph, in points.
HEADING_GAP = 14
PARAGRAPH_GAP = 5


class NoteTooLongError(ValueError):
    """A page of the note does not fit on one PDF page. The notes are meant to be short."""


def note_sources() -> list[Path]:
    """The notes' source files, sorted by name."""
    return sorted(NOTES_DIR.glob("*.md"))


def is_note(path: Path) -> bool:
    # LISENS.md is the licence for the notes, not a note.
    return path.name != "LISENS.md"


def plain_text(source: str) -> str:
    """The text the PDF must contain: the source without the heading marks and
    the page-break lines."""
    return "\n".join(
        line.strip().removeprefix(HEADING) for line in source.splitlines() if line.strip() != PAGE_BREAK
    )


def source_pages(source: str) -> list[list[str]]:
    """The source's non-empty lines, split into pages at the "---" lines. An
    empty page (e.g. two breaks in a row) is left out."""
    pages: list[list[str]] = [[]]
    for line in source.splitlines():
        line = line.strip()
        if line == PAGE_BREAK:
            pages.append([])
        elif line:
            pages[-1].append(line)
    return [page for page in pages if page]


def build_pdf(source: str) -> bytes:
    """The PDF (A4, one page per "---" part) for one note's source text. The
    same text always gives the same bytes.

    Written with PyMuPDF's TextWriter and the built-in Helvetica, which has
    «•», «–» and «æøå» and, unlike HTML layout, never joins letters such as
    «fi» into one ligature sign, so the text read back is the source text."""
    regular, bold = pymupdf.Font("helv"), pymupdf.Font("hebo")
    document = pymupdf.open()
    for lines in source_pages(source):
        _write_page(document, lines, regular, bold)
    # No dates or tool names, so a rebuild without changes gives the same file.
    document.subset_fonts()
    document.set_metadata({})
    data = document.tobytes(garbage=4, deflate=True, no_new_id=True)
    document.close()
    return data


def _write_page(document: pymupdf.Document, lines: list[str], regular: pymupdf.Font, bold: pymupdf.Font) -> None:
    page = document.new_page(width=PAGE.width, height=PAGE.height)
    writer = pymupdf.TextWriter(page.rect)
    top = MARGIN
    for line in lines:
        heading = line.startswith(HEADING)
        if heading and top > MARGIN:
            top += HEADING_GAP
        box = pymupdf.Rect(MARGIN, top, PAGE.width - MARGIN, PAGE.height - MARGIN)
        left_over = writer.fill_textbox(
            box,
            line.removeprefix(HEADING),
            font=bold if heading or line == PLACEHOLDER_MARK else regular,
            fontsize=HEADING_SIZE if heading else BODY_SIZE,
        )
        if left_over:
            raise NoteTooLongError("A page of the note does not fit on one PDF page")
        # last_point is the baseline of the last line written; leave room for descenders.
        top = writer.last_point.y + PARAGRAPH_GAP
    writer.write_text(page)


def build_all() -> list[Path]:
    """Write <name>.pdf next to every note's <name>.md. Returns the PDFs written."""
    written: list[Path] = []
    for source in filter(is_note, note_sources()):
        target = source.with_suffix(".pdf")
        target.write_bytes(build_pdf(source.read_text(encoding="utf-8")))
        written.append(target)
    return written


if __name__ == "__main__":
    for path in build_all():
        print(f"Wrote {path.relative_to(NOTES_DIR.parent.parent.parent)}")
