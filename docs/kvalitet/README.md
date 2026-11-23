# Kvaliteten med Gemini (SK-13–SK-17)

Denne mappa viser hvor godt innholdet fra den ekte språkmodellen er: faglige feil (SK-13), riktige kilder (SK-14), quizspørsmålene (SK-15), formlene (SK-16) og om notatene er dekket (SK-17). Den viser også hvilken modell og hvilket tenkenivå som ble brukt, og ventetiden (NFR-17).

**Kontrollen gjøres av Silje, ikke av KI.** Hvert kort og hvert spørsmål vurderes mot læreboka. Tabellene under er tomme til kontrollen er gjort. Arbeidet følges i [#299](https://github.com/IBE160-2026/G91-vikvald/issues/299) (stikkprøven), [#300](https://github.com/IBE160-2026/G91-vikvald/issues/300) (formlene) og [#4](https://github.com/IBE160-2026/G91-vikvald/issues/4) (modellvalget).

Demomodellen er ikke med her. Den lager enkelt, mekanisk innhold som bare viser at appen virker (se README).

## Framgangsmåte

1. **Slå på Gemini.** Følg «Bruk Gemini (Vertex AI)» i [README](../../README.md#bruk-gemini-vertex-ai). Noter modellen (`VERTEX_MODEL`) og tenkenivået (`VERTEX_THINKING`) i tabellen under.
2. **Last opp notatene lokalt.** Lag emnet «Markedsføring» i appen med eksempelnotatene og åpent lisensiert materiale fra OpenStax (*Principles of Marketing*). OpenStax-PDF-ene legges ikke i repoet.
3. **Lag innholdet.** Lag flashcards med «Vanlig» (inntil 20) og quiz for hver forelesning. Ta tiden fra du trykker «Lag flashcards» til kortene er ferdige for minst én forelesning (NFR-17).
4. **Eksporter stikkprøven** med kommandoen under. Skriptet trekker 50 flashcards og 20 quizspørsmål fra emnet, med kilde, og skriver en CSV der vurderingen er tom.
5. **Vurder hver rad mot læreboka** (se «Slik fylles vurderingen ut»). Bruk ikke KI til dette.
6. **Regn ut tallene** med `summary` og før dem i tabellene under.
7. **SK-17:** tell overskriftene i notatene, og hvor mange av dem som har minst ett kort. Før tallene i tabellen.
8. **Legg den utfylte CSV-en her** (for eksempel `docs/kvalitet/stikkprove-markedsforing.csv`). Den skal ikke ha personopplysninger: ingen navn, e-poster eller annet om personer i kommentarene.
9. **Er en grense ikke nådd,** skriv i tabellen hva som ble gjort (for eksempel endrede instrukser eller en annen modell) eller hvorfor ingenting ble gjort, med lenke til [`docs/ki-prosess/korrigeringer.md`](../ki-prosess/korrigeringer.md) eller et GitHub-issue.

## Kommandoene

Appen må kjøre (`docker compose up`). Kommandoene kjøres i `backend/`. Skriptet bruker bare appens eget API, på samme måte som nettleseren: det logger inn, finner emnet på navn og henter kortene og spørsmålene. Det kaller ikke språkmodellen.

```bash
cd backend
SK_PASSWORD='<passordet ditt>' uv run python -m scripts.export_quality_sample export \
  --email <e-posten din> --subject "Markedsføring" --flashcards 50 --quiz 20 \
  --out ../docs/kvalitet/stikkprove-markedsforing.csv
```

Uten `SK_PASSWORD` spør skriptet etter passordet. Er det flere kort enn du ber om, trekkes et tilfeldig utvalg med fast frø (`--seed`, standard 1), så samme kommando gir samme utvalg. Er det færre, tas alt med, og skriptet skriver for eksempel «Fant 15 flashcards, ba om 50». Feil passord eller et emne som ikke finnes, stopper skriptet uten å skrive noen fil.

Når vurderingen er fylt ut:

```bash
cd backend
uv run python -m scripts.export_quality_sample summary ../docs/kvalitet/stikkprove-markedsforing.csv
```

`summary` skriver tallene for SK-13, SK-14 og SK-15, om grensen er nådd, og hvor mange rader som mangler vurdering. En vurdering skriptet ikke kjenner, stopper utregningen med raden det gjelder.

## Slik fylles vurderingen ut

CSV-en har kolonnene `innhold`, `kilde`, `vurdering` og `kommentar`. Den åpnes i Excel eller Numbers.

- **innhold** begynner med «Flashcard:» eller «Quiz:». En quizrad har alternativene A–D, hvilket som er riktig, og «Riktig svar er lengst: ja» eller «nei». Lengden er sammenlignet mekanisk i antall tegn, og likt regnes som ja. «[Formelmerke]» betyr at innholdet har merket «Inneholder formel – sjekk mot kilden».
- **kilde** er fila og siden innholdet viser til, for eksempel «markedsmiksen.pdf, side 2».
- **vurdering** fylles ut med én av disse:

| Vurdering | Betyr |
| --- | --- |
| `riktig` | Faglig riktig, og kilden viser til en side der innholdet står |
| `faglig feil` | Faglig feil. Feil fagbegrep (for eksempel «Promotering» der notatene sier «Påvirkning») er faglig feil. For quiz også: ikke nøyaktig ett faglig riktig alternativ, eller feil alternativ merket som riktig |
| `feil kilde` | Faglig riktig, men innholdet står ikke på siden kilden viser til |
| `faglig feil og feil kilde` | Begge deler |

- Et kort du er usikker på etter å ha slått opp i læreboka, teller som `faglig feil`.
- **kommentar** er valgfri: hva som var feil, eller hvor innholdet egentlig står.

## Resultater

### Modell, tenkenivå og ventetid

Modellen velges ut fra stikkprøven ([#4](https://github.com/IBE160-2026/G91-vikvald/issues/4)) og settes bare i `.env.example`.

| Dato | Modell (`VERTEX_MODEL`) | Tenkenivå (`VERTEX_THINKING`) | Ventetid for 20 flashcards (NFR-17, mål under 2 min) | Forelesning og antall sider |
| --- | --- | --- | --- | --- |
| | | | | |

### Stikkprøven (SK-13, SK-14, SK-15)

CSV-fil: *(lenke når den er lagt inn)*

| Krav | Mål | Resultat | Nådd? | Hva ble gjort hvis ikke |
| --- | --- | --- | --- | --- |
| SK-13 faglige feil i 50 flashcards | under 5 % | | | |
| SK-14 flashcards med riktig kilde | minst 95 % | | | |
| SK-15 quizspørsmål med nøyaktig ett riktig alternativ | alle 20 | | | |
| SK-15 riktig svar er det lengste | høyst 35 % | | | |

### SK-16: formler

Kort laget fra PDF-side 127–128 i *Principles of Economics 3e* (OpenStax, legges ikke i repoet). Henger sammen med [#300](https://github.com/IBE160-2026/G91-vikvald/issues/300) og story 6.3.

| Dato | Side | Antall kort | Formlene riktige? | Formelmerket vises? | Kommentar |
| --- | --- | --- | --- | --- | --- |
| | 127 | | | | |
| | 128 | | | | |

### SK-17: overskriftene i notatene

| Dato | Overskrifter i notatene | Med minst ett kort | Andel (mål minst 80 %) | Nådd? | Hva ble gjort hvis ikke |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
