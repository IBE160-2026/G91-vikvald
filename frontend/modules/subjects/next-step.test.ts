import { describe, expect, it } from "vitest";

import type { LectureFileCount, SubjectFileCounts } from "@/modules/files/types";
import type { OverviewLecture } from "@/modules/practice/types";

import { contentCountText, nextStep, subjectContentCounts } from "./next-step";

function lecture(id: string, overrides: Partial<OverviewLecture> = {}): OverviewLecture {
  return { id, name: `Uke ${id.slice(1)}: Tema`, date: "2026-09-11", practiced: false, last_practiced_at: null, ...overrides };
}

function counts(id: string, flashcards: number, quiz = 0, files = 1): LectureFileCount {
  const content_counts = [
    ...(flashcards > 0 ? [{ kind: "flashcards", count: flashcards }] : []),
    ...(quiz > 0 ? [{ kind: "quiz_questions", count: quiz }] : []),
  ];
  return { lecture_id: id, file_count: files, page_count: files * 4, content_counts };
}

function fileCounts(...lectures: LectureFileCount[]): SubjectFileCounts {
  return { file_count: lectures.reduce((total, item) => total + item.file_count, 0), lectures };
}

describe("nextStep (story 5.4)", () => {
  it("FR-58: eldste ikke øvd forelesning med innhold velges, «16 kort, ikke øvd ennå», Øv nå til flashcards", () => {
    const step = nextStep(
      "s",
      [
        lecture("U37", { practiced: true, last_practiced_at: "2026-11-05T10:00:00Z" }),
        lecture("U38"),
        lecture("U39"),
      ],
      fileCounts(counts("U37", 10), counts("U38", 16), counts("U39", 8)),
    );
    expect(step).toEqual({
      kind: "practice",
      lecture: "Uke 38: Tema",
      reason: "16 kort, ikke øvd ennå",
      action: { label: "Øv nå", href: "/forelesninger/U38/flashcards" },
    });
  });

  it("FR-58, SK-20: bare quiz gir «12 quizspørsmål, ikke øvd ennå» og Øv nå til quiz, aldri en tom økt", () => {
    const step = nextStep("s", [lecture("U38")], fileCounts(counts("U38", 0, 12)));
    expect(step.reason).toBe("12 quizspørsmål, ikke øvd ennå");
    expect(step.action.href).toBe("/forelesninger/U38/quiz");
  });

  it("FR-58: med både kort og quiz startes flashcards først", () => {
    const step = nextStep("s", [lecture("U38")], fileCounts(counts("U38", 16, 12)));
    expect(step.reason).toBe("16 kort, ikke øvd ennå");
    expect(step.action.href).toBe("/forelesninger/U38/flashcards");
  });

  it("FR-58: alle øvd gir lengst siden øvd, «16 kort, sist øvd 03.11»", () => {
    const step = nextStep(
      "s",
      [
        lecture("U37", { practiced: true, last_practiced_at: "2026-11-05T10:00:00Z" }),
        lecture("U38", { practiced: true, last_practiced_at: "2026-11-03T10:00:00Z" }),
      ],
      fileCounts(counts("U37", 10), counts("U38", 16)),
    );
    expect(step.kind).toBe("practice");
    expect(step.lecture).toBe("Uke 38: Tema");
    expect(step.reason).toBe("16 kort, sist øvd 03.11");
    expect(step.action.href).toBe("/forelesninger/U38/flashcards");
  });

  it("FR-58: lik siste øvingstid gir den første i rekkefølgen", () => {
    const at = "2026-11-03T10:00:00Z";
    const step = nextStep(
      "s",
      [lecture("U37", { practiced: true, last_practiced_at: at }), lecture("U38", { practiced: true, last_practiced_at: at })],
      fileCounts(counts("U37", 10), counts("U38", 16)),
    );
    expect(step.lecture).toBe("Uke 37: Tema");
  });

  it("SK-20: en øvd forelesning uten innhold velges aldri; den med kort som ikke er øvd velges", () => {
    const step = nextStep(
      "s",
      [lecture("U37", { practiced: true, last_practiced_at: "2026-11-01T10:00:00Z" }), lecture("U38")],
      fileCounts(counts("U37", 0), counts("U38", 16)),
    );
    expect(step.lecture).toBe("Uke 38: Tema");
    expect(step.action.href).toBe("/forelesninger/U38/flashcards");
  });

  it("SK-20: «øvd» kommer bare fra oversikten: en forelesning uten practiced er ikke øvd selv med last_practiced_at", () => {
    const step = nextStep(
      "s",
      [lecture("U37", { practiced: false, last_practiced_at: "2026-11-01T10:00:00Z" })],
      fileCounts(counts("U37", 5)),
    );
    expect(step.reason).toBe("5 kort, ikke øvd ennå");
  });

  it("UX-DR12: neste steg med filer uten innhold: eldste med filer, «2 filer lastet opp, klare til bruk», «Lag flashcards» til 04", () => {
    const step = nextStep("s", [lecture("U44"), lecture("U45")], fileCounts(counts("U45", 0, 0, 2)));
    expect(step).toEqual({
      kind: "setup",
      lecture: "Uke 45: Tema",
      reason: "2 filer lastet opp, klare til bruk",
      action: { label: "Lag flashcards", href: "/forelesninger/U45" },
    });
  });

  it("UX-DR12: neste steg med én fil står i entall", () => {
    const step = nextStep("s", [lecture("U45")], fileCounts(counts("U45", 0, 0, 1)));
    expect(step.reason).toBe("1 fil lastet opp, klar til bruk");
  });

  it("UX-DR12: neste steg uten filer: eldste forelesning, «Ingen filer ennå», «Last opp PDF» til 04", () => {
    const step = nextStep("s", [lecture("U44"), lecture("U45")], fileCounts());
    expect(step).toEqual({
      kind: "setup",
      lecture: "Uke 44: Tema",
      reason: "Ingen filer ennå",
      action: { label: "Last opp PDF", href: "/forelesninger/U44" },
    });
  });

  it("UX-DR12: neste steg uten forelesninger: «Ingen forelesninger ennå», «Ny forelesning» til 03", () => {
    expect(nextStep("s1", [], fileCounts())).toEqual({
      kind: "setup",
      lecture: null,
      reason: "Ingen forelesninger ennå",
      action: { label: "Ny forelesning", href: "/emner/s1" },
    });
  });
});

