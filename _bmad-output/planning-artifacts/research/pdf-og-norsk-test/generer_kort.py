"""Lager flashcards fra utvalgte PDF-sider med Gemini på EU-endepunktet.

Bruk: python generer_kort.py <fil.pdf> <fra-side> <til-side> <tekst|bilde> <modell> <utfil.json>
Sidetall er PDF-sider. Krever innlogging med `gcloud auth application-default login`.
"""
import base64
import json
import subprocess
import sys
import time
import urllib.request

import pymupdf

PROSJEKT = "project-88f91394-758f-4a20-b62"
ENDEPUNKT = "https://aiplatform.eu.rep.googleapis.com/v1"
INSTRUKS = (
    "Lag 6 flashcards på norsk bokmål fra kildesidene. Bruk bare det som står på sidene, og finn ikke på noe. "
    "Oversett fagbegreper til vanlig norsk fagspråk, og ta med det engelske begrepet i parentes første gang det brukes. "
    "Har stoffet formler, skal minst to kort gjengi en formel nøyaktig, skrevet i ren tekst. "
    "Hvis en formel mangler eller er ufullstendig i kilden, skal du ikke gjette. Før den opp i `mangler`. "
    "Oppgi side for hvert kort."
)
SKJEMA = {
    "type": "OBJECT",
    "required": ["kort", "mangler"],
    "properties": {
        "kort": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "required": ["forside", "bakside", "side"],
                "properties": {
                    "forside": {"type": "STRING"},
                    "bakside": {"type": "STRING"},
                    "side": {"type": "INTEGER"},
                },
            },
        },
        "mangler": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
}


def deler(sti, fra, til, modus):
    resultat = [{"text": INSTRUKS}]
    with pymupdf.open(sti) as pdf:
        for nummer in range(fra, til + 1):
            side = pdf[nummer - 1]
            resultat.append({"text": f"[Side {nummer}]"})
            if modus == "tekst":
                resultat.append({"text": side.get_text()})
            else:
                png = side.get_pixmap(dpi=150).tobytes("png")
                resultat.append({"inlineData": {"mimeType": "image/png", "data": base64.b64encode(png).decode()}})
    return resultat


def kall(modell, innhold):
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"], text=True).strip()
    url = f"{ENDEPUNKT}/projects/{PROSJEKT}/locations/eu/publishers/google/models/{modell}:generateContent"
    kropp = {
        "contents": [{"role": "user", "parts": innhold}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": SKJEMA},
    }
    foresporsel = urllib.request.Request(
        url,
        data=json.dumps(kropp).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(foresporsel, timeout=280) as svar:
        return json.load(svar)


def main(sti, fra, til, modus, modell, utfil):
    start = time.time()
    svar = kall(modell, deler(sti, int(fra), int(til), modus))
    bruk = svar.get("usageMetadata", {})
    innhold = json.loads(svar["candidates"][0]["content"]["parts"][0]["text"])
    gyldige = range(int(fra), int(til) + 1)
    resultat = {
        "modell": svar.get("modelVersion"),
        "modus": modus,
        "sider": [int(fra), int(til)],
        "sekunder": round(time.time() - start, 1),
        "tokens": {k: bruk.get(k) for k in ("promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount")},
        "kort_med_ugyldig_side": sum(k["side"] not in gyldige for k in innhold["kort"]),
        **innhold,
    }
    with open(utfil, "w", encoding="utf-8") as f:
        json.dump(resultat, f, ensure_ascii=False, indent=2)
    print(json.dumps(resultat, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(*sys.argv[1:])
