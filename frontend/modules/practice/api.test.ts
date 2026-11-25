import { describe, expect, it } from "vitest";

import {
  isSubjectPracticeQueryKey,
  subjectFlashcardsQueryKey,
  subjectFreetextQuestionsQueryKey,
  subjectQuizQuestionsQueryKey,
} from "./api";

describe("isSubjectPracticeQueryKey", () => {
  it("FR-50: dekker emnets kort, quizspørsmål og fritekstspørsmål, så jobbvakta oppdaterer emnesiden", () => {
    expect(isSubjectPracticeQueryKey(subjectFlashcardsQueryKey("s1"))).toBe(true);
    expect(isSubjectPracticeQueryKey(subjectQuizQuestionsQueryKey("s1"))).toBe(true);
    expect(isSubjectPracticeQueryKey(subjectFreetextQuestionsQueryKey("s1"))).toBe(true);
    expect(subjectFreetextQuestionsQueryKey("s1")).toEqual(["subjects", "s1", "freetext-questions"]);
  });

  it("FR-50: andre nøkler er ikke emnets øvingslister", () => {
    expect(isSubjectPracticeQueryKey(["subjects", "s1"])).toBe(false);
    expect(isSubjectPracticeQueryKey(["subjects", "s1", "lectures"])).toBe(false);
    expect(isSubjectPracticeQueryKey(["lectures", "l1", "freetext-questions"])).toBe(false);
    expect(isSubjectPracticeQueryKey(["subjects", "s1", "freetext-questions", "x"])).toBe(false);
  });
});
