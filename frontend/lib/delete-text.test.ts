import { describe, expect, it } from "vitest";

import { UNDOABLE, accountCountsSentence, accountDeletedText, alsoDeletedSentence } from "./delete-text";

describe("alsoDeletedSentence", () => {
  it("UX-DR22: flere typer får komma og «og» før den siste", () => {
    expect(
      alsoDeletedSentence(
        [
          { kind: "lectures", count: 8 },
          { kind: "files", count: 11 },
        ],
        "subject",
      ),
    ).toBe("Dette sletter også 8 forelesninger og 11 filer.");
  });

  it("UX-DR22: for en fil står «laget fra fila» til slutt", () => {
    expect(
      alsoDeletedSentence(
        [
          { kind: "flashcards", count: 18 },
          { kind: "quiz_questions", count: 11 },
          { kind: "model_cards", count: 2 },
        ],
        "file",
      ),
    ).toBe("Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila.");
  });

  it("UX-DR22: entall for 1", () => {
    expect(
      alsoDeletedSentence(
        [
          { kind: "lectures", count: 1 },
          { kind: "files", count: 1 },
        ],
        "subject",
      ),
    ).toBe("Dette sletter også 1 forelesning og 1 fil.");
    expect(alsoDeletedSentence([{ kind: "flashcards", count: 1 }], "file")).toBe(
      "Dette sletter også 1 flashcard laget fra fila.",
    );
  });

  it("UX-DR22: én type alene, i rekkefølgen den kommer", () => {
    expect(alsoDeletedSentence([{ kind: "files", count: 2 }], "lecture")).toBe("Dette sletter også 2 filer.");
    expect(
      alsoDeletedSentence(
        [
          { kind: "files", count: 3 },
          { kind: "lectures", count: 2 },
        ],
        "subject",
      ),
    ).toBe("Dette sletter også 3 filer og 2 forelesninger.");
  });

  it("E16: ingenting, bare 0 eller bare ukjente typer gir null (aldri «0 …»)", () => {
    expect(alsoDeletedSentence([], "subject")).toBeNull();
    expect(alsoDeletedSentence([{ kind: "files", count: 0 }], "lecture")).toBeNull();
    expect(alsoDeletedSentence([{ kind: "ukjent", count: 4 }], "file")).toBeNull();
    expect(alsoDeletedSentence([{ kind: "toString", count: 4 }], "file")).toBeNull();
  });

  it("E16: 0 og ukjente typer utelates når andre står igjen", () => {
    expect(
      alsoDeletedSentence(
        [
          { kind: "lectures", count: 0 },
          { kind: "ukjent", count: 5 },
          { kind: "files", count: 2 },
        ],
        "subject",
      ),
    ).toBe("Dette sletter også 2 filer.");
  });

  it("UX-DR22: «Det kan ikke angres.»", () => {
    expect(UNDOABLE).toBe("Det kan ikke angres.");
  });
});

describe("accountCountsSentence", () => {
  it("FR-5: «Du har nå 3 emner, 15 forelesninger og 18 filer.»", () => {
    expect(
      accountCountsSentence([
        { kind: "subjects", count: 3 },
        { kind: "lectures", count: 15 },
        { kind: "files", count: 18 },
      ]),
    ).toBe("Du har nå 3 emner, 15 forelesninger og 18 filer.");
  });

  it("FR-5: entall for 1, og alltid emner, forelesninger, filer i den rekkefølgen", () => {
    expect(
      accountCountsSentence([
        { kind: "files", count: 1 },
        { kind: "subjects", count: 1 },
        { kind: "lectures", count: 1 },
      ]),
    ).toBe("Du har nå 1 emne, 1 forelesning og 1 fil.");
    expect(
      accountCountsSentence([
        { kind: "subjects", count: 2 },
        { kind: "lectures", count: 1 },
      ]),
    ).toBe("Du har nå 2 emner og 1 forelesning.");
  });

  it("E16: innholdstyper telles ikke med, og alt 0 gir null (aldri «0 …»)", () => {
    expect(
      accountCountsSentence([
        { kind: "subjects", count: 1 },
        { kind: "flashcards", count: 24 },
      ]),
    ).toBe("Du har nå 1 emne.");
    expect(accountCountsSentence([])).toBeNull();
    expect(accountCountsSentence([{ kind: "subjects", count: 0 }])).toBeNull();
    expect(accountCountsSentence([{ kind: "flashcards", count: 5 }])).toBeNull();
  });
});

describe("accountDeletedText", () => {
  it("FR-5: uten registrerte typer", () => {
    expect(accountDeletedText([])).toBe("Alle emner, filer og alt generert innhold slettes for godt.");
  });

  it("FR-5: kjente typer med flertallsnavn etter kolon, ukjente hoppes over", () => {
    expect(accountDeletedText(["flashcards", "quiz_questions"])).toBe(
      "Alle emner, filer og alt generert innhold slettes for godt: flashcards og quizspørsmål.",
    );
    expect(accountDeletedText(["flashcards", "ukjent", "model_cards", "quiz_questions"])).toBe(
      "Alle emner, filer og alt generert innhold slettes for godt: flashcards, modellkort og quizspørsmål.",
    );
    expect(accountDeletedText(["ukjent", "toString"])).toBe(
      "Alle emner, filer og alt generert innhold slettes for godt.",
    );
  });
});