describe("tellingslinja (story 5.4)", () => {
  it("UX-DR12: summen over forelesningene, «120 kort · 64 quizspørsmål»", () => {
    const total = subjectContentCounts(fileCounts(counts("a", 100, 60), counts("b", 20, 4)));
    expect(total).toEqual({ flashcards: 120, quiz_questions: 64 });
    expect(contentCountText(total)).toBe("120 kort · 64 quizspørsmål");
  });

  it("UX-DR12: en type med 0 utelates, «16 kort» og «12 quizspørsmål»", () => {
    expect(contentCountText({ flashcards: 16, quiz_questions: 0 })).toBe("16 kort");
    expect(contentCountText({ flashcards: 0, quiz_questions: 12 })).toBe("12 quizspørsmål");
  });

  it("UX-DR12: begge 0 gir «Ingen øvingsinnhold ennå»", () => {
    expect(contentCountText(subjectContentCounts(fileCounts(counts("a", 0, 0, 2))))).toBe("Ingen øvingsinnhold ennå");
  });

  it("UX-DR12: andre typer i registeret telles ikke med", () => {
    const other: LectureFileCount = {
      lecture_id: "a",
      file_count: 1,
      page_count: 1,
      content_counts: [{ kind: "summaries", count: 1 }],
    };
    expect(contentCountText(subjectContentCounts(fileCounts(other)))).toBe("Ingen øvingsinnhold ennå");
  });
});
