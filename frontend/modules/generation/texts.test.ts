import { describe, expect, it } from "vitest";

import { finishedText, generationTexts, jobOutcome } from "./texts";
import type { Job } from "./types";

function job(changes: Partial<Job> = {}): Job {
  return {
    id: "j1",
    lecture_id: "l1",
    kind: "flashcards",
    params: { requested: 20 },
    status: "done",
    requested: 20,
    created: 20,
    discarded: 0,
    error_code: null,
    started_at: "2026-11-21T10:00:00Z",
    finished_at: "2026-11-21T10:00:03Z",
    ...changes,
  };
}

const FAILED = "Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.";

describe("tekstene for flashcards", () => {
  const texts = generationTexts.flashcards;

  it("FR-18: færre enn valgt har den godkjente ordlyden", () => {
    expect(texts.fewer?.(12, 20)).toBe("Det ble laget 12 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.");
  });

  it("FR-21: feil, tidsgrense og avbrutt gir samme feiltekst, og en ukjent kode også", () => {
    for (const code of ["GENERATION_FAILED", "GENERATION_TIMEOUT", "JOB_INTERRUPTED", "INTERNAL_ERROR", null]) {
      expect(texts.failed(code)).toBe(FAILED);
    }
  });

  it("NFR-17: ferdigmeldingen og «ingenting» har de godkjente ordlydene", () => {
    expect(texts.done(18, "Uke 37: Merkevare")).toBe("Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.");
    expect(texts.nothing).toBe("Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.");
    expect(texts.jobText).toBe("Lager flashcards …");
  });
});

describe("jobOutcome", () => {
  it("FR-21: en feilet jobb gir feilteksten", () => {
    expect(jobOutcome(job({ status: "failed", created: null, error_code: "GENERATION_TIMEOUT" }))).toEqual({
      type: "failed",
      text: FAILED,
    });
  });

  it("FR-18: 0 kort gir «ingenting», færre enn valgt gir «færre», alle gir ingen melding", () => {
    expect(jobOutcome(job({ created: 0 })).type).toBe("nothing");
    expect(jobOutcome(job({ created: 1 }))).toEqual({
      type: "fewer",
      text: "Det ble laget 1 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.",
    });
    expect(jobOutcome(job({ created: 20 })).type).toBe("complete");
    expect(jobOutcome(job({ status: "running", created: null })).type).toBe("running");
  });
});

describe("finishedText", () => {
  it("NFR-17: ferdig, ingenting og feilet", () => {
    expect(finishedText(job({ created: 12 }), "Uke 37: Merkevare")).toBe(
      "Flashcardene er ferdige: 12 kort i Uke 37: Merkevare.",
    );
    expect(finishedText(job({ created: 0 }), "Uke 37: Merkevare")).toBe(
      "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.",
    );
    expect(finishedText(job({ status: "failed", error_code: "JOB_INTERRUPTED" }), "Uke 37")).toBe(FAILED);
  });
});

describe("tekstene for quiz", () => {
  const texts = generationTexts.quiz;

  it("FR-30: jobbtekst, færre, ingenting og ferdig har de godkjente ordlydene", () => {
    expect(texts.jobText).toBe("Lager quizspørsmål …");
    expect(texts.fewer?.(12, 20)).toBe("Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.");
    expect(texts.nothing).toBe("Notatene ga ikke grunnlag for spørsmål. Ingenting er lagret.");
    expect(texts.done(15, "Uke 37: Merkevare")).toBe("Quizspørsmålene er ferdige: 15 spørsmål i Uke 37: Merkevare.");
  });

  it("FR-21: feil, tidsgrense og avbrutt gir samme feiltekst om quizspørsmålene", () => {
    for (const code of ["GENERATION_FAILED", "GENERATION_TIMEOUT", "JOB_INTERRUPTED", null]) {
      expect(texts.failed(code)).toBe("Vi klarte ikke å lage quizspørsmålene. Ingenting er lagret. Prøv igjen.");
    }
  });

  it("UX-DR19: ventetekstene for de andre radene", () => {
    expect(generationTexts.flashcards.waiting).toBe("Venter til flashcardene er ferdige");
    expect(texts.waiting).toBe("Venter til quizspørsmålene er ferdige");
  });

  it("FR-30: jobOutcome og finishedText bruker quiztekstene for en quizjobb", () => {
    const quizJob = job({ kind: "quiz", params: { requested: 20, difficulty: "medium" }, created: 12 });
    expect(jobOutcome(quizJob)).toEqual({
      type: "fewer",
      text: "Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.",
    });
    expect(finishedText({ ...quizJob, created: 0 }, "Uke 37")).toBe(
      "Notatene ga ikke grunnlag for spørsmål. Ingenting er lagret.",
    );
  });
});

describe("tekstene for modellkort", () => {
  const texts = generationTexts.models;

  it("FR-42: jobbteksten og ventetekstene har de godkjente ordlydene", () => {
    expect(texts.jobText).toBe("Lager modellkort …");
    expect(texts.waiting).toBe("Venter til modellkortene er ferdige");
  });

  it("FR-47: ingenting funnet har den godkjente ordlyden og er ingen feil", () => {
    expect(texts.nothing).toBe("Vi fant ingen modeller eller lister i denne forelesningen.");
    const nothing = job({ kind: "models", params: { requested: 30 }, requested: 30, created: 0 });
    expect(jobOutcome(nothing)).toEqual({
      type: "nothing",
      text: "Vi fant ingen modeller eller lister i denne forelesningen.",
    });
    expect(finishedText(nothing, "Uke 37")).toBe("Vi fant ingen modeller eller lister i denne forelesningen.");
  });

  it("FR-21: feil, tidsgrense og avbrutt gir feilteksten om modellkortene", () => {
    for (const code of ["GENERATION_FAILED", "GENERATION_TIMEOUT", "JOB_INTERRUPTED", null]) {
      expect(texts.failed(code)).toBe("Vi klarte ikke å lage modellkortene. Ingenting er lagret. Prøv igjen.");
    }
  });

  it("FR-42: færre enn 30 modellkort gir ingen melding, siden studenten ikke har valgt antall", () => {
    expect(texts.fewer).toBeUndefined();
    const some = job({ kind: "models", params: { requested: 30 }, requested: 30, created: 2 });
    expect(jobOutcome(some)).toEqual({ type: "complete" });
    expect(finishedText(some, "Uke 37")).toBe("Modellkortene er ferdige: 2 modellkort i Uke 37.");
  });
});
