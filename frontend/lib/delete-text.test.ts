import { describe, expect, it } from "vitest";

import { UNDOABLE, alsoDeletedSentence } from "./delete-text";

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
