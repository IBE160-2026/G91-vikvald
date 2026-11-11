# Hybrid D: Semesterlinjen i Bs form

**Personlighet:** Oversiktlig og premium. Den rolige formen fra hybrid B, med fargene og den kraftige skriften fra Semesterlinjen.

## Hva er hentet hvorfra

- **Fra hybrid B (utformingen):** lys sidemeny med emnetre, der forelesningene står som stasjoner på en loddrett linje fram til «I dag» og «Eksamen». Luft mellom seksjonene. Fokusmodus under øving: menyen forsvinner, og bare en tynn fremdriftslinje, en teller og «Avslutt økt» står igjen.
- **Fra Semesterlinjen (08) (farger og skrift):** lyst papir, blekk og én farge per emnelinje. Helvetica-aktig grotesk med tunge titler (vekt 800).
- **Fra Tastaturet først (09):** sidemenyen på hver side utenom øving.

Forkastet fra B: Gill Sans-aktig skrift med tynne titler, og havre-, furu- og lyngfargene.

## Palett

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F6F5F1` | Bakgrunn (lyst papir) | |
| `#FFFFFF` | Flater og kort | |
| `#EFEDE7` | Sidemeny | |
| `#D6D3CB` | Hårlinjer (bare pynt) | |
| `#161B26` | Blekk: tekst og primærknapper | 15,8:1 på papir |
| `#4B5262` | Sekundærtekst | 7,2:1 på papir, 6,7:1 i menyen |
| `#FBEDE5` | Valgt rad i menyen | blekk 15,1:1 |
| `#B83E0C` | Linjen for Markedsføring og aksent | 5,2:1 på papir |
| `#0B6585` | Linjen for Samfunnsøkonomi | 6,5:1 |
| `#2D6A3B` | Linjen for Organisasjon og ledelse | 6,5:1 |
| `#1D7037` / `#E6F2E9` | Riktig og kunne | 5,3:1 |
| `#B42318` / `#FBE8E6` | Feil og sletting | 5,6:1 |
| `#1F56D6` | Fokusring, 3 px med luft | 5,7:1 |

## Typografi

`'Helvetica Neue', Arial, sans-serif`. Sidetitler 40–48 px i vekt 800, seksjonstitler 22–24 px i vekt 800, brødtekst 16–17 px, og små overtitler i store bokstaver med sperring.

## Universell utforming

- All tekst har minst 4,5:1 i kontrast, se tabellen.
- Øvd og ikke øvd vises som fylt og hul stasjon, og står i tillegg som tekst i tabellen.
- Riktig og feil vises med symbol og tekst (✓ Riktig svar, ✗ Ditt svar).
- Fokusringen er blå og skiller seg fra emnefargene.
- Hurtigtastene står som tekst under øving.

## Styrker og svakheter

- **Styrker:** Linjen til eksamen vises både på oversiktene og i menyen. Under øving er det ingen forstyrrelser. Formen er enkel å bygge med vanlig HTML og CSS.
- **Svakheter:** Lange navn på forelesninger og emner må forkortes i menyen («Org. og ledelse»). Det må løses i ekte kode, for eksempel med tekstbryting eller full tittel ved hover og fokus. Menyen blir lang i emner med mange forelesninger.
