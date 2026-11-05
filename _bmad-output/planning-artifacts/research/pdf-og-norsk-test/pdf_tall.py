"""Rapporterer tall for tekstuttrekk fra en PDF. Skriver ikke ut kildeteksten.

Bruk: python pdf_tall.py <fil.pdf> [<fil.pdf> ...]
"""
import re
import statistics
import sys

import pymupdf

LITE_TEKST = 200
MATTE_FONT = re.compile(r"math|cmmi|cmsy|cmex|symbol|stix|mtextra|euclid", re.I)
LIKNING = re.compile(r"[A-Za-zΔ%)]\s*=\s*[A-Za-z0-9Δ(%−-]")


def side_tall(side):
    tekst = side.get_text()
    fonter = {f[3] for f in side.get_fonts()}
    return {
        "tegn": len(tekst.strip()),
        "bilder": len(side.get_images()),
        "tegninger": len(side.get_drawings()),
        "matte_font": any(MATTE_FONT.search(f) for f in fonter),
        "likninger": len(LIKNING.findall(tekst)),
        "erstatningstegn": tekst.count("�"),
    }


def rapport(sti):
    with pymupdf.open(sti) as pdf:
        sider = [side_tall(s) for s in pdf]
        print(f"\n{sti.rsplit('/', 1)[-1]}: {len(sider)} sider")
        tegn = [s["tegn"] for s in sider]
        print(f"  tegn per side: median {statistics.median(tegn):.0f}, min {min(tegn)}, maks {max(tegn)}")
        lite = [i + 1 for i, s in enumerate(sider) if s["tegn"] < LITE_TEKST]
        print(f"  sider under {LITE_TEKST} tegn: {len(lite)} ({len(lite) / len(sider):.1%})")
        print(f"  sider med bilder: {sum(s['bilder'] > 0 for s in sider)}")
        print(f"  sider med matematikkfont: {sum(s['matte_font'] for s in sider)}")
        print(f"  sider med likning i teksten: {sum(s['likninger'] > 0 for s in sider)}")
        print(f"  erstatningstegn totalt: {sum(s['erstatningstegn'] for s in sider)}")
        topp = sorted(range(len(sider)), key=lambda i: -sider[i]["likninger"])[:12]
        print("  flest likninger:", ", ".join(f"s.{i + 1} ({sider[i]['likninger']})" for i in sorted(topp)))
        kapitler = [(t, n) for lvl, t, n in pdf.get_toc() if lvl == 1]
        print(f"  innholdsfortegnelse: {len(pdf.get_toc())} oppføringer, {len(kapitler)} på øverste nivå")


if __name__ == "__main__":
    for sti in sys.argv[1:]:
        rapport(sti)
