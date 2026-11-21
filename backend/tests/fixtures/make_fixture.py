"""Makes tests/fixtures/definisjoner.pdf, the fixed test file for the mock
model (NFR-2a). The text is written for the tests (no real notes): page 1 in
Norwegian, page 2 in English, with definition sentences and sentences that
are not definitions.

Run from backend/:  uv run python -m tests.fixtures.make_fixture
"""

from pathlib import Path

import pymupdf

FIXTURE = Path(__file__).resolve().parent / "definisjoner.pdf"

PAGES = [
    (
        "Merkevare er et navn, et symbol eller en design som skiller et produkt fra andre. "
        "Markedsføring handler om å skape verdi for kunden. "
        "Segmentering er å dele markedet i grupper med like behov. "
        "Den viktigste oppgaven for en markedsfører i dag er å lytte til kunden. "
        "Posisjonering er plassen produktet har i kundens bevissthet."
    ),
    (
        "A brand is a promise to the customer. "
        "Pricing decides how much the customer pays! "
        "The marketing mix is the set of tools a firm uses to reach its market."
    ),
]


def build() -> bytes:
    document = pymupdf.open()
    for text in PAGES:
        page = document.new_page()
        # A narrow box, so each sentence is broken over several lines.
        page.insert_textbox(pymupdf.Rect(72, 72, 360, 770), text, fontsize=12)
    data = document.tobytes(garbage=4, deflate=True, no_new_id=True)
    document.close()
    return data


if __name__ == "__main__":
    FIXTURE.write_bytes(build())
    print(f"Wrote {FIXTURE}")
