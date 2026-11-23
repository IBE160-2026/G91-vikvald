"""Small test PDFs for the formula rule (FR-40), made in memory with PyMuPDF.
The text is written for the tests (no real notes, no OpenStax PDF).

- build_formula_pdf(): page 1 has a formula drawn as vector curves (no text
  for it) and two definition sentences; page 2 has only text and an underline.
- build_image_pdf(share): one text page with an embedded image covering
  `share` of the page.
"""

import pymupdf

PAGE_1_TEXT = (
    "Elastisitet er hvor mye etterspurt mengde endres når prisen endres. "
    "Etterspørsel er mengden kundene vil kjøpe til en gitt pris."
)
PAGE_2_TEXT = (
    "Tilbud er mengden produsentene vil selge til en gitt pris. "
    "Likevekt er punktet der tilbud og etterspørsel er like."
)
# How many signs of the drawn formula; each is one curve (a complex drawing).
FORMULA_SIGNS = 6


def _text(page: pymupdf.Page, text: str) -> None:
    page.insert_textbox(pymupdf.Rect(72, 72, 520, 300), text, fontsize=12)


def build_formula_pdf() -> bytes:
    document = pymupdf.open()
    first = document.new_page()
    _text(first, PAGE_1_TEXT)
    # The "formula": curves only, so its signs are not in the page text.
    for sign in range(FORMULA_SIGNS):
        x = 100 + sign * 30
        first.draw_bezier((x, 340), (x + 10, 320), (x + 20, 360), (x + 25, 340))
    second = document.new_page()
    _text(second, PAGE_2_TEXT)
    # A simple line (an underline) does not count.
    second.draw_line((72, 320), (300, 320))
    data = document.tobytes(garbage=4, deflate=True, no_new_id=True)
    document.close()
    return data


def build_image_pdf(share: float) -> bytes:
    """One page with text and a grey image covering about `share` of the page."""
    document = pymupdf.open()
    page = document.new_page()
    _text(page, PAGE_2_TEXT)
    side = (share * page.rect.width * page.rect.height) ** 0.5
    pixmap = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 8, 8), False)
    pixmap.clear_with(160)
    page.insert_image(pymupdf.Rect(72, 400, 72 + side, 400 + side), pixmap=pixmap)
    data = document.tobytes(garbage=4, deflate=True, no_new_id=True)
    document.close()
    return data
